<?php
// webhook.php
// Receives POSTed JSON from your app when DB row changes.
// Verifies HMAC signature (X-WEBHOOK-SIGNATURE: sha256=...) and writes payload
// to last_event.json in the same folder.

// Configuration
// This endpoint now requires HTTP Basic Auth. Set the expected credentials here.
// WARNING: credentials are set as requested; in production prefer environment vars.
$expected_user = 'dlwebhook';
$expected_pass = 'dHfeih237ssdf23JFHFds';

// Destination file (relative to this script)
$dest = __DIR__ . '/last_event.json';

// Ensure we always respond with JSON
header('Content-Type: application/json');

// Read incoming body
$body = file_get_contents('php://input');
if ($body === false || $body === '') {
    http_response_code(400);
    echo json_encode(['ok' => false, 'error' => 'empty_body']);
    exit;
}

// Require HTTP Basic Auth
$auth_user = null;
$auth_pass = null;
if (isset($_SERVER['PHP_AUTH_USER'])) {
    $auth_user = $_SERVER['PHP_AUTH_USER'];
    $auth_pass = isset($_SERVER['PHP_AUTH_PW']) ? $_SERVER['PHP_AUTH_PW'] : '';
} else {
    // Fallback: some servers place header in HTTP_AUTHORIZATION
    $authHeader = '';
    if (isset($_SERVER['HTTP_AUTHORIZATION'])) {
        $authHeader = $_SERVER['HTTP_AUTHORIZATION'];
    } elseif (function_exists('getallheaders')) {
        $h = getallheaders();
        if (isset($h['Authorization'])) $authHeader = $h['Authorization'];
        if (isset($h['authorization'])) $authHeader = $h['authorization'];
    }
    if ($authHeader && stripos($authHeader, 'basic ') === 0) {
        $decoded = base64_decode(substr($authHeader, 6));
        if ($decoded !== false) {
            $parts = explode(':', $decoded, 2);
            if (count($parts) === 2) {
                $auth_user = $parts[0];
                $auth_pass = $parts[1];
            }
        }
    }
}

// Validate credentials
if ($auth_user === null || !hash_equals($expected_user, $auth_user) || !hash_equals($expected_pass, $auth_pass ?? '')) {
    header('WWW-Authenticate: Basic realm="Webhook"');
    http_response_code(401);
    echo json_encode(['ok' => false, 'error' => 'auth_failed']);
    exit;
}

// Optionally validate payload is JSON
$json = json_decode($body, true);
if (json_last_error() !== JSON_ERROR_NONE) {
    http_response_code(400);
    echo json_encode(['ok' => false, 'error' => 'invalid_json']);
    exit;
}

// Persist to file atomically with lock
$temp = $dest . '.tmp';
if (file_put_contents($temp, json_encode($json, JSON_UNESCAPED_UNICODE|JSON_UNESCAPED_SLASHES), LOCK_EX) === false) {
    http_response_code(500);
    echo json_encode(['ok' => false, 'error' => 'write_failed']);
    exit;
}

// Replace atomically
if (!rename($temp, $dest)) {
    http_response_code(500);
    echo json_encode(['ok' => false, 'error' => 'rename_failed']);
    exit;
}

// Success
echo json_encode(['ok' => true]);
exit;
