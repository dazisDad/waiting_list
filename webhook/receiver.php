<?php
// webhook.php
// Simple webhook receiver and file writer.
//
// Usage (basic): POST JSON to this endpoint.
// - Requires HTTP Basic Auth credentials set via environment variables:
//     WEBHOOK_USER and WEBHOOK_PASS (or place a .env file next to this script).
// - Options via query string:
//     ?app=<name>         -> store to file: webhook_<name>_events.json (sanitized)
//     ?isAppend=1         -> append incoming payloads into a JSON array
//     ?appendMax=<N>      -> when appending, keep at most N recent items
//     ?prefix=<prefix>    -> optional filename prefix (sanitized)
//     ?suffix=<suffix>    -> optional filename suffix (sanitized)
// - Example:
//     curl -u USER:PASS -X POST "https://donkaslab.com/api/webhook/receiver.php?app=n8n&isAppend=1&appendMax=5" -d '{"id":1}'
//
// Behavior:
// - Writes atomically (.tmp + rename) to avoid partial writes.
// - .env support: create a webhook/.env file (not committed) or set real env vars.
// - Security: do NOT commit .env; this repository includes .env.example for reference.
//
// For production, set env vars in your host rather than using .env.

// Configuration
// Load .env file if present (simple loader). Values from environment variables
// take precedence; .env is a convenience for shared hosting without env config.
function load_dotenv($path) {
    if (!file_exists($path)) return;
    $lines = file($path, FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES);
    foreach ($lines as $line) {
        $line = trim($line);
        if ($line === '' || $line[0] === '#') continue;
        if (strpos($line, '=') === false) continue;
        list($name, $value) = explode('=', $line, 2);
        $name = trim($name);
        $value = trim($value);
        // remove surrounding quotes
        if ((substr($value, 0, 1) === '"' && substr($value, -1) === '"') || (substr($value, 0, 1) === '\'' && substr($value, -1) === '\'')) {
            $value = substr($value, 1, -1);
        }
        // don't overwrite existing env vars
        if (getenv($name) === false) {
            putenv("$name=$value");
            $_ENV[$name] = $value;
            $_SERVER[$name] = $value;
        }
    }
}

// Attempt to load .env in the same directory
load_dotenv(__DIR__ . '/.env');

// This endpoint requires HTTP Basic Auth. Read credentials from environment
// variables to avoid hardcoding secrets in the repository.
// Set WEBHOOK_USER and WEBHOOK_PASS in your hosting environment or in .env.
$expected_user = trim(getenv('WEBHOOK_USER') ?: '');
$expected_pass = trim(getenv('WEBHOOK_PASS') ?: '');

// Fail fast if credentials are not configured. This avoids relying on
// hardcoded defaults and forces operators to set real secrets.
if ($expected_user === '' || $expected_pass === '') {
    header('Content-Type: application/json');
    http_response_code(500);
    echo json_encode(['ok' => false, 'error' => 'server_misconfigured', 'message' => 'WEBHOOK_USER and WEBHOOK_PASS must be set in environment or .env']);
    exit;
}

// Append mode: when true, incoming JSON payloads are appended to an array in
// last_event.json instead of overwriting the file. Default: false.
$isAppend = false;
// Optional quick override for testing: ?isAppend=1
if (isset($_GET['isAppend'])) {
    $isAppend = filter_var($_GET['isAppend'], FILTER_VALIDATE_BOOLEAN);
}
// appendMax: when >0, limit stored array to the most recent N items
$appendMax = 0; // 0 means unlimited (default)
if (isset($_GET['appendMax'])) {
    $appendMax = intval($_GET['appendMax']);
    if ($appendMax < 0) $appendMax = 0;
}

// Destination file (relative to this script)
// Allow selecting application name via ?app=<name>. The provided name is
// sanitized to [A-Za-z0-9_-] and limited in length to avoid path traversal.
// Application name (select output file). Normalize to lowercase and sanitize.
$app = isset($_GET['app']) ? $_GET['app'] : '';
$sanitizedApp = 'last_event';
if ($app !== '') {
    // normalize to lowercase, remove disallowed chars
    $tmp = strtolower($app);
    $tmp = preg_replace('/[^a-z0-9_-]/', '', $tmp);
    if ($tmp !== '') {
        $sanitizedApp = substr($tmp, 0, 64);
    }
}

// Filename prefix/suffix. By default use both so filenames look like
// webhook_<app>_events.json. These can be overridden via GET params
// ?prefix=...&suffix=... (sanitized to safe chars).
$filename_prefix = 'webhook_';
$filename_suffix = '_events';
if (isset($_GET['prefix'])) {
    $p = preg_replace('/[^A-Za-z0-9_-]/', '', $_GET['prefix']);
    if ($p !== '') $filename_prefix = substr($p, 0, 32);
}
if (isset($_GET['suffix'])) {
    $s = preg_replace('/[^A-Za-z0-9_-]/', '', $_GET['suffix']);
    if ($s !== '') $filename_suffix = substr($s, 0, 32);
}

$dest = __DIR__ . '/received_json/' . $filename_prefix . $sanitizedApp . $filename_suffix . '.json';

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

// Ensure destination directory exists
$destDir = dirname($dest);
if (!is_dir($destDir)) {
    if (!mkdir($destDir, 0755, true)) {
        http_response_code(500);
        echo json_encode(['ok' => false, 'error' => 'directory_creation_failed', 'path' => $destDir]);
        exit;
    }
}

// Persist to file atomically with lock
$temp = $dest . '.tmp';

if ($isAppend) {
    $items = [];
    if (file_exists($dest)) {
        $existing = file_get_contents($dest);
        if ($existing !== false && $existing !== '') {
            $existingJson = json_decode($existing, true);
            if (json_last_error() === JSON_ERROR_NONE) {
                if (is_array($existingJson)) {
                    // Distinguish associative object vs list
                    $isAssoc = array_keys($existingJson) !== range(0, count($existingJson) - 1);
                    if ($isAssoc) {
                        $items = [$existingJson];
                    } else {
                        $items = $existingJson;
                    }
                } else {
                    // Existing JSON is not an array/object; keep it as single item
                    $items = [$existingJson];
                }
            } else {
                // If existing file is invalid JSON, discard and start fresh
                $items = [];
            }
        }
    }

    // Append the new item
    $items[] = $json;
    // Trim to appendMax if configured (>0). Keep the most recent entries.
    if ($appendMax > 0 && count($items) > $appendMax) {
        $items = array_slice($items, -1 * $appendMax);
    }

    $dataToWrite = json_encode($items, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
} else {
    // Overwrite mode (original behavior)
    $dataToWrite = json_encode($json, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
}

if (file_put_contents($temp, $dataToWrite, LOCK_EX) === false) {
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
