<?php
// HTML 헤더 설정 (웹페이지 출력용)
header('Content-Type: text/html; charset=utf-8');

require_once 'db_config.php';

// Database connection settings
$connect_to = 'live'; // 'live' or 'preProd'
$db_key = 'waitlist';

try {
    // Get connection info using getDbInfo() function from db_config.php
    $db_data = getDbInfo();
    
    $db_server_address = $db_data[$connect_to]['db_server_address'];
    $db_username = $db_data[$connect_to]['db_username'];
    $db_password = $db_data[$connect_to]['db_password'];
    $db_name = $db_data[$connect_to]['db_names'][$db_key];

    // Create MySQL connection
    $mysqli = new mysqli($db_server_address, $db_username, $db_password, $db_name);
    
    // Check connection errors
    if ($mysqli->connect_errno) {
        throw new Exception('MySQL connection failed: ' . $mysqli->connect_error);
    }
    
    // Set UTF-8 charset
    $mysqli->set_charset('utf8mb4');
    
    echo "--- Database Connection Successful ---<br>";
    echo "Server: {$db_server_address}<br>";
    echo "Database: {$db_name}<br>";
    echo "Environment: {$connect_to}<br>";
    echo "-----------------------------<br><br>";

} catch (Exception $e) {
    die('Database connection error: ' . $e->getMessage() . "<br>");
}

// 1. Get total number of Prepared Statement prepare operations
$prepare_result = $mysqli->query("SHOW GLOBAL STATUS LIKE 'Com_stmt_prepare'");
$prepare_row = $prepare_result->fetch_assoc();
$prepare_count = (int) $prepare_row['Value'];
$prepare_result->free(); // Free memory

// 2. Get total number of Prepared Statement close operations
$close_result = $mysqli->query("SHOW GLOBAL STATUS LIKE 'Com_stmt_close'");
$close_row = $close_result->fetch_assoc();
$close_count = (int) $close_row['Value'];
$close_result->free();

// 3. Get maximum allowed Statement count (Max Limit)
$max_result = $mysqli->query("SHOW VARIABLES LIKE 'max_prepared_stmt_count'");
$max_row = $max_result->fetch_assoc();
$max_limit = (int) $max_row['Value'];
$max_result->free();

// --- Calculations ---

// A. Calculate estimated number of leaked Prepared Statements
$leak_estimate = $prepare_count - $close_count;

// B. Calculate remaining slots until error occurs
$remaining_slots = $max_limit - $leak_estimate;

// --- Output Results ---

echo "<h2>--- Prepared Statement Usage Status ---</h2>";
echo "1. Total Prepare Count: <strong>" . number_format($prepare_count) . "</strong><br>";
echo "2. Total Close Count: <strong>" . number_format($close_count) . "</strong><br>";
echo "3. Maximum Allowed Count (MAX): <strong>" . number_format($max_limit) . "</strong><br>";
echo "------------------------------------<br>";
echo "🔥 <strong style='color: red;'>Estimated Leaked Statements: " . number_format($leak_estimate) . "</strong><br>";

// 남은 슬롯이 위험 수준(예: 0보다 작거나 낮음)이면 경고 표시
if ($remaining_slots <= 1000) {
    echo "🚨 <strong style='color: red;'>Remaining Statement Slots: " . number_format($remaining_slots) . " (WARNING)</strong><br>";
} else {
    echo "✅ <strong style='color: green;'>Remaining Statement Slots: " . number_format($remaining_slots) . "</strong><br>";
}

// --- Connection Cleanup ---
echo "<br><h3>--- Connection Closed ---</h3>";
$mysqli->close();
echo "MySQL connection has been closed successfully.<br>";

?>