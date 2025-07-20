<?php
include "connect.php";

$data = json_decode(stripslashes($_POST['data']),true);


$date = $data[0];



$sql = "SELECT dine_time FROM waiting_list_ver3 WHERE dine_date = $date ORDER BY dine_time";
$result = mysqli_query($connect, $sql);

//$fetchedData = mysqli_fetch_all($result, MYSQLI_ASSOC);
$fetchedData = [];
while ($row = $result->fetch_assoc()) {
    $fetchedData[] = $row;
}




mysqli_free_result($result); // Free result set

//$returnMsg = "Success";
//$returnArray = array($returnMsg,$sql);
echo json_encode($fetchedData);

?>


