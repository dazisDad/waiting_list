<?php
include "connect.php";

$table_name = "waiting_list_ver3";

$data = json_decode(stripslashes($_POST['data']),true);

$alterType = $data[0];

$colName = $data[1];
$colVal = $data[2];


$pax_or_key = $data[3];

$timestamp = time();

if($alterType == "New"){
    $sql = "INSERT INTO $table_name (time_created, pax, $colName) values ($timestamp, $pax_or_key, '$colVal')";
}else{
    if($data[1]=="remarks"){
        if($data[2]=="No show"){
            $sql = "UPDATE $table_name SET time_cleared = $timestamp, remarks = 'No show' WHERE Id = $pax_or_key";
        }else{
            $sql = "UPDATE $table_name SET time_cleared = $timestamp WHERE Id = $pax_or_key";
        }
    }else{
        $sql = "UPDATE $table_name SET $colName = '$colVal' WHERE Id = $pax_or_key";
    }
}
    
mysqli_query($connect, $sql);

if($alterType == "New"){
    $sql = "SELECT * FROM $table_name ORDER BY Id DESC LIMIT 1";
    $result = mysqli_query($connect, $sql);
    //$fetchedData = mysqli_fetch_all($result, MYSQLI_ASSOC);
    $fetchedData = [];
    while ($row = $result->fetch_assoc()) {
        $fetchedData[] = $row;
    }

    mysqli_free_result($result); // Free result set
    //$tel = $fetchData[0]['phone'];
}



//$returnMsg = "Success";
//$returnArray = array($returnMsg,$sql);
echo json_encode($fetchedData);



?>


