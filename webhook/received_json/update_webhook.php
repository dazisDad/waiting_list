<?php
/**
 * update_webhook.php
 * 
 * webhook_waitlist_events.json 파일을 강제로 업데이트하여
 * polling_json.js가 변경을 감지하고 handleNewEvent()를 트리거하도록 함
 * 
 * 기능:
 * - 현재 JSON 파일 읽기
 * - 타임스탬프 및 세션 ID 필드 추가/업데이트
 * - 파일 저장 (내용 변경으로 폴링 트리거)
 * 
 * 응답:
 * - success: true/false
 * - message: 상태 메시지
 * - timestamp: 업데이트 타임스탬프
 * - session_id: 트리거한 클라이언트의 세션 ID
 */

header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST, GET, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

// OPTIONS 요청 처리 (CORS preflight)
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

try {
    // POST 요청에서 session_id 읽기
    $requestBody = file_get_contents('php://input');
    $requestData = json_decode($requestBody, true);
    $sessionId = isset($requestData['session_id']) ? $requestData['session_id'] : null;
    
    $jsonFile = __DIR__ . '/webhook_waitlist_events.json';
    
    // 파일 존재 확인
    if (!file_exists($jsonFile)) {
        throw new Exception("JSON file not found: $jsonFile");
    }
    
    // 현재 JSON 파일 읽기
    $jsonContent = file_get_contents($jsonFile);
    if ($jsonContent === false) {
        throw new Exception("Failed to read JSON file");
    }
    
    // JSON 파싱
    $data = json_decode($jsonContent, true);
    if ($data === null && json_last_error() !== JSON_ERROR_NONE) {
        throw new Exception("Invalid JSON format: " . json_last_error_msg());
    }
    
    // 배열이 아니면 빈 배열로 초기화
    if (!is_array($data)) {
        $data = [];
    }
    
    // 현재 타임스탬프
    $timestamp = time();
    $datetime = date('Y-m-d H:i:s', $timestamp);
    
    // 강제 업데이트를 위한 메타데이터 추가
    // 배열의 마지막 항목에 _force_update 및 _session_id 필드 추가
    if (count($data) > 0) {
        // 마지막 항목에 타임스탬프와 세션 ID 추가
        $lastIndex = count($data) - 1;
        $data[$lastIndex]['_force_update'] = $timestamp;
        $data[$lastIndex]['_force_update_datetime'] = $datetime;
        $data[$lastIndex]['_session_id'] = $sessionId;
    } else {
        // 데이터가 없으면 더미 항목 추가
        $data[] = [
            '_force_update' => $timestamp,
            '_force_update_datetime' => $datetime,
            '_session_id' => $sessionId,
            'note' => 'Force update trigger'
        ];
    }
    
    // JSON 파일 저장 (pretty print)
    $jsonOutput = json_encode($data, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE);
    if ($jsonOutput === false) {
        throw new Exception("Failed to encode JSON: " . json_last_error_msg());
    }
    
    $writeResult = file_put_contents($jsonFile, $jsonOutput);
    if ($writeResult === false) {
        throw new Exception("Failed to write JSON file");
    }
    
    // 성공 응답
    echo json_encode([
        'success' => true,
        'message' => 'Webhook file updated successfully',
        'timestamp' => $timestamp,
        'datetime' => $datetime,
        'session_id' => $sessionId,
        'bytes_written' => $writeResult
    ]);
    
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'message' => $e->getMessage(),
        'timestamp' => time()
    ]);
}
