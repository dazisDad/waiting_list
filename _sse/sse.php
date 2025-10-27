<?php
// Prevent PHP warnings/notices from being printed to the response body
// (they would change the MIME/type and break Server-Sent Events)
@ini_set('display_errors', '0');
@ini_set('display_startup_errors', '0');
error_reporting(0);
header("Content-Type: text/event-stream");
header('Cache-Control: no-cache');

// 15시간 기본 실행 시간 설정, 디폴트는 120, 2분임.
set_time_limit(54000);

// ----------------------------------------------------------------------------
define('DB_SERVER', 'www.donkaslab.com');
define('DB_USERNAME', 'donkasla_admin');
define('DB_PASSWORD', 'OIvm;nyR=[GM');
define('DB_NAME', 'donkasla_n8n');
 
/* Attempt to connect to MySQL database */
$connect = mysqli_connect(DB_SERVER, DB_USERNAME, DB_PASSWORD, DB_NAME);
 
// Check connection — send SSE-style error if connection fails
if($connect === false){
    echo 'data: ' . json_encode(["error" => "Could not connect to database", "detail" => mysqli_connect_error()]) . "\n\n";
    // flush and exit so EventSource sees a proper SSE response
    flush();
    exit;
}
date_default_timezone_set('Asia/Kuala_Lumpur');
// ----------------------------------------------------------------------------

// 폴링 간격(초)
$refreshRate = 3;

// tableName은 GET에서 받되 간단한 유효성 검사(알파넘/언더스코어) 적용
$tableName = isset($_GET['tableName']) ? $_GET['tableName'] : '';
if (!preg_match('/^[A-Za-z0-9_]+$/', $tableName)){
    // 잘못된 테이블명 요청은 에러를 SSE 형식으로 반환하고 종료
    echo 'data: ' . json_encode(["error" => "Invalid tableName"]) . "\n\n";
    exit;
}

// 감시할 키/아이디 (GET 'id'으로 지정 가능, 기본 20)
$orderKey = "Id";
$targetId = isset($_GET['id']) ? intval($_GET['id']) : 20;

// 대상 행을 가져와 JSON으로 반환하는 헬퍼
function get_record_by_id($connect, $tableName, $orderKey, $id){
    // table/column 이름은 이미 간단히 검증했으므로 백틱으로 감싸서 사용
    $table = $tableName;
    $col = $orderKey;
    $sql = "SELECT * FROM `" . $table . "` WHERE `" . $col . "` = " . intval($id) . " LIMIT 1";
    $result = mysqli_query($connect, $sql);
    if(!$result){
        return json_encode(null);
    }
    $row = mysqli_fetch_assoc($result);
    return json_encode($row);
}

$reference_record = get_record_by_id($connect, $tableName, $orderKey, $targetId);

$counter = 0;
while ($counter < 100) {
    // 대상 행을 가져옵니다.
    $current_record = get_record_by_id($connect, $tableName, $orderKey, $targetId);

    // 현재 레코드와 참조 레코드를 비교합니다. (null/empty 처리 포함)
    if ($current_record !== $reference_record) {
        echo 'data: ' . $current_record . "\n\n"; // 변경된 레코드를 클라이언트에 전송
        $reference_record = $current_record; // 참조 레코드를 업데이트
    }

    // 출력 버퍼를 비우고 메시지를 브라우저로 전송합니다.
    while (ob_get_level() > 0) {
        ob_end_flush();
    }
    flush();

    // 클라이언트가 연결을 종료했는지 확인합니다.
    if (connection_aborted()) break;

    // 다음 반복 전 대기
    sleep($refreshRate);

    // 루프 카운터 증가 (원래 설계대로 최대 반복 수 유지)
    $counter++;
}

?>