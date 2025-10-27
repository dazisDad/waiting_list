<?php
// send_webhook_example.php
// Example script demonstrating how your app can call the webhook endpoint
// Replace URL and secret as needed.

// Target webhook URL (server-side POST). Keep in sync with your webhook endpoint.
$webhookUrl = 'https://www.donkaslab.com/webhook/webhook.php';
$secret = 'REPLACE_WITH_A_STRONG_SECRET';

// If you cannot make outbound HTTP requests from shared hosting, call this script
// with ?simulate=1 to write directly to last_event.json for testing.
$simulate = isset($_GET['simulate']) && $_GET['simulate'] == '1';

$payload = json_encode([
    'Id' => 20,
    'subscriber_id' => 99.90,
    'customer_name' => date('c')
]);

if ($simulate) {
    // Local simulation mode: write payload directly to last_event.json
    $dest = __DIR__ . '/last_event.json';
    $tmp = $dest . '.tmp';
    if (file_put_contents($tmp, $payload, LOCK_EX) === false) {
        echo "Local write failed\n";
        exit;
    }
    if (!rename($tmp, $dest)) {
        echo "Local rename failed\n";
        exit;
    }
    echo "Simulated webhook: written to last_event.json\n";
    exit;
}

$sig = 'sha256=' . hash_hmac('sha256', $payload, $secret);

$ch = curl_init($webhookUrl);
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
curl_setopt($ch, CURLOPT_POST, true);
curl_setopt($ch, CURLOPT_HTTPHEADER, [
    'Content-Type: application/json',
    'X-WEBHOOK-SIGNATURE: ' . $sig
]);
curl_setopt($ch, CURLOPT_POSTFIELDS, $payload);

// set a timeout so script doesn't hang on blocked connections
curl_setopt($ch, CURLOPT_CONNECTTIMEOUT, 5);
curl_setopt($ch, CURLOPT_TIMEOUT, 10);

$res = curl_exec($ch);
$err = curl_error($ch);
$code = curl_getinfo($ch, CURLINFO_HTTP_CODE);
curl_close($ch);

if ($res === false) {
    echo "Request failed: $err\n";
} else {
    echo "HTTP $code\n" . $res . PHP_EOL;
}
?>