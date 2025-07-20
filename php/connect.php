<?php
/* Database credentials. Assuming you are running MySQL
server with default setting (user 'root' with no password) */
define('DB_SERVER', 'www.donkaslab.com');
define('DB_USERNAME', 'donkasla_admin');
define('DB_PASSWORD', 'OIvm;nyR=[GM');
define('DB_NAME', 'donkasla_pos');
 
/* Attempt to connect to MySQL database */
$connect = mysqli_connect(DB_SERVER, DB_USERNAME, DB_PASSWORD, DB_NAME);
 
// Check connection
if($connect === false){
    die("ERROR: Could not connect. " . mysqli_connect_error());
}
date_default_timezone_set('Asia/Kuala_Lumpur');
?>
