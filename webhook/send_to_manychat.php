<?php
// webhook/send_to_manychat.php
// Forwards a request to ManyChat API to set a subscriber custom field.
// Reads MANYCHAT_BEARER from environment (recommended). If not set, you may pass a 'bearer' field in the POST JSON (not recommended for production).

header('Content-Type: application/json');

$raw = file_get_contents('php://input');
$input = json_decode($raw, true);
if (!is_array($input)) $input = [];

$subscriber_id = $input['subscriber_id'] ?? null;
$field_id = $input['field_id'] ?? null;
$field_value = $input['field_value'] ?? null;
// Hardcoded test token (temporary). In production, use env var MANYCHAT_BEARER or hosting secret.
$bearer = '3675770:5881eb81867423a2e2650cbdd4ada96c';

// Normalize token: strip any accidental "Bearer " prefix the caller may have included
$bearer = preg_replace('/^\s*Bearer\s+/i', '', $bearer);

$url = 'https://api.manychat.com/fb/subscriber/setCustomField';
$payload = json_encode([
    'subscriber_id' => (int)$subscriber_id,
    'field_id' => (int)$field_id,
    'field_value' => $field_value,
]);

$ch = curl_init($url);
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
curl_setopt($ch, CURLOPT_POST, true);
curl_setopt($ch, CURLOPT_POSTFIELDS, $payload);
curl_setopt($ch, CURLOPT_HTTPHEADER, [
    'Content-Type: application/json',
    // ManyChat expects "Authorization: Bearer <token>"
    'Authorization: Bearer ' . $bearer,
]);

$response = curl_exec($ch);
$httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
$err = curl_error($ch);
curl_close($ch);

if ($response === false) {
    http_response_code(500);
    echo json_encode(['error' => 'cURL error', 'detail' => $err]);
    exit;
}

// If debug requested, return structured details (but do NOT expose bearer token)
$debug = true;
if ((isset($_GET['debug']) && $_GET['debug'] == '1') || (!empty($input['debug']) && $input['debug'])) {
    $debug = true;
}

if ($debug) {
    header('Content-Type: application/json');
    $out = [
        'request_payload' => json_decode($payload, true),
        'manychat_http_code' => $httpCode,
        'manychat_response' => null,
    ];
    // try to decode response body as JSON, else return as text
    $dec = json_decode($response, true);
    $out['manychat_response'] = $dec === null ? $response : $dec;
    // do not include bearer/token in debug output
    echo json_encode($out, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE);
    exit;
}

// Forward ManyChat's response (try to pass JSON through)
http_response_code($httpCode ?: 200);
echo $response;

?>
