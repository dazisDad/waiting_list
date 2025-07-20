<?php
include "connect.php";

$received_data = json_decode(stripslashes($_POST['data']),true);
$que_id = $received_data['que_id'];
$mode = $received_data['mode'];
$isSkipSecond = $received_data['isSkipSecond'];


$sql = "SELECT * FROM waiting_list_ver3 WHERE Id = $que_id";
$result = mysqli_query($connect, $sql);
$fetchData = mysqli_fetch_all($result, MYSQLI_ASSOC);

mysqli_free_result($result); // Free result set


$tel = $fetchData[0]['phone'];

if($isSkipSecond){
  $sms_status = 2;
}else{
  $sms_status = $fetchData[0]['sms_status'];
}


switch ($sms_status) {
  case 1:
    $msg = "[Donkas Lab] #".$que_id.": You're up next! Please get ready to have DONKAS :)";
    $sql_update = "UPDATE waiting_list_ver3 SET sms_status = 2 WHERE Id = $que_id";
    $sms_status_code = 2;
    break;
  case 2:
    $msg = "[Donkas Lab] #".$que_id.": Great! Your table is now available :)";
    $sql_update = "UPDATE waiting_list_ver3 SET sms_status = 3 WHERE Id = $que_id";
    $sms_status_code = 3;
    break;
  case 3:
    $sms_status_code = 4; //To prevent sending again from user input
    break;
  default:
    $msg = "[Donkas Lab] You're on our list! Your que # is ".$que_id.". We will notify you again when there is update on your que status.";
    $sql_update = "UPDATE waiting_list_ver3 SET sms_status = 1 WHERE Id = $que_id";
    $sms_status_code = 1;
}

mysqli_query($connect, $sql_update);
mysqli_close($connect);

if($sms_status <3){
  $url = 'https://rest.nexmo.com/sms/json';
  $data = [
    'from' => 'DonkasLab',
    'text' => $msg,
    'to' => $tel,
    'api_key' => 'd667d015',
    'api_secret' => 'pxa31BRJnV1FXp6h'
  ];
  
  if($mode != "debug"){
      $curl = curl_init($url . '?' . http_build_query($data));
      curl_setopt($curl, CURLOPT_RETURNTRANSFER, true);
      curl_setopt($curl, CURLOPT_POST, true);
      curl_setopt($curl, CURLOPT_HTTPHEADER, [
        'Content-Type: application/x-www-form-urlencoded'
      ]);
      $response = curl_exec($curl);
      curl_close($curl);
  }

}

//$return_object[0] = $msg;
//$return_object[1] = $sms_status_code;
//$return_object[2] = $response;

$to_return["db_data"] = [$msg, $sms_status_code];
$to_return["response"] = $response;

echo json_encode($to_return);

?>