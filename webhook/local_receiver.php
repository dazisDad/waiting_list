<?php
date_default_timezone_set('Asia/Kuala_Lumpur');
// local_receiver.php
// Local webhook receiver for frontend JavaScript POST requests
// No authentication required - for local development only
//
// Usage: POST JSON from frontend JavaScript
// - Options via query string:
//     ?app=<name>         -> store to file: webhook_<name>_events.json (sanitized)
//     ?isAppend=1         -> append incoming payloads into a JSON array
//     ?appendMax=<N>      -> when appending, keep at most N recent items
//     ?prefix=<prefix>    -> optional filename prefix (sanitized)
//     ?suffix=<suffix>    -> optional filename suffix (sanitized)
//
// CORS enabled for frontend access

require_once 'processor.php';

function load_dotenv($path) {
    // Return an associative array of values loaded from the .env (for convenience).
    // If the file doesn't exist, return an empty array.
    $loaded = [];
    if (!file_exists($path)) return $loaded;
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
        // record what we loaded (or what was already present)
        $loaded[$name] = getenv($name);
    }

    return $loaded;
}

// Attempt to load .env in the same directory and capture loaded values.
$loaded_env = load_dotenv(__DIR__ . '/.env');

// Enable CORS for frontend JavaScript access
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

// Handle preflight OPTIONS request
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

// Append mode: when true, incoming JSON payloads are appended to an array
$isAppend = true;
if (isset($_GET['isAppend'])) {
    $isAppend = filter_var($_GET['isAppend'], FILTER_VALIDATE_BOOLEAN);
}

// appendMax: when >0, limit stored array to the most recent N items
$appendMax = 10; // 0 means unlimited (default 10)
if (isset($_GET['appendMax'])) {
    $appendMax = intval($_GET['appendMax']);
    if ($appendMax < 0) $appendMax = 0;
}

// Application name (select output file). Normalize to lowercase and sanitize.
$app = isset($_GET['app']) ? $_GET['app'] : 'waitlist';
$sanitizedApp = 'waitlist'; // default
if ($app !== '') {
    // normalize to lowercase, remove disallowed chars
    $tmp = strtolower($app);
    $tmp = preg_replace('/[^a-z0-9_-]/', '', $tmp);
    if ($tmp !== '') {
        $sanitizedApp = substr($tmp, 0, 64);
    }
}

// Filename prefix/suffix
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

// Read incoming body and request method
$method = $_SERVER['REQUEST_METHOD'] ?? 'GET';
$body = file_get_contents('php://input');

// For valid POST requests, respond with JSON
header('Content-Type: application/json');

// If the request is not a POST or no POST body was provided, return error
if ($method !== 'POST' || $body === false || $body === '') {
    http_response_code(400);
    echo json_encode(['ok' => false, 'error' => 'invalid_request', 'message' => 'POST with JSON body required']);
    exit;
}

// Validate payload is JSON
$json = json_decode($body, true);
if (json_last_error() !== JSON_ERROR_NONE) {
    http_response_code(400);
    echo json_encode(['ok' => false, 'error' => 'invalid_json', 'message' => json_last_error_msg()]);
    exit;
}

// Execute flow_execution first
$return_json = flow_execution($json);

// Only proceed with file operations if success is true
if (isset($return_json['success']) && $return_json['success'] === true) {
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
}

// Return the response from flow_execution
echo json_encode($return_json);
exit;
