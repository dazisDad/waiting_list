<?php

$key = "41761bf1deb40b4fc24217be9365e36c";
$secret = "ltGJscPKMWvHe6MmM6TF8RJ0LoAmSe21BOw/rBCLb3PgDImJkN1kq9L2MGwfEXYE";

$time = time() * 1000;
$baseURL = "https://rest.sandbox.lalamove.com"; // URl to Lalamove Sandbox API
$method = 'POST';
$path = '/v2/quotations';
$region = 'MY_KUL';


//passed variable
$body = $_POST['data'];

$rawSignature = "{$time}\r\n{$method}\r\n{$path}\r\n\r\n{$body}";
$signature = hash_hmac("sha256", $rawSignature, $secret);
$startTime = microtime(true);
$token = $key.':'.$time.':'.$signature;

$curl = curl_init();
curl_setopt_array($curl, array(
    CURLOPT_URL => $baseURL.$path,
    CURLOPT_RETURNTRANSFER => true,
    CURLOPT_ENCODING => '',
    CURLOPT_MAXREDIRS => 10,
    CURLOPT_TIMEOUT => 3,
    CURLOPT_FOLLOWLOCATION => true,
    CURLOPT_HEADER => false, // Enable this option if you want to see what headers Lalamove API returning in response
    CURLOPT_HTTP_VERSION => CURL_HTTP_VERSION_1_1,
    CURLOPT_CUSTOMREQUEST => 'POST',
    CURLOPT_POSTFIELDS => $body,
    CURLOPT_HTTPHEADER => array(
        "Content-type: application/json; charset=utf-8",
        "Authorization: hmac ".$token, // A unique Signature Hash has to be generated for EVERY API call at the time of making such call.
        "Accept: application/json",
        "X-LLM-Market: {$region}" // Please note to which city are you trying to make API call
    ),
));

$response = curl_exec($curl);
$httpCode = curl_getinfo($curl, CURLINFO_HTTP_CODE);
curl_close($curl);

//echo "Total elapsed http request/response time in milliseconds: ".floor((microtime(true) - $startTime)*1000)."\r\n";
//echo "Authorization: hmac ".$token."\r\n";
//echo 'Status Code: '. $httpCode."\r\n";
//echo 'Returned data: '.$response."\r\n";

$returned['process_time'] = "Total elapsed http request/response time in milliseconds: ".floor((microtime(true) - $startTime)*1000)."\r\n";
$returned['authorization'] = "Authorization: hmac ".$token."\r\n";
$returned['status_code'] = 'Status Code: '. $httpCode."\r\n";
$returned['returned_data'] = $response;


echo json_encode($returned);

?>