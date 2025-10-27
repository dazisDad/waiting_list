<?php
// webhook.php
// Receives POSTed JSON from your app when DB row changes.
// Verifies HMAC signature (X-WEBHOOK-SIGNATURE: sha256=...) and writes payload
// to last_event.json in the same folder.

// Configuration - replace the shared secret with a strong value and keep it secret
$secret = 'REPLACE_WITH_A_STRONG_SECRET';

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

// Signature header (expected format: sha256=<hex>)
$signature = isset($_SERVER['HTTP_X_WEBHOOK_SIGNATURE']) ? $_SERVER['HTTP_X_WEBHOOK_SIGNATURE'] : '';
if (!$signature) {
    http_response_code(403);
    echo json_encode(['ok' => false, 'error' => 'missing_signature']);
    exit;
}

// Compute expected signature
$expected = 'sha256=' . hash_hmac('sha256', $body, $secret);

// Use hash_equals to mitigate timing attacks
if (!hash_equals($expected, $signature)) {
    http_response_code(403);
    echo json_encode(['ok' => false, 'error' => 'invalid_signature']);
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
