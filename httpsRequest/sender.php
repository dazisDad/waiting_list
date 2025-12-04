<?php
// webhook/httpsRequest.php
// Generalized HTTPS request proxy that forwards requests to various APIs
// Expects inputDataSet: {requestTo, url, payload}
// Reads bearer tokens from .env file based on requestTo value

header('Content-Type: application/json');

// Load environment variables from .env file
function loadEnv($filePath) {
    if (!file_exists($filePath)) {
        return [];
    }
    
    $env = [];
    $lines = file($filePath, FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES);
    foreach ($lines as $line) {
        if (strpos(trim($line), '#') === 0) continue; // Skip comments
        
        $parts = explode('=', $line, 2);
        if (count($parts) == 2) {
            $key = trim($parts[0]);
            $value = trim($parts[1], " \t\n\r\0\x0B\"'");
            $env[$key] = $value;
        }
    }
    return $env;
}

// Handle both POST (body) and GET (query parameter) requests
if ($_SERVER['REQUEST_METHOD'] === 'GET' && isset($_GET['data'])) {
    // GET request: read from query parameter
    $input = json_decode($_GET['data'], true);
} else {
    // POST request: read from body
    $raw = file_get_contents('php://input');
    $input = json_decode($raw, true);
}

if (!is_array($input)) {
    http_response_code(400);
    echo json_encode([
        'error' => 'Invalid JSON input',
        'received_raw' => $raw ?? 'No raw data',
        'json_error' => json_last_error_msg()
    ]);
    exit;
}

// Extract inputDataSet
$requestTo = $input['requestTo'] ?? null;
$url = $input['url'] ?? null;
$payload = $input['payload'] ?? [];
$method = strtoupper($input['method'] ?? 'POST'); // Default to POST if not specified

if (!$requestTo || !$url) {
    http_response_code(400);
    echo json_encode([
        'error' => 'Missing required fields: requestTo, url',
        'received_input' => $input,
        'requestTo' => $requestTo,
        'url' => $url
    ]);
    exit;
}

// Load environment variables
$env = loadEnv(__DIR__ . '/.env');

// Get bearer token based on requestTo
$bearerTokenKey = strtoupper($requestTo) . '_BEARER';
$bearer = $env[$bearerTokenKey] ?? null;

if (!$bearer) {
    http_response_code(500);
    echo json_encode(['error' => "Bearer token not found for service: $requestTo", 'expected_env_key' => $bearerTokenKey]);
    exit;
}

// Normalize token: strip any accidental "Bearer " prefix
$bearer = preg_replace('/^\s*Bearer\s+/i', '', $bearer);

// Prepare payload
$payloadJson = json_encode($payload);

$ch = curl_init($url);
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);

if ($method === 'GET') {
    // GET request - no body needed
    curl_setopt($ch, CURLOPT_HTTPGET, true);
    curl_setopt($ch, CURLOPT_HTTPHEADER, [
        'Authorization: Bearer ' . $bearer,
    ]);
} else {
    // POST request (default)
    curl_setopt($ch, CURLOPT_POST, true);
    curl_setopt($ch, CURLOPT_POSTFIELDS, $payloadJson);
    curl_setopt($ch, CURLOPT_HTTPHEADER, [
        'Content-Type: application/json',
        'Authorization: Bearer ' . $bearer,
    ]);
}

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
$debug = (isset($_GET['debug']) && $_GET['debug'] == '1') || (!empty($input['debug']) && $input['debug']);

if ($debug) {
    header('Content-Type: application/json');
    $out = [
        'request_to' => $requestTo,
        'request_url' => $url,
        'request_payload' => json_decode($payloadJson, true),
        'response_http_code' => $httpCode,
        'response_body' => null,
    ];
    // try to decode response body as JSON, else return as text
    $dec = json_decode($response, true);
    $out['response_body'] = $dec === null ? $response : $dec;
    // do not include bearer/token in debug output
    echo json_encode($out, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE);
    exit;
}

// Forward API response (try to pass JSON through)
http_response_code($httpCode ?: 200);
echo $response;

?>
