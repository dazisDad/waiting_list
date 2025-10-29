<?php
/**
 * SQL SELECT WHERE Handler
 * Version: 1.0
 * 
 * Description:
 * 이 파일은 구조화된 WHERE 조건을 사용하여 데이터베이스에서 데이터를 조회하는 API 엔드포인트입니다.
 * Prepared Statement를 사용하여 SQL Injection 공격을 방지하고 안전한 데이터베이스 쿼리를 제공합니다.
 * 
 * Features:
 * - Prepared Statement를 통한 보안 강화
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
 *       \"template\": \"column1 = ? AND column2 > ?\",
 *       \"values\": [\"value1\", \"value2\"],
 *       \"types\": \"ss\"
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
    if (!isset($whereData['template'], $whereData['values'], $whereData['types']) || !is_array($whereData['values'])) {
        http_response_code(400);
        echo json_encode(['success' => false, 'error' => 'whereData must contain template (string), values (array), and types (string).']);
        exit;
    }
    
    $whereTemplate = $whereData['template']; // 예: "email = ? AND date > ?"
    $whereValues = $whereData['values'];     // 예: ['user@example.com', '2023-01-01']
    $whereTypes = $whereData['types'];       // 예: 'ss' (두 개의 문자열 타입)
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
// whereValues가 비어있지 않을 때만 바인딩 수행
if (!empty($whereValues) && !empty($whereTypes)) {
    // mysqli_stmt_bind_param()은 가변 인자(variable number of arguments)를 필요로 하므로,
    // call_user_func_array()를 사용하여 동적으로 인자를 전달합니다.
    $bindParams = array_merge([$whereTypes], $whereValues);
    $params = [];
    foreach ($bindParams as $key => $value) {
        $params[$key] = &$bindParams[$key]; // 레퍼런스로 전달해야 합니다.
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

// 연결 종료
mysqli_stmt_close($stmt);
mysqli_close($connection);

// 성공 응답 (결과 데이터 포함)
echo json_encode(['success' => true, 'data' => $data]); 

?>
