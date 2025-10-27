
<?php

header("Content-Type: text/event-stream");
header('Cache-Control: no-cache');

// 15시간 기본 실행 시간 설정, 디폴트는 120, 2분임.
set_time_limit(54000);

// ----------------------------------------------------------------------------
define('DB_SERVER', '192.168.2.4');
define('DB_USERNAME', 'remoteUser');
define('DB_PASSWORD', '');
define('DB_NAME', 'donkasla_pos');
 
/* Attempt to connect to MySQL database */
$connect = mysqli_connect(DB_SERVER, DB_USERNAME, DB_PASSWORD, DB_NAME);
 
// Check connection
if($connect === false){
    die("ERROR: Could not connect. " . mysqli_connect_error());
}
date_default_timezone_set('Asia/Kuala_Lumpur');
// ----------------------------------------------------------------------------

$refreshRate = 3;
$tableName = $_GET['tableName'];

$orderKey = "Id";

$reference_record = get_last_record($connect, $tableName, $orderKey);

// 최신 레코드를 가져오는 함수
function get_last_record($connect, $tableName, $orderKey){
    $sql = "SELECT * FROM $tableName ORDER BY $orderKey DESC LIMIT 1";
    $result = mysqli_query($connect, $sql);
    return json_encode(mysqli_fetch_assoc($result));
}

$counter = 0;
while ($counter < 100) {
    // 최신 레코드를 가져옵니다.
    $current_record = get_last_record($connect, $tableName, $orderKey);

    // 현재 레코드와 참조 레코드를 비교합니다.
    if($current_record !== $reference_record){
        echo 'data: ' . $current_record, "\n\n"; // 최신 레코드를 클라이언트에 전송
        $reference_record = $current_record; // 참조 레코드를 업데이트
    }

    // 출력 버퍼를 비우고 메시지를 브라우저로 전송합니다.
    while (ob_get_level() > 0) {
        ob_end_flush();
    }
    flush();

    // 클라이언트가 연결을 종료했는지 확인합니다.
    if ( connection_aborted() ) break;

    // 다음 반복 전 3초 대기합니다.
    sleep($refreshRate);
}

?>