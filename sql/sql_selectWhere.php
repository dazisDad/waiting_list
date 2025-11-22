<?php
/**
 * SQL SELECT WHERE Handler
 * Version: 1.0
 * 
 * Description:
 * 이 파일은 구조화된 WHERE 조건을 사용하여 데이터베이스에서 데이터를 조회하는 API 엔드포인트입니다.
 * mysqli_real_escape_string()을 사용하여 기본적인 SQL Injection 공격을 방지합니다.
 * WARNING: Prepared Statement 누수 문제로 인해 일시적으로 일반 statement 사용
 * 
 * Features:
 * - mysqli_real_escape_string()을 통한 기본 보안
 * - 동적 WHERE 조건 처리 (파라미터 바인딩)
 * - 다중 데이터베이스 환경 지원 (preProd/remote)
 * - WHERE 조건 없이 전체 데이터 조회 지원 (whereData = null)
 * - UTF-8 인코딩을 통한 한글 문자 지원
 * 
 * Input Format:
 * POST JSON: {
 *   "data": "{
 *     \"connect_to\": \"preProd|remote\",
 *     \"tableName\": \"table_name\",
 *     \"whereData\": {
 *       \"template\": \"column1 = '{value1}' AND column2 > '{value2}'\",
 *       \"values\": [\"value1\", \"value2\"]
 *     } | null,
 *     \"db_key\": \"portal|eInvoice|pos\"
 *   }"
 * }
 * 
 * Output Format:
 * {
 *   "success": true|false,
 *   "data": [...] | null,
 *   "error": "error_message" | null
 * }
 * 
 * Author: Portal Development Team
 * Created: 2024
 * Last Modified: October 2024
 */

require_once 'db_config.php';

// Prepared Statement 사용 여부 설정 (false = 일반 statement, true = prepared statement)
$isPreparedStmt = false;

// JSON 형식의 POST 데이터를 읽고 파싱합니다.
$toParse = json_decode(file_get_contents("php://input"), true);

if (!isset($toParse['data'])) {
    http_response_code(400);
    echo json_encode(['success' => false, 'error' => 'Missing data in payload']);
    exit;
}

$data = json_decode($toParse['data'], true);

// 필수 데이터 확인: whereData는 null일 수 있으므로 array_key_exists로 확인
if (!isset($data['connect_to'], $data['tableName'], $data['db_key']) || 
    !array_key_exists('whereData', $data)) {
    http_response_code(400);
    echo json_encode(['success' => false, 'error' => 'Missing required parameters (connect_to, tableName, whereData, db_key)']);
    exit;
}

$connect_to = $data['connect_to'];
$tableName = $data['tableName'];
$whereData = $data['whereData']; 
$db_key = $data['db_key']; // 데이터베이스 키 (예: 'eInvoice', 'pos', 'portal')

// whereData 구조 확인 - null이면 WHERE 조건 없이 SELECT * 수행
if ($whereData === null || empty($whereData)) {
    $whereTemplate = "1 = 1"; // WHERE 조건 없음 (모든 레코드 선택)
    $whereValues = [];
    $whereTypes = "";
} else {
    if ($isPreparedStmt) {
        // Prepared Statement 모드: template, values, types 필요
        if (!isset($whereData['template'], $whereData['values'], $whereData['types']) || !is_array($whereData['values'])) {
            http_response_code(400);
            echo json_encode(['success' => false, 'error' => 'whereData must contain template (string), values (array), and types (string) for prepared statements.']);
            exit;
        }
        $whereTemplate = $whereData['template']; // 예: "email = ? AND date > ?"
        $whereValues = $whereData['values'];     // 예: ['user@example.com', '2023-01-01']
        $whereTypes = $whereData['types'];       // 예: 'ss'
    } else {
        // 일반 Statement 모드: template, values만 필요
        if (!isset($whereData['template'], $whereData['values']) || !is_array($whereData['values'])) {
            http_response_code(400);
            echo json_encode(['success' => false, 'error' => 'whereData must contain template (string) and values (array) for regular statements.']);
            exit;
        }
        
        $originalTemplate = $whereData['template'];
        $whereValues = $whereData['values'];
        $whereTypes = "";
        
        // Prepared Statement용 '?' 플레이스홀더를 '{valueN}' 형식으로 자동 변환
        $whereTemplate = $originalTemplate;
        $questionMarkCount = substr_count($originalTemplate, '?');
        
        if ($questionMarkCount > 0) {
            // '?' 플레이스홀더가 있는 경우 '{valueN}' 형식으로 변환
            for ($i = 1; $i <= $questionMarkCount; $i++) {
                $whereTemplate = preg_replace('/\?/', "'{value{$i}}'", $whereTemplate, 1);
            }
        }
        // 그렇지 않으면 이미 '{valueN}' 형식이라고 가정하고 그대로 사용
    }
}

// db_config.php에서 DB 연결 정보 추출
$db_data = getDbInfo();
$db_server_address = $db_data[$connect_to]['db_server_address'];
$db_username = $db_data[$connect_to]['db_username'];
$db_password = $db_data[$connect_to]['db_password'];
$db_name = $db_data[$connect_to]['db_names'][$db_key];

// 데이터베이스 연결 설정
$connection = mysqli_connect($db_server_address, $db_username, $db_password, $db_name);

// 연결 오류 확인
if (mysqli_connect_errno()) {
    http_response_code(500);
    echo json_encode(['success' => false, 'error' => 'Database connection failed: ' . mysqli_connect_error()]);
    exit;
}

// UTF-8 문자셋 설정
mysqli_set_charset($connection, 'utf8mb4');

if ($isPreparedStmt) {
    // === PREPARED STATEMENT 모드 ===
    // 1. Prepared Statement 쿼리 생성 (값은 ?로 대체)
    $sql = "SELECT * FROM {$tableName} WHERE {$whereTemplate}";

    // 2. Statement 준비
    if (!$stmt = mysqli_prepare($connection, $sql)) {
        http_response_code(500);
        echo json_encode(['success' => false, 'error' => 'SQL prepare failed: ' . mysqli_error($connection), 'sql_attempted' => $sql]);
        mysqli_close($connection);
        exit;
    }

    // 3. 파라미터 바인딩 (파라미터가 있는 경우에만)
    if (!empty($whereValues) && !empty($whereTypes)) {
        $bindParams = array_merge([$whereTypes], $whereValues);
        $params = [];
        foreach ($bindParams as $key => $value) {
            $params[$key] = &$bindParams[$key];
        }

        if (!call_user_func_array('mysqli_stmt_bind_param', array_merge([$stmt], $params))) {
            http_response_code(500);
            echo json_encode(['success' => false, 'error' => 'Parameter binding failed: ' . mysqli_stmt_error($stmt)]);
            mysqli_stmt_close($stmt);
            mysqli_close($connection);
            exit;
        }
    }

    // 4. 쿼리 실행
    if (!mysqli_stmt_execute($stmt)) {
        http_response_code(500);
        echo json_encode(['success' => false, 'error' => 'Statement execution failed: ' . mysqli_stmt_error($stmt)]);
        mysqli_stmt_close($stmt);
        mysqli_close($connection);
        exit;
    }

    // 5. 결과 가져오기
    $result = mysqli_stmt_get_result($stmt);
    if ($result === false) {
        http_response_code(500);
        echo json_encode(['success' => false, 'error' => 'Failed to get result: ' . mysqli_stmt_error($stmt)]);
        mysqli_stmt_close($stmt);
        mysqli_close($connection);
        exit;
    }
} else {
    // === 일반 STATEMENT 모드 ===
    // 1. WHERE 조건 값들을 안전하게 이스케이프 처리
    $finalWhereClause = $whereTemplate;
    if (!empty($whereValues)) {
        // 값들을 mysqli_real_escape_string으로 보호
        $escapedValues = [];
        foreach ($whereValues as $value) {
            $escapedValues[] = mysqli_real_escape_string($connection, $value);
        }
        
        // 템플릿의 {value1}, {value2} 등을 실제 값으로 교체
        for ($i = 0; $i < count($escapedValues); $i++) {
            $placeholder = '{value' . ($i + 1) . '}';
            $finalWhereClause = str_replace($placeholder, $escapedValues[$i], $finalWhereClause);
        }
    }

    // 2. 최종 SQL 쿼리 생성
    $sql = "SELECT * FROM {$tableName} WHERE {$finalWhereClause}";

    // 3. 쿼리 실행
    $result = mysqli_query($connection, $sql);
    if ($result === false) {
        http_response_code(500);
        echo json_encode(['success' => false, 'error' => 'Query execution failed: ' . mysqli_error($connection), 'sql_attempted' => $sql]);
        mysqli_close($connection);
        exit;
    }
}

// 결과 처리
$data = []; // 결과를 배열로 변환
while ($row = mysqli_fetch_assoc($result)) {
    // 결과 문자열을 UTF-8로 인코딩하여 한글 깨짐 방지
    // Note: mysqli_set_charset('utf8') at connection time is better, but this handles it defensively.
    /*
    $row_utf8 = array_map(function($value) {
        return is_string($value) ? utf8_encode($value) : $value;
    }, $row);
    $data[] = $row_utf8;
    */
    // PHP Deprecated 경고를 만들어냄

    // PHP Deprecated 경고를 없애는 안전한 대체 코드
    // 원본 데이터가 'euc-kr' 또는 'cp949' 등이었다고 가정하고 'UTF-8'로 변환합니다.
    // 원본 인코딩을 모른다면 'auto'로 지정할 수 있습니다.
    $row_utf8 = array_map(function($value) {
        if (is_string($value)) {
            // 인코딩을 알 수 없는 경우 'auto'로 지정하거나,
            // DB 설정에 맞는 정확한 원본 인코딩(예: 'EUC-KR')을 지정하세요.
            return mb_convert_encoding($value, 'UTF-8', 'auto'); 
        }
        return $value;
    }, $row);
    $data[] = $row_utf8;



}

// 결과 리소스 해제 및 연결 종료
if ($isPreparedStmt && isset($stmt)) {
    mysqli_stmt_close($stmt);
}
mysqli_free_result($result);
mysqli_close($connection);

// 성공 응답 (결과 데이터 포함)
echo json_encode(['success' => true, 'data' => $data]); 

?>
