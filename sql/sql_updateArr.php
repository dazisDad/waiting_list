<?php
// PHP 오류 로깅을 활성화합니다.
error_reporting(E_ALL);
ini_set('display_errors', 1);

header('Content-Type: application/json');

// 데이터베이스 연결 정보를 가져옵니다.
require_once 'db_config.php';

// POST 요청의 본문 데이터를 읽습니다.
$json_data = file_get_contents('php://input');
$data_obj = json_decode($json_data, true);

// 데이터 페이로드를 올바르게 디코딩합니다.
if (isset($data_obj['data'])) {
    $fullPayload = json_decode($data_obj['data'], true);
} else {
    $fullPayload = $data_obj;
}

// 페이로드의 필수 키들을 확인합니다.
if (!isset($fullPayload['connect_to']) || !isset($fullPayload['dataSet']) || !isset($fullPayload['tableName_key']) || !isset($fullPayload['db_key'])) {
    echo json_encode(['success' => false, 'message' => 'Missing required keys: connect_to, dataSet, tableName_key, or db_key.']);
    exit;
}

// whereSet이 없거나 빈 배열이면 빈 배열로 설정
if (!isset($fullPayload['whereSet']) || !is_array($fullPayload['whereSet'])) {
    $fullPayload['whereSet'] = [];
}

// 페이로드에서 필요한 정보를 추출합니다.
$connect_to = $fullPayload['connect_to'];
$dataArray = $fullPayload['dataSet'];
$tableName = $fullPayload['tableName_key'];
$whereColumns = $fullPayload['whereSet'];
$db_key = $fullPayload['db_key']; // 데이터베이스 키 (예: 'eInvoice', 'pos', 'portal')

// db_config.php에서 데이터베이스 정보를 가져옵니다.
$db_data = getDbInfo();
$db_server_address = $db_data[$connect_to]['db_server_address'];
$db_username = $db_data[$connect_to]['db_username'];
$db_password = $db_data[$connect_to]['db_password'];
$db_name = $db_data[$connect_to]['db_names'][$db_key];

$connection = mysqli_connect($db_server_address, $db_username, $db_password, $db_name);

if (!$connection) {
    echo json_encode(['success' => false, 'message' => 'Database connection failed.']);
    exit;
}

// 안전을 위해 트랜잭션을 시작합니다.
$connection->begin_transaction();

$results = [];

// 각 데이터셋 항목을 반복 처리합니다.
foreach ($dataArray as $dataSet) {
    $existingId = null;
    
    // whereSet이 비어있으면 바로 INSERT 모드로 진행
    if (empty($whereColumns)) {
        // 바로 INSERT 실행
        $existingId = null; // INSERT 모드
    } else {
        // 기존 로직: whereSet 키가 각 데이터 항목에 존재하는지 확인
        $missingWhereKeys = false;
        foreach ($whereColumns as $col) {
            if (!isset($dataSet[$col])) {
                $missingWhereKeys = true;
                break;
            }
        }
        if ($missingWhereKeys) {
            $results[] = ['success' => false, 'message' => 'Missing a required whereSet key in a dataSet item.', 'data' => $dataSet];
            continue;
        }

        // 1. 기존 레코드 존재 여부를 확인하기 위한 SELECT 쿼리를 동적으로 생성합니다.
        $whereClauses = [];
        $whereTypes = '';
        $whereValues = [];
        foreach ($whereColumns as $col) {
            $whereClauses[] = "`{$col}` = ?";
            $whereTypes .= 's'; // 모든 whereSet 값은 문자열로 가정
            $whereValues[] = $dataSet[$col];
        }
        $whereClause = implode(' AND ', $whereClauses);
        $selectSql = "SELECT Id FROM `{$tableName}` WHERE {$whereClause}";
        
        if ($stmt = $connection->prepare($selectSql)) {
            $stmt->bind_param($whereTypes, ...$whereValues);
            $stmt->execute();
            $stmt->bind_result($existingId);
            $stmt->fetch();
            $stmt->close();
        } else {
            $results[] = ['success' => false, 'message' => 'Failed to prepare SELECT statement: ' . $connection->error, 'data' => $dataSet];
            continue;
        }
    }

    // 2. 레코드가 존재하면 업데이트, 그렇지 않으면 삽입합니다.
    if ($existingId) {
        // UPDATE 쿼리를 동적으로 생성합니다.
        $updateSet = [];
        $updateTypes = '';
        $updateValues = [];
        foreach ($dataSet as $key => $value) {
            // whereSet에 포함되지 않은 필드만 업데이트 대상으로 합니다.
            if (!in_array($key, $whereColumns) && $key !== 'Id') {
                $updateSet[] = "`{$key}` = ?";
                $updateTypes .= 's'; // 모든 값은 문자열로 가정
                $updateValues[] = $value;
            }
        }
        $updateSetClause = implode(', ', $updateSet);
        $updateSql = "UPDATE `{$tableName}` SET {$updateSetClause} WHERE `Id` = ?";

        if ($stmt = $connection->prepare($updateSql)) {
            $updateValues[] = $existingId;
            $updateTypes .= 'i'; // Id는 정수이므로 'i'를 추가
            $stmt->bind_param($updateTypes, ...$updateValues);
            $stmt->execute();
            if ($stmt->affected_rows > 0) {
                $results[] = ['success' => true, 'message' => 'Row updated successfully.', 'data' => $dataSet];
            } else {
                $results[] = ['success' => false, 'message' => 'No rows were updated.', 'data' => $dataSet];
            }
            $stmt->close();
        } else {
            $results[] = ['success' => false, 'message' => 'Failed to prepare UPDATE statement: ' . $connection->error, 'data' => $dataSet];
        }
    } else {
        // INSERT 쿼리를 동적으로 생성합니다.
        $columns = [];
        $placeholders = [];
        $insertTypes = '';
        $insertValues = [];
        foreach ($dataSet as $key => $value) {
            $columns[] = "`{$key}`";
            $placeholders[] = '?';
            $insertTypes .= 's'; // 모든 값은 문자열로 가정
            $insertValues[] = $value;
        }
        $columnList = implode(', ', $columns);
        $placeholderList = implode(', ', $placeholders);
        $insertSql = "INSERT INTO `{$tableName}` ({$columnList}) VALUES ({$placeholderList})";

        if ($stmt = $connection->prepare($insertSql)) {
            $stmt->bind_param($insertTypes, ...$insertValues);
            $stmt->execute();
            if ($stmt->affected_rows > 0) {
                $results[] = ['success' => true, 'message' => 'New row inserted successfully.', 'data' => $dataSet];
            } else {
                $results[] = ['success' => false, 'message' => 'Failed to insert new row.', 'data' => $dataSet];
            }
            $stmt->close();
        } else {
            $results[] = ['success' => false, 'message' => 'Failed to prepare INSERT statement: ' . $connection->error, 'data' => $dataSet];
        }
    }
}

// 트랜잭션을 커밋하고 연결을 닫습니다.
$connection->commit();
$connection->close();

// 최종 결과를 JSON 형식으로 반환합니다.
echo json_encode(['success' => true, 'results' => $results, 'message' => 'Batch operation completed.']);
?>
