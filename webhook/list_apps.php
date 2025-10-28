<?php
// list_apps.php
// Returns a JSON array of available webhook JSON files (apps) in this folder.
header('Content-Type: application/json');

$dir = __DIR__;
$files = scandir($dir);
$apps = [];

foreach ($files as $f) {
    if (!is_file($dir . DIRECTORY_SEPARATOR . $f)) continue;
    if (substr($f, -5) !== '.json') continue;
    // ignore .env example or generic files we don't want to show
    if ($f === '.env' || $f === '.env.example' || $f === '.gitignore') continue;

    // Recognize files created by webhook.php: webhook_<app>_events.json
    if (preg_match('/^webhook_([A-Za-z0-9_-]+)_events\.json$/', $f, $m)) {
        $apps[] = ['key' => $m[1], 'filename' => $f];
        continue;
    }
    if ($f === 'last_event.json') {
        $apps[] = ['key' => 'last_event', 'filename' => $f];
        continue;
    }
    // Fallback: any simple <name>.json file
    if (preg_match('/^([A-Za-z0-9_-]+)\.json$/', $f, $m)) {
        $apps[] = ['key' => $m[1], 'filename' => $f];
        continue;
    }
}

// Deduplicate by filename
$seen = [];
$out = [];
foreach ($apps as $a) {
    if (isset($seen[$a['filename']])) continue;
    $seen[$a['filename']] = true;
    $out[] = $a;
}

echo json_encode(array_values($out));
exit;
