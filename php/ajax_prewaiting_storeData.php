<?php
include "connect.php";

$data = json_decode(stripslashes($_POST['data']),true);


$date = $data[0];
$time = $data[1];
$pax = $data[2];
$name = $data[3];
$phone = $data[4];


$timestamp = time();

//Commented for testing Purpose
$sql = "INSERT INTO waiting_list_ver3 (time_created, dine_date, dine_time, pax, customer, phone) values ($timestamp, $date, $time, $pax, '$name', $phone)";
mysqli_query($connect, $sql);


$sql = "SELECT Id FROM waiting_list_ver3 ORDER BY Id DESC LIMIT 1";
$result = mysqli_query($connect, $sql);

//$fetchedData = mysqli_fetch_all($result, MYSQLI_ASSOC);
$fetchedData = [];
while ($row = $result->fetch_assoc()) {
    $fetchedData[] = $row;
}



mysqli_free_result($result); // Free result set


echo json_encode($fetchedData);

?>


