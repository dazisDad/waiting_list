<?php
// send_webhook_example.php
// Example script demonstrating how your app can call the webhook endpoint
// Replace URL and secret as needed.

$webhookUrl = 'https://www.donkaslab.com/webhook/webhook.php';
$secret = 'REPLACE_WITH_A_STRONG_SECRET';

$payload = json_encode([
    'Id' => 20,
    'bill_amount' => 99.90,
    'time' => date('c')
]);

$sig = 'sha256=' . hash_hmac('sha256', $payload, $secret);

$ch = curl_init($webhookUrl);
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
curl_setopt($ch, CURLOPT_POST, true);
curl_setopt($ch, CURLOPT_HTTPHEADER, [
    'Content-Type: application/json',
    'X-WEBHOOK-SIGNATURE: ' . $sig
]);
curl_setopt($ch, CURLOPT_POSTFIELDS, $payload);
$res = curl_exec($ch);
$err = curl_error($ch);
$code = curl_getinfo($ch, CURLINFO_HTTP_CODE);
curl_close($ch);

if ($res === false) {
    echo "Request failed: $err\n";
} else {
    echo "HTTP $code\n" . $res . PHP_EOL;
}
