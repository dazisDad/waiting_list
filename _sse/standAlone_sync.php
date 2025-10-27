<?php
header('Content-Type: application/json');

$origin_host = '192.168.2.4';
$origin_username = 'remoteUser';
$origin_password = '';
$origin_dbName = 'donkasla_pos';

$target_host = 'localhost';
$target_username = 'root';
$target_password = '';
$target_dbName = 'donkasla_pos';

$connection_origin = mysqli_connect($origin_host, $origin_username, $origin_password, $origin_dbName);
if (!$connection_origin) {
    die(json_encode(['success' => false, 'error' => '원본 데이터베이스 연결 실패: ' . mysqli_connect_error()]));
}

$connection_target = mysqli_connect($target_host, $target_username, $target_password, $target_dbName);
if (!$connection_target) {
    die(json_encode(['success' => false, 'error' => '대상 데이터베이스 연결 실패: ' . mysqli_connect_error()]));
}

$tableName = 'history_bill';

// 원본의 테이블의 열 이름 가져오기
$sqlColumns = "SHOW COLUMNS FROM $tableName";
$result = mysqli_query($connection_origin, $sqlColumns);

$columns = [];
if ($result->num_rows > 0) {
    while ($row = $result->fetch_assoc()) {
        if ($row['Field'] != 'Id') {
            $columns[] = $row['Field'];
        }
    }
}
$columnsList = implode(", ", $columns);

// 타겟의 마지막 동기화된 Id 가져오기
$last_id_query = "SELECT MAX(Id) AS last_id FROM history_bill";
$result = $connection_target->query($last_id_query);
$last_id_row = $result->fetch_assoc();
$last_id = $last_id_row['last_id'];

// 원본 테이블에서 데이터 가져오기
$sqlSelectData = "SELECT $columnsList FROM $tableName WHERE Id > " . intval($last_id);
$resultSelectData = mysqli_query($connection_origin, $sqlSelectData);

if ($resultSelectData) {
    $syncCount = 0;
    while ($row = mysqli_fetch_assoc($resultSelectData)) {
        $values = array_map(function($item) use ($connection_target) {
            return is_null($item) ? "''" : "'" . mysqli_real_escape_string($connection_target, $item) . "'";
        }, array_values($row));
        
        $valuesList = implode(", ", $values);
        $sqlInsertData = "INSERT INTO $tableName ($columnsList) VALUES ($valuesList)";
        
        $resultInsertData = mysqli_query($connection_target, $sqlInsertData);
        if (!$resultInsertData) {
            echo json_encode(['success' => false, 'error' => 'INSERT 오류: ' . mysqli_error($connection_target)]);
            mysqli_close($connection_origin);
            mysqli_close($connection_target);
            exit;
        } else {
            $syncCount++;
        }
    }
    $resultTxt = 'Synced ('.$syncCount.')';
    echo json_encode(['success' => true, 'result' => $resultTxt]);
} else {
    echo json_encode(['success' => false, 'error' => 'SELECT 오류: ' . mysqli_error($connection_origin)]);
}

// 연결 닫기
mysqli_close($connection_origin);
mysqli_close($connection_target);



/*
header('Content-Type: application/json');

$origin_host = '192.168.2.4';
$origin_username = 'remoteUser';
$origin_password = '';
$origin_dbName = 'donkasla_pos';

$target_host = '192.168.2.5';
$target_username = 'root';
$target_password = '';
$target_dbName = 'donkasla_pos';

$connection_origin = mysqli_connect($origin_host, $origin_username, $origin_password, $origin_dbName);
$connection_target = mysqli_connect($target_host, $target_username, $target_password, $target_dbName);

$tableName = 'history_bill';

// 원본의 테이블의 열 이름 가져오기
$sqlColumns = "SHOW COLUMNS FROM $tableName";
$result = mysqli_query($connection_origin, $sqlColumns);

$columns = [];
if ($result->num_rows > 0) {
    while ($row = $result->fetch_assoc()) {
        if ($row['Field'] != 'Id') {
            $columns[] = $row['Field'];
        }
    }
}
$columnsList = implode(", ", $columns);


// 타겟의 마지막 동기화 된 Id 가져오기
$last_id_query = "SELECT MAX(Id) AS last_id FROM history_bill";
$result = $connection_target->query($last_id_query);
$last_id_row = $result->fetch_assoc();
$last_id = $last_id_row['last_id'];

// 원본 테이블에서 데이터 가져오기
$sqlSelectData = "SELECT $columnsList FROM $tableName WHERE Id > $last_id";
$resultSelectData = mysqli_query($connection_origin, $sqlSelectData);

if ($resultSelectData) {
    while ($row = mysqli_fetch_assoc($resultSelectData)) {
        $values = array_map(function($item) use ($connection_target) {
            if (is_null($item)) {
                $item = ''; // NULL 값을 빈 문자열로 변환
            }
            return "'" . mysqli_real_escape_string($connection_target, $item) . "'";
        }, array_values($row));
        
        $valuesList = implode(", ", $values);
        $sqlInsertData = "INSERT INTO $tableName ($columnsList) VALUES ($valuesList)";
        
        $resultInsertData = mysqli_query($connection_target, $sqlInsertData);
        if (!$resultInsertData) {
            echo json_encode(['success' => false, 'error' => mysqli_error($connection_target)]);
            mysqli_close($connection_origin);
            mysqli_close($connection_target);
            exit;
        }
    }
    echo json_encode(['success' => true, 'result' => true]);
} else {
    echo json_encode(['success' => false, 'error' => mysqli_error($connection_origin)]);
}

// 연결 닫기
mysqli_close($connection_origin);
mysqli_close($connection_target);

*/
?>
