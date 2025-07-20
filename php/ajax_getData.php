<?php
include "connect.php";

$table_name = "waiting_list_ver3";

/*
$db_table_names = ['db_menu','settings_general','settings_menu','settings_option_condition'];
$order_by = ['menu_id','Id','menu_id','menu_id'];

for($i=0; $i<count($db_table_names); $i++){
    $sql = "SELECT * FROM ".$db_table_names[$i]." WHERE status = 'Active' ORDER BY ".$order_by[$i];
    $result = mysqli_query($connect, $sql);
    $returned[$i] = mysqli_fetch_all($result, MYSQLI_ASSOC);
    mysqli_free_result($result); // Free result set
}
*/
$today = date("ymd");
$sql = "SELECT * FROM $table_name WHERE time_cleared IS NULL AND (dine_date IS NULL OR dine_date = $today) ORDER BY dine_time, Id";

$result = mysqli_query($connect, $sql);


//alternative to mysqli_fetch_all
//$returned = mysqli_fetch_all($result, MYSQLI_ASSOC);
$returned = [];
while ($row = $result->fetch_assoc()) {
    $returned[] = $row;
}



mysqli_free_result($result); // Free result set

mysqli_close($connect);
echo json_encode($returned, JSON_NUMERIC_CHECK);

/* NOTE: If mysqli_fetch_all() results an error, "call to undefined function"
cpanel > PHP Selector > Extension > Uncheck the 'mysqli' extension and check both 'mysqlind' and 'nd_mysqli'
*/


?>


