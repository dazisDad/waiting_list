<?php
// Version: 0.700

// Global flag to control prepared statement usage
// Set to false to use regular statements (avoids max_prepared_stmt_count limit)
$isPreparedStmt = false;

// Convenience helper to build DB config from environment (or .env)
function get_db_config() {
    // Prefer values loaded into $loaded_env (from .env) but fall back to getenv().
    global $loaded_env;
    $host = $loaded_env['DB_SERVER_ADDRESS'] ?? getenv('DB_SERVER_ADDRESS') ?: '127.0.0.1';
    $user = $loaded_env['DB_USERNAME'] ?? getenv('DB_USERNAME') ?: '';
    $pass = $loaded_env['DB_PASSWORD'] ?? getenv('DB_PASSWORD') ?: '';
    $name = $loaded_env['DB_NAME'] ?? getenv('DB_NAME') ?: '';

    return [
        'host' => $host,
        'user' => $user,
        'pass' => $pass,
        'name' => $name,
    ];
}

/**
 * get_booking_list
 * Connect to the database using DB_* environment variables and return all rows
 * from the `booking_list` table as an array of associative arrays.
 *
 * Throws Exception on configuration or database errors.
 *
 * Required environment variables: DB_USERNAME, DB_NAME. Optional: DB_SERVER_ADDRESS, DB_PASSWORD.
 */
function get_booking_list($store_id, $isToday = true, $dateSearch = null) {
    $cfg = get_db_config();
    if ($cfg['user'] === '' || $cfg['name'] === '') {
        throw new Exception('Database configuration incomplete: DB_USERNAME and DB_NAME are required');
    }

    // Connect using mysqli (no explicit port/charset handling here)
    $mysqli = new mysqli($cfg['host'], $cfg['user'], $cfg['pass'], $cfg['name']);
    if ($mysqli->connect_errno) {
        throw new Exception('DB connect error: ' . $mysqli->connect_error);
    }

        // Only return rows that have not been cleared (time_cleared IS NULL)
        // Ensure store_id is quoted so string store IDs (e.g. 'DL_01') aren't treated as column names
        $sql = "SELECT * FROM booking_list WHERE time_cleared IS NULL AND store_id = '" . $mysqli->real_escape_string($store_id) . "'";

        // Date filtering on time_created
        // If $isToday is true (default), restrict to today's rows. If false and $dateSearch given,
        // restrict to that date (expects YYYY-MM-DD). Otherwise no additional date filter.
        if ($isToday) {
            $sql .= " AND DATE(time_created) = CURDATE()";
        } elseif ($dateSearch !== null) {
            // Validate dateSearch format YYYY-MM-DD to avoid accidental injection or bad values
            if (preg_match('/^\d{4}-\d{2}-\d{2}$/', $dateSearch)) {
                $sql .= " AND DATE(time_created) = '" . $mysqli->real_escape_string($dateSearch) . "'";
            } else {
                // If invalid format, close connection and throw
                $mysqli->close();
                throw new Exception('Invalid dateSearch format, expected YYYY-MM-DD');
            }
        }

        $sql .= " ORDER BY booking_list_id ASC";
    $result = $mysqli->query($sql);
    if ($result === false) {
        $err = $mysqli->error;
        $mysqli->close();
        throw new Exception('Query error: ' . $err);
    }

    $rows = $result->fetch_all(MYSQLI_ASSOC);
    $result->free();
    $mysqli->close();
    return $rows;
}

/**
 * add_to_history_chat
 * Insert a new record into the history_chat table with current datetime.
 * 
 * @param int $booking_list_id - The booking list ID to associate the chat with
 * @param string $qna - The question/answer text
 * @param int $qna_id - The ID of the question/answer from ask_question_list
 * @return bool - Returns true on success
 * @throws Exception on database errors
 */
function add_to_history_chat($booking_list_id, $qna, $qna_id) {
    global $isPreparedStmt;
    
    $cfg = get_db_config();
    if ($cfg['user'] === '' || $cfg['name'] === '') {
        throw new Exception('Database configuration incomplete: DB_USERNAME and DB_NAME are required');
    }

    $mysqli = new mysqli($cfg['host'], $cfg['user'], $cfg['pass'], $cfg['name']);
    if ($mysqli->connect_errno) {
        throw new Exception('DB connect error: ' . $mysqli->connect_error);
    }

    // Get current datetime in MySQL format
    $current_datetime = date('Y-m-d H:i:s');

    if ($isPreparedStmt) {
        $sql = 'INSERT INTO history_chat (booking_list_id, dateTime, qna, qna_id) VALUES (?, ?, ?, ?)';
        $stmt = $mysqli->prepare($sql);
        if ($stmt === false) {
            $err = $mysqli->error;
            $mysqli->close();
            throw new Exception('Prepare failed for history_chat: ' . $err);
        }

        if (!$stmt->bind_param('issi', $booking_list_id, $current_datetime, $qna, $qna_id)) {
            $err = $stmt->error;
            $stmt->close();
            $mysqli->close();
            throw new Exception('Bind failed for history_chat: ' . $err);
        }

        if (!$stmt->execute()) {
            $err = $stmt->error;
            $stmt->close();
            $mysqli->close();
            throw new Exception('Execute failed for history_chat: ' . $err);
        }

        $stmt->close();
    } else {
        $booking_list_id_safe = intval($booking_list_id);
        $current_datetime_esc = $mysqli->real_escape_string($current_datetime);
        $qna_esc = $mysqli->real_escape_string($qna);
        $qna_id_safe = intval($qna_id);
        
        $sql = "INSERT INTO history_chat (booking_list_id, dateTime, qna, qna_id) VALUES ({$booking_list_id_safe}, '{$current_datetime_esc}', '{$qna_esc}', {$qna_id_safe})";
        
        if (!$mysqli->query($sql)) {
            $err = $mysqli->error;
            $mysqli->close();
            throw new Exception('Query failed for history_chat: ' . $err);
        }
    }

    $mysqli->close();
    return true;
}

/**
 * validatePax
 * Validate if the pax value is within the allowed limit for a specific store.
 * Queries the configuration table for the store's pax_limit and compares it with the input pax.
 * 
 * @param string $store_id - The store identifier
 * @param int $pax - The number of people to validate
 * @return bool - Returns true if pax is within limit, false otherwise
 * @throws Exception on database errors
 */
function validatePax($store_id, $pax) {
    global $isPreparedStmt;
    
    $cfg = get_db_config();
    if ($cfg['user'] === '' || $cfg['name'] === '') {
        throw new Exception('Database configuration incomplete: DB_USERNAME and DB_NAME are required');
    }

    $mysqli = new mysqli($cfg['host'], $cfg['user'], $cfg['pass'], $cfg['name']);
    if ($mysqli->connect_errno) {
        throw new Exception('DB connect error: ' . $mysqli->connect_error);
    }

    if ($isPreparedStmt) {
        $sql = "SELECT pax_limit FROM configuration WHERE store_id = ?";
        $stmt = $mysqli->prepare($sql);
        if ($stmt === false) {
            $err = $mysqli->error;
            $mysqli->close();
            throw new Exception('Prepare failed: ' . $err);
        }

        $store_id_str = strval($store_id);
        if (!$stmt->bind_param('s', $store_id_str)) {
            $err = $stmt->error;
            $stmt->close();
            $mysqli->close();
            throw new Exception('Bind failed: ' . $err);
        }

        if (!$stmt->execute()) {
            $err = $stmt->error;
            $stmt->close();
            $mysqli->close();
            throw new Exception('Execute failed: ' . $err);
        }

        $result = $stmt->get_result();
        if ($result === false) {
            $err = $stmt->error;
            $stmt->close();
            $mysqli->close();
            throw new Exception('Getting result failed: ' . $err);
        }

        $row = $result->fetch_assoc();
        $stmt->close();
    } else {
        $store_id_escaped = $mysqli->real_escape_string(strval($store_id));
        $sql = "SELECT pax_limit FROM configuration WHERE store_id = '" . $store_id_escaped . "'";
        $result = $mysqli->query($sql);
        if ($result === false) {
            $err = $mysqli->error;
            $mysqli->close();
            throw new Exception('Query failed: ' . $err);
        }
        $row = $result->fetch_assoc();
        $result->free();
    }
    
    $mysqli->close();

    // If no configuration found for store_id, return false
    if ($row === null) {
        return false;
    }

    $pax_limit = intval($row['pax_limit']);
    $pax_int = intval($pax);

    // Return true if pax is within limit, false if it exceeds
    return $pax_int <= $pax_limit;
}

/**
 * generate_booking_number
 * Build a booking number by prefixing the pax value to the last two digits
 * of the nextId. If nextId is null, it will be treated as 1.
 * Examples:
 *  generate_booking_number(3, 1)  => 301
 *  generate_booking_number(2, 15) => 215
 *  generate_booking_number(11,23) => 1123
 */
function generate_booking_number($pax, $nextId) {
    // Normalize inputs
    $paxInt = intval($pax);
    // Treat any pax >= 10 as 9 per request
    if ($paxInt >= 10) {
        $paxInt = 9;
    }
    $paxStr = strval($paxInt);
    $next = $nextId === null ? 1 : intval($nextId);

    // Take last two digits of next, zero-pad to 2 characters
    $suffix = str_pad(strval($next % 100), 2, '0', STR_PAD_LEFT);

    // Concatenate and return as integer
    return intval($paxStr . $suffix);
}

/**
 * insert_to_booking_list
 * Insert a booking row into booking_list table. Expects $inputDataSet to contain:
 *   booking_from, subscriber_id, customer_name, customer_phone, pax
 * Automatically sets time_created to the current server timestamp (YYYY-MM-DD HH:MM:SS).
 * Returns the inserted row ID (int) on success.
 * Throws Exception on missing data, configuration, connection, or query errors.
 */
function insert_to_booking_list(array $inputDataSet) {
    global $isPreparedStmt;
    
    $required = ['store_id', 'booking_from', 'subscriber_id', 'customer_name', 'customer_phone', 'pax'];
    foreach ($required as $k) {
        if (!array_key_exists($k, $inputDataSet)) {
            throw new Exception('Missing required input: ' . $k);
        }
    }

    $cfg = get_db_config();
    if ($cfg['user'] === '' || $cfg['name'] === '') {
        throw new Exception('Database configuration incomplete: DB_USERNAME and DB_NAME are required');
    }

    $mysqli = new mysqli($cfg['host'], $cfg['user'], $cfg['pass'], $cfg['name']);
    if ($mysqli->connect_errno) {
        throw new Exception('DB connect error: ' . $mysqli->connect_error);
    }

    // Normalize params
    $store_id = strval($inputDataSet['store_id']);
    $booking_from = strval($inputDataSet['booking_from']);
    $subscriber_id = intval($inputDataSet['subscriber_id']);
    $customer_name = strval($inputDataSet['customer_name']);
    $customer_phone = strval($inputDataSet['customer_phone']);
    $pax = intval($inputDataSet['pax']);
    $time_created = date('Y-m-d H:i:s');
    $dine_dateTime = date('Y-m-d H:i:s');
    $status = 'Waiting';
    $q_level = 100;

    if ($isPreparedStmt) {
        $sql = 'INSERT INTO booking_list (store_id, booking_from, subscriber_id, customer_name, customer_phone, pax, time_created, dine_dateTime, status, q_level) VALUES (?,?,?,?,?,?,?,?,?,?)';
        $stmt = $mysqli->prepare($sql);
        if ($stmt === false) {
            $err = $mysqli->error;
            $mysqli->close();
            throw new Exception('Prepare failed: ' . $err);
        }

        if (!$stmt->bind_param('ssississsi', $store_id, $booking_from, $subscriber_id, $customer_name, $customer_phone, $pax, $time_created, $dine_dateTime, $status, $q_level)) {
            $err = $stmt->error;
            $stmt->close();
            $mysqli->close();
            throw new Exception('Bind failed: ' . $err);
        }

        if (!$stmt->execute()) {
            $err = $stmt->error;
            $stmt->close();
            $mysqli->close();
            throw new Exception('Execute failed: ' . $err);
        }

        $insertId = $mysqli->insert_id;
        $stmt->close();
    } else {
        $store_id_esc = $mysqli->real_escape_string($store_id);
        $booking_from_esc = $mysqli->real_escape_string($booking_from);
        $customer_name_esc = $mysqli->real_escape_string($customer_name);
        $customer_phone_esc = $mysqli->real_escape_string($customer_phone);
        $time_created_esc = $mysqli->real_escape_string($time_created);
        $dine_dateTime_esc = $mysqli->real_escape_string($dine_dateTime);
        $status_esc = $mysqli->real_escape_string($status);
        
        $sql = "INSERT INTO booking_list (store_id, booking_from, subscriber_id, customer_name, customer_phone, pax, time_created, dine_dateTime, status, q_level) VALUES ('{$store_id_esc}','{$booking_from_esc}',{$subscriber_id},'{$customer_name_esc}','{$customer_phone_esc}',{$pax},'{$time_created_esc}','{$dine_dateTime_esc}','{$status_esc}',{$q_level})";
        
        if (!$mysqli->query($sql)) {
            $err = $mysqli->error;
            $mysqli->close();
            throw new Exception('Query failed: ' . $err);
        }
        
        $insertId = $mysqli->insert_id;
    }

    // Insert into history_chat table
    $qna = 'Waiting';
    $qna_id = 8; // Default id for 'Waiting'
    
    if ($isPreparedStmt) {
        $sql_history = 'INSERT INTO history_chat (booking_list_id, dateTime, qna, qna_id) VALUES (?,?,?,?)';
        $stmt_history = $mysqli->prepare($sql_history);
        if ($stmt_history === false) {
            $err = $mysqli->error;
            $mysqli->close();
            throw new Exception('Prepare failed for history_chat: ' . $err);
        }

        if (!$stmt_history->bind_param('issi', $insertId, $dine_dateTime, $qna, $qna_id)) {
            $err = $stmt_history->error;
            $stmt_history->close();
            $mysqli->close();
            throw new Exception('Bind failed for history_chat: ' . $err);
        }

        if (!$stmt_history->execute()) {
            $err = $stmt_history->error;
            $stmt_history->close();
            $mysqli->close();
            throw new Exception('Execute failed for history_chat: ' . $err);
        }

        $stmt_history->close();
    } else {
        $dine_dateTime_esc = $mysqli->real_escape_string($dine_dateTime);
        $qna_esc = $mysqli->real_escape_string($qna);
        $qna_id_safe = intval($qna_id);
        $sql_history = "INSERT INTO history_chat (booking_list_id, dateTime, qna, qna_id) VALUES ({$insertId},'{$dine_dateTime_esc}','{$qna_esc}',{$qna_id_safe})";
        
        if (!$mysqli->query($sql_history)) {
            $err = $mysqli->error;
            $mysqli->close();
            throw new Exception('Query failed for history_chat: ' . $err);
        }
    }

    $mysqli->close();
    return intval($insertId);
}

function insert_to_booking_list_from_local(array $inputDataSet) {
    global $isPreparedStmt;
    
    $required = ['store_id', 'booking_from', 'customer_name', 'customer_phone', 'pax', 'time_created', 'dine_dateTime', 'status', 'q_level'];
    foreach ($required as $k) {
        if (!array_key_exists($k, $inputDataSet)) {
            throw new Exception('Missing required input: ' . $k);
        }
    }

    $cfg = get_db_config();
    if ($cfg['user'] === '' || $cfg['name'] === '') {
        throw new Exception('Database configuration incomplete: DB_USERNAME and DB_NAME are required');
    }

    $mysqli = new mysqli($cfg['host'], $cfg['user'], $cfg['pass'], $cfg['name']);
    if ($mysqli->connect_errno) {
        throw new Exception('DB connect error: ' . $mysqli->connect_error);
    }

    // Normalize params
    $store_id = strval($inputDataSet['store_id']);
    $booking_from = strval($inputDataSet['booking_from']);
    $subscriber_id = isset($inputDataSet['subscriber_id']) ? intval($inputDataSet['subscriber_id']) : 0;
    $customer_name = strval($inputDataSet['customer_name']);
    $customer_phone = strval($inputDataSet['customer_phone']);
    $pax = intval($inputDataSet['pax']);
    $time_created = strval($inputDataSet['time_created']);
    $dine_dateTime = strval($inputDataSet['dine_dateTime']);
    $status = strval($inputDataSet['status']);
    $q_level = intval($inputDataSet['q_level']);
    
    // Badge fields - optional, default to NULL
    $badge1 = isset($inputDataSet['badge1']) && $inputDataSet['badge1'] !== '' ? strval($inputDataSet['badge1']) : null;
    $badge2 = isset($inputDataSet['badge2']) && $inputDataSet['badge2'] !== '' ? strval($inputDataSet['badge2']) : null;
    $badge3 = isset($inputDataSet['badge3']) && $inputDataSet['badge3'] !== '' ? strval($inputDataSet['badge3']) : null;
    
    // ws_last_interaction field - optional, default to NULL
    $ws_last_interaction = isset($inputDataSet['ws_last_interaction']) && $inputDataSet['ws_last_interaction'] !== '' ? strval($inputDataSet['ws_last_interaction']) : null;

    if ($isPreparedStmt) {
        $sql = 'INSERT INTO booking_list (store_id, booking_from, subscriber_id, customer_name, customer_phone, pax, time_created, dine_dateTime, status, q_level, badge1, badge2, badge3, ws_last_interaction) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?)';
        $stmt = $mysqli->prepare($sql);
        if ($stmt === false) {
            $err = $mysqli->error;
            $mysqli->close();
            throw new Exception('Prepare failed: ' . $err);
        }

        if (!$stmt->bind_param('ssississsissss', $store_id, $booking_from, $subscriber_id, $customer_name, $customer_phone, $pax, $time_created, $dine_dateTime, $status, $q_level, $badge1, $badge2, $badge3, $ws_last_interaction)) {
            $err = $stmt->error;
            $stmt->close();
            $mysqli->close();
            throw new Exception('Bind failed: ' . $err);
        }

        if (!$stmt->execute()) {
            $err = $stmt->error;
            $stmt->close();
            $mysqli->close();
            throw new Exception('Execute failed: ' . $err);
        }

        $insertId = $mysqli->insert_id;
        $stmt->close();
    } else {
        $store_id_esc = $mysqli->real_escape_string($store_id);
        $booking_from_esc = $mysqli->real_escape_string($booking_from);
        $customer_name_esc = $mysqli->real_escape_string($customer_name);
        $customer_phone_esc = $mysqli->real_escape_string($customer_phone);
        $time_created_esc = $mysqli->real_escape_string($time_created);
        $dine_dateTime_esc = $mysqli->real_escape_string($dine_dateTime);
        $status_esc = $mysqli->real_escape_string($status);
        
        // Handle badge values - NULL if not set
        $badge1_sql = $badge1 !== null ? "'" . $mysqli->real_escape_string($badge1) . "'" : 'NULL';
        $badge2_sql = $badge2 !== null ? "'" . $mysqli->real_escape_string($badge2) . "'" : 'NULL';
        $badge3_sql = $badge3 !== null ? "'" . $mysqli->real_escape_string($badge3) . "'" : 'NULL';
        
        // Handle ws_last_interaction value - NULL if not set
        $ws_last_interaction_sql = $ws_last_interaction !== null ? "'" . $mysqli->real_escape_string($ws_last_interaction) . "'" : 'NULL';
        
        $sql = "INSERT INTO booking_list (store_id, booking_from, subscriber_id, customer_name, customer_phone, pax, time_created, dine_dateTime, status, q_level, badge1, badge2, badge3, ws_last_interaction) VALUES ('{$store_id_esc}','{$booking_from_esc}',{$subscriber_id},'{$customer_name_esc}','{$customer_phone_esc}',{$pax},'{$time_created_esc}','{$dine_dateTime_esc}','{$status_esc}',{$q_level},{$badge1_sql},{$badge2_sql},{$badge3_sql},{$ws_last_interaction_sql})";
        
        if (!$mysqli->query($sql)) {
            $err = $mysqli->error;
            $mysqli->close();
            throw new Exception('Query failed: ' . $err);
        }
        
        $insertId = $mysqli->insert_id;
    }

    /* // WEB 예약의 경우 history_chat 테이블에 Waiting 삽입하지 않음
    // Insert into history_chat table
    $qna = 'Waiting';
    $qna_id = 8; // Default id for 'Waiting'
    
    if ($isPreparedStmt) {
        $sql_history = 'INSERT INTO history_chat (booking_list_id, dateTime, qna, qna_id) VALUES (?,?,?,?)';
        $stmt_history = $mysqli->prepare($sql_history);
        if ($stmt_history === false) {
            $err = $mysqli->error;
            $mysqli->close();
            throw new Exception('Prepare failed for history_chat: ' . $err);
        }

        if (!$stmt_history->bind_param('issi', $insertId, $dine_dateTime, $qna, $qna_id)) {
            $err = $stmt_history->error;
            $stmt_history->close();
            $mysqli->close();
            throw new Exception('Bind failed for history_chat: ' . $err);
        }

        if (!$stmt_history->execute()) {
            $err = $stmt_history->error;
            $stmt_history->close();
            $mysqli->close();
            throw new Exception('Execute failed for history_chat: ' . $err);
        }

        $stmt_history->close();
    } else {
        $dine_dateTime_esc = $mysqli->real_escape_string($dine_dateTime);
        $qna_esc = $mysqli->real_escape_string($qna);
        $qna_id_safe = intval($qna_id);
        $sql_history = "INSERT INTO history_chat (booking_list_id, dateTime, qna, qna_id) VALUES ({$insertId},'{$dine_dateTime_esc}','{$qna_esc}',{$qna_id_safe})";
        
        if (!$mysqli->query($sql_history)) {
            $err = $mysqli->error;
            $mysqli->close();
            throw new Exception('Query failed for history_chat: ' . $err);
        }
    }
    */

    $mysqli->close();
    return intval($insertId);
}

/**
 * update_booking_list
 * Update a single column for a booking row identified by booking_list_id.
 * Parameters:
 *  - $booking_list_id (int)
 *  - $key (string) : column name to update (must be in allowed list)
 *  - $value (mixed) : new value (null allowed)
 *
 * Returns number of affected rows (int). Throws Exception on error.
 */
function update_booking_list($booking_list_id, $key, $value) {
    global $isPreparedStmt;
    
    $id = intval($booking_list_id);
    if ($id <= 0) {
        throw new Exception('Invalid booking_list_id');
    }

    // Whitelist of allowed updatable columns to avoid SQL injection via column name
    $allowed = [
        'booking_from','subscriber_id','customer_name','customer_phone','pax',
        'time_cleared','booking_number','booking_status','ws_last_interaction','status'
    ];
    if (!in_array($key, $allowed, true)) {
        throw new Exception('Invalid or disallowed column: ' . $key);
    }

    $cfg = get_db_config();
    if ($cfg['user'] === '' || $cfg['name'] === '') {
        throw new Exception('Database configuration incomplete: DB_USERNAME and DB_NAME are required');
    }

    $mysqli = new mysqli($cfg['host'], $cfg['user'], $cfg['pass'], $cfg['name']);
    if ($mysqli->connect_errno) {
        throw new Exception('DB connect error: ' . $mysqli->connect_error);
    }

    $intCols = ['subscriber_id','pax'];
    $key_escaped = $mysqli->real_escape_string($key);

    if ($isPreparedStmt) {
        // Build SQL. If value is null, set column = NULL directly.
        if ($value === null) {
            $sql = "UPDATE booking_list SET `{$key_escaped}` = NULL WHERE booking_list_id = ?";
            $stmt = $mysqli->prepare($sql);
            if ($stmt === false) {
                $err = $mysqli->error;
                $mysqli->close();
                throw new Exception('Prepare failed: ' . $err);
            }
            if (!$stmt->bind_param('i', $id)) {
                $err = $stmt->error;
                $stmt->close();
                $mysqli->close();
                throw new Exception('Bind failed: ' . $err);
            }
        } else {
            // Determine bind type for the value
            $type = in_array($key, $intCols, true) ? 'i' : 's';

            $sql = "UPDATE booking_list SET `{$key_escaped}` = ? WHERE booking_list_id = ?";
            $stmt = $mysqli->prepare($sql);
            if ($stmt === false) {
                $err = $mysqli->error;
                $mysqli->close();
                throw new Exception('Prepare failed: ' . $err);
            }

            // Ensure value cast for binding
            if ($type === 'i') {
                $val = intval($value);
                if (!$stmt->bind_param('ii', $val, $id)) {
                    $err = $stmt->error;
                    $stmt->close();
                    $mysqli->close();
                    throw new Exception('Bind failed: ' . $err);
                }
            } else {
                $val = strval($value);
                if (!$stmt->bind_param('si', $val, $id)) {
                    $err = $stmt->error;
                    $stmt->close();
                    $mysqli->close();
                    throw new Exception('Bind failed: ' . $err);
                }
            }
        }

        if (!$stmt->execute()) {
            $err = $stmt->error;
            $stmt->close();
            $mysqli->close();
            throw new Exception('Execute failed: ' . $err);
        }

        $affected = $stmt->affected_rows;
        $stmt->close();
    } else {
        // Regular statement
        if ($value === null) {
            $sql = "UPDATE booking_list SET `{$key_escaped}` = NULL WHERE booking_list_id = {$id}";
        } else {
            if (in_array($key, $intCols, true)) {
                $val = intval($value);
                $sql = "UPDATE booking_list SET `{$key_escaped}` = {$val} WHERE booking_list_id = {$id}";
            } else {
                $val_escaped = $mysqli->real_escape_string(strval($value));
                $sql = "UPDATE booking_list SET `{$key_escaped}` = '{$val_escaped}' WHERE booking_list_id = {$id}";
            }
        }
        
        if (!$mysqli->query($sql)) {
            $err = $mysqli->error;
            $mysqli->close();
            throw new Exception('Query failed: ' . $err);
        }
        
        $affected = $mysqli->affected_rows;
    }
    
    $mysqli->close();
    return intval($affected);
}

/**
 * get_booking_detail
 * Retrieve booking rows by a given key/value. Behaves similarly to get_booking_list()
 * but allows filtering by arbitrary column (whitelisted) and optional "today" filter.
 *
 * Rules:
 * - If key is 'booking_list_id', the function searches by id (no time_cleared filter applied by default).
 * - For other keys, the query will include `time_cleared IS NULL` to return only active rows.
 * - If isToday === true, the query will additionally filter rows whose DATE(time_created) = CURDATE().
 *
 * Returns an array of associative rows (may be empty). Throws Exception on errors.
 */
function get_booking_detail($key, $value, $isToday = null) {
    global $isPreparedStmt;
    
    // Whitelist allowed searchable columns to avoid injection via column name
    $allowed = [
        'booking_list_id','booking_from','subscriber_id','customer_name','customer_phone','pax','booking_number'
    ];
    if (!in_array($key, $allowed, true)) {
        throw new Exception('Invalid search key: ' . $key);
    }

    $cfg = get_db_config();
    if ($cfg['user'] === '' || $cfg['name'] === '') {
        throw new Exception('Database configuration incomplete: DB_USERNAME and DB_NAME are required');
    }

    $mysqli = new mysqli($cfg['host'], $cfg['user'], $cfg['pass'], $cfg['name']);
    if ($mysqli->connect_errno) {
        throw new Exception('DB connect error: ' . $mysqli->connect_error);
    }

    // Build base SQL depending on whether searching by id
    $col = '`' . $mysqli->real_escape_string($key) . '`';
    $intCols = ['subscriber_id','pax','booking_list_id'];
    $type = in_array($key, $intCols, true) ? 'i' : 's';

    if ($isPreparedStmt) {
        $sql = "SELECT * FROM booking_list WHERE " . $col . " = ?";

        // For non-id searches, only include non-cleared rows
        if ($key !== 'booking_list_id') {
            $sql .= ' AND time_cleared IS NULL';
        }

        // If isToday is truthy, filter to today's time_created (DATE equality)
        if ($isToday) {
            $sql .= ' AND DATE(time_created) = CURDATE()';
        }

        // Order by booking_list_id DESC to get most recent first, limit to 1 row
        $sql .= ' ORDER BY booking_list_id DESC LIMIT 1';

        $stmt = $mysqli->prepare($sql);
        if ($stmt === false) {
            $err = $mysqli->error;
            $mysqli->close();
            throw new Exception('Prepare failed: ' . $err);
        }

        if ($type === 'i') {
            $val = intval($value);
            if (!$stmt->bind_param('i', $val)) {
                $err = $stmt->error;
                $stmt->close();
                $mysqli->close();
                throw new Exception('Bind failed: ' . $err);
            }
        } else {
            $val = strval($value);
            if (!$stmt->bind_param('s', $val)) {
                $err = $stmt->error;
                $stmt->close();
                $mysqli->close();
                throw new Exception('Bind failed: ' . $err);
            }
        }

        if (!$stmt->execute()) {
            $err = $stmt->error;
            $stmt->close();
            $mysqli->close();
            throw new Exception('Execute failed: ' . $err);
        }

    $result = $stmt->get_result();
    if ($result === false) {
        $err = $stmt->error;
        $stmt->close();
        $mysqli->close();
        throw new Exception('Getting result failed: ' . $err);
    }

    $rows = $result->fetch_all(MYSQLI_ASSOC);
    $result->free();
    $stmt->close();
    } else {
        // Regular statement
        if ($type === 'i') {
            $val = intval($value);
            $sql = "SELECT * FROM booking_list WHERE " . $col . " = {$val}";
        } else {
            $val_escaped = $mysqli->real_escape_string(strval($value));
            $sql = "SELECT * FROM booking_list WHERE " . $col . " = '{$val_escaped}'";
        }

        // For non-id searches, only include non-cleared rows
        if ($key !== 'booking_list_id') {
            $sql .= ' AND time_cleared IS NULL';
        }

        // If isToday is truthy, filter to today's time_created (DATE equality)
        if ($isToday) {
            $sql .= ' AND DATE(time_created) = CURDATE()';
        }

        // Order by booking_list_id DESC to get most recent first, limit to 1 row
        $sql .= ' ORDER BY booking_list_id DESC LIMIT 1';

        $result = $mysqli->query($sql);
        if ($result === false) {
            $err = $mysqli->error;
            $mysqli->close();
            throw new Exception('Query failed: ' . $err);
        }

        $rows = $result->fetch_all(MYSQLI_ASSOC);
        $result->free();
    }
    
    $mysqli->close();
    return $rows;
}


/**
 * calculate_booking_ahead
 * Given an array of booking rows ($inputData) and a booking_list_id,
 * return the index (0-based) of the element that has that booking_list_id.
 * Returns -1 if not found.
 *
 * Example:
 *   calculate_booking_ahead($rows, 34) => 1
 */
function calculate_booking_ahead(array $inputData, $booking_list_id) {
    $target = strval($booking_list_id);
    foreach ($inputData as $idx => $row) {
        if (is_array($row) && array_key_exists('booking_list_id', $row)) {
            if (strval($row['booking_list_id']) === $target) {
                return intval($idx);
            }
        }
    }
    return -1;
}

function estimate_waiting_time($booking_ahead) {
    // Simple estimation: 1 min per booking ahead
    $estimate = $booking_ahead * 3; // minutes
    return strval($estimate) . 'min';
}

function is_booking_loop($booking_ahead) {
    return $booking_ahead > 0 ? 1 : 0;
}



/**
 * change_pax
 * Handle changing pax for a booking.
 * Params:
 *   - $booking_list_id (int)
 *   - $new_pax (int)
 * Returns an associative array (JSON-like) with keys:
 *   - success (bool), false_reason (string), is_booking_loop (int), rows_affected (optional)
 */
function change_pax($booking_list_id, $new_pax) {
    $id = intval($booking_list_id);

    // Retrieve existing booking
    $retrieved = get_booking_detail('booking_list_id', $id);
    if (count($retrieved) === 0) {
        return [
            'success' => false,
            'false_reason' => 'not_found',
            'is_booking_loop' => 1
        ];
    }

    $pax_current = intval($retrieved[0]['pax'] ?? 0);
    $pax_new = intval($new_pax);

    // Read allowed pax limit from env (or default to 10)
    $allowedPaxLimit = 10;

    // If pax is unchanged OR pax_new exceeds allowed limit, change is not allowed
    $isChangePaxAllowed = !($pax_current === $pax_new || $pax_new > $allowedPaxLimit);
    // Reject zero pax explicitly
    if ($pax_new === 0) {
        return [
            'success' => false,
            'false_reason' => 'Your number of pax is invalid. Please enter a valid number of pax.',
            'is_booking_loop' => 1
        ];
    }
    if (!$isChangePaxAllowed) {
        $reason = ($pax_current === $pax_new) ? 'You have entered the same pax number. We will keep it for your booking.' : 'The number of pax exceeds our seating capacity. One of our staff will call for confirmation. Please hold.';
        return [
            'success' => false,
            'false_reason' => $reason,
            'is_booking_loop' => 1
        ];
    }

    // Perform DB update
    try {
        $affected = update_booking_list($id, 'pax', $pax_new);
        return [
            'success' => true,
            'false_reason' => '',
            'is_booking_loop' => 1
        ];
    } catch (Exception $e) {
        return [
            'success' => false,
            'false_reason' => 'Database update error. Please contact staff for assistance.',
            'error_message' => $e->getMessage(),
            'is_booking_loop' => 1
        ];
    }
}


/**
 * cancel_booking
 * Cancel a booking by setting time_cleared to current timestamp.
 * Params:
 *   - $booking_list_id (int)
 * Returns associative array response similar to change_pax()
 */
function cancel_booking($booking_list_id) {
    $id = intval($booking_list_id);
    if ($id <= 0) {
        return [
            'success' => false,
            'false_reason' => 'invalid_booking_list_id',
            'is_booking_loop' => 0
        ];
    }

    // Ensure booking exists
    $retrieved = get_booking_detail('booking_list_id', $id);
    if (count($retrieved) === 0) {
        return [
            'success' => false,
            'false_reason' => 'not_found',
            'is_booking_loop' => 0
        ];
    }

    // If already cleared, return meaningful response
    if (!empty($retrieved[0]['time_cleared'])) {
        return [
            'success' => false,
            'false_reason' => 'Your waitlist booking has already been cleared.',
            'is_booking_loop' => 0
        ];
    }

    // Perform DB update: set time_cleared to now
    try {
        $now = date('Y-m-d H:i:s');
        update_booking_list($id, 'time_cleared', $now);
        update_booking_list($id, 'booking_status', 'Cancelled');

        return [
            'success' => true,
            'false_reason' => '',
            'is_booking_loop' => 0,
        ];
    } catch (Exception $e) {
        return [
            'success' => false,
            'false_reason' => 'Database update error. Please contact staff for assistance.',
            'error_message' => $e->getMessage(),
            'is_booking_loop' => 0
        ];
    }
}


function flow_execution ($inputDataSet) {
    $flow = $inputDataSet['booking_flow'];
    $store_id = $inputDataSet['store_id'];
    switch ($flow) {
          case 1.0:
              // return booking_list_id
              $retrieved_booking_detail = get_booking_detail('subscriber_id', $inputDataSet['subscriber_id'], true);
              $return_json = [
                  'success' => true,
                  'booking_number' => count($retrieved_booking_detail) > 0 ? intval($retrieved_booking_detail[0]['booking_number']) : null,
                  'booking_pax' => count($retrieved_booking_detail) > 0 ? intval($retrieved_booking_detail[0]['pax']) : null,
                  'booking_list_id' => count($retrieved_booking_detail) > 0 ? intval($retrieved_booking_detail[0]['booking_list_id']) : null
              ];
              return $return_json;
          case 1.1:
              // Check for duplicate booking
              $retrieved_booking_detail = get_booking_detail('subscriber_id', $inputDataSet['subscriber_id'], true);
              $return_json = [
                  'success' => true,
                  'is_booking_duplicate' => count($retrieved_booking_detail) > 0 ? 1 : 0,
                  'booking_number' => count($retrieved_booking_detail) > 0 ? intval($retrieved_booking_detail[0]['booking_number']) : null,
                  'booking_pax' => count($retrieved_booking_detail) > 0 ? intval($retrieved_booking_detail[0]['pax']) : null
              ];
              return $return_json;
          case 1.2:
              // New Booking
              $booking_list_id = insert_to_booking_list($inputDataSet);
              $booking_list = get_booking_list($store_id);
              $booking_number = generate_booking_number($inputDataSet['pax'],$booking_list_id);
              update_booking_list($booking_list_id, 'booking_number', $booking_number);
              $booking_ahead = count($booking_list) - 1; // 자료 입력단계에서만 이 방식으로 계산

              $success = true;
              $isBookingLoop = is_booking_loop($booking_ahead);
              if(validatePax($store_id, $inputDataSet['pax']) === false){
                  // If pax exceeds limit, staff confirmation is needed
                  $success = false;   //success 가 false여도 레코드는 생성됨, 단 staff 확인 필요
                  $isBookingLoop = 0;
              }

              $return_json = [
                  'success' => $success,
                  'booking_list_id' => intval($booking_list_id),
                  'booking_ahead' => $booking_ahead,
                  'estimate_waiting_time' => estimate_waiting_time($booking_ahead),
                  'is_booking_loop' => $isBookingLoop,
                  'booking_number' => $booking_number,
                  'false_reason' => NULL
              ];
              return $return_json;
          case 1.9: // 로컬(WEB)에서 새 레코드 입력 시
              $retrieved = get_booking_detail('subscriber_id', $inputDataSet['subscriber_id'], true);
              if (count($retrieved) > 0) {
                  return [
                      'success' => false,
                      'false_reason' => 'Duplicate booking.'
                  ];
              }

              // New Booking
              $booking_list_id = insert_to_booking_list_from_local($inputDataSet);
              $booking_list = get_booking_list($store_id);
              $booking_number = generate_booking_number($inputDataSet['pax'],$booking_list_id);
              update_booking_list($booking_list_id, 'booking_number', $booking_number);

              $success = true;
              $return_json = [
                  'success' => $success,
                  'booking_list_id' => intval($booking_list_id),
                  'booking_number' => $booking_number
              ];
              return $return_json;
          case 2.1:
              // Check Booking Status (Normal Loop)
              $booking_list = get_booking_list($store_id);
              $booking_ahead = calculate_booking_ahead($booking_list, $inputDataSet['booking_list_id']);
               $return_json = [
                  'success' => true,
                  'booking_ahead' => $booking_ahead,
                  'estimate_waiting_time' => estimate_waiting_time($booking_ahead),
                  'is_booking_loop' => is_booking_loop($booking_ahead)
              ];
              return $return_json;
          case 2.2:
              // Change Pax — delegate to change_pax function
              $booking_list_id = isset($inputDataSet['booking_list_id']) ? intval($inputDataSet['booking_list_id']) : 0;
              $pax_new = isset($inputDataSet['pax_new']) ? intval($inputDataSet['pax_new']) : null;
              // if pax_new is not provided, respond with error
              if ($pax_new === null) {
                  return [
                      'success' => false,
                      'false_reason' => 'Invalid number of pax entered.',
                      'is_booking_loop' => 1
                  ];
              }
              return change_pax($booking_list_id, $pax_new);
          case 2.3:
              // Cancel Booking — delegate to cancel_booking()
              $booking_list_id = isset($inputDataSet['booking_list_id']) ? intval($inputDataSet['booking_list_id']) : 0;
              return cancel_booking($booking_list_id);
          case 2.4:
              // Update last interaction time
              return update_last_interaction($inputDataSet);
          case 2.5:
              // Booking confirmation
              $retrieved_booking_detail = get_booking_detail('subscriber_id', $inputDataSet['subscriber_id'], true);
              $booking_list_id = count($retrieved_booking_detail) > 0 ? intval($retrieved_booking_detail[0]['booking_list_id']) : 0;
              $is_booking_confirmed = $inputDataSet['is_booking_confirmed'];
              update_booking_list($booking_list_id, 'status', 'Waiting');
              if ($is_booking_confirmed) {
                  // Update booking_status to 'Confirmed'
                  $qna = 'Customer Confirmed';
                  $qna_id = 9; // Default id for 'Customer Confirmed'
                  add_to_history_chat($booking_list_id, $qna, $qna_id);
              } else {
                  // Update booking_status to 'Confirmed'
                  $qna = 'Cancel Requested';
                  $qna_id = 9; // Default id for 'Customer Confirmed'
                  add_to_history_chat($booking_list_id, $qna, $qna_id);
              }
              return [
                      'success' => $is_booking_confirmed,
                      'booking_list_id' => $booking_list_id
                  ];
              
          case 9.2:
              // Question response processing
              $booking_list_id = isset($inputDataSet['booking_list_id']) ? intval($inputDataSet['booking_list_id']) : 0;
              return processChatResponse($inputDataSet);
          default:
              throw new Exception('Unknown flow: ' . $flow);
    }
}



/**
 * update_last_interaction
 * Update ws_last_interaction field for a booking identified by subscriber_id
 * 
 * @param array $inputDataSet - Contains 'subscriber_id' and 'last_interaction'
 * @return array - Response with success status
 * @throws Exception on database errors
 */
function update_last_interaction($inputDataSet) {
    // Find booking by subscriber_id (today only)
    $retrieved_booking_detail = get_booking_detail('subscriber_id', $inputDataSet['subscriber_id'], true);
    
    if (count($retrieved_booking_detail) === 0) {
        return [
            'success' => false,
            'false_reason' => 'No active booking found for subscriber_id: ' . $inputDataSet['subscriber_id']
        ];
    }
    
    $booking_list_id = intval($retrieved_booking_detail[0]['booking_list_id']);
    $last_interaction = isset($inputDataSet['last_interaction']) ? strval($inputDataSet['last_interaction']) : null;
    
    if ($last_interaction === null) {
        return [
            'success' => false,
            'false_reason' => 'last_interaction value is missing'
        ];
    }
    
    try {
        // Convert UTC timestamp to local time
        // Expected format: '2025-12-01 05:54:23.51575' or '2025-12-01 05:54:23'
        $utc_datetime = new DateTime($last_interaction, new DateTimeZone('UTC'));
        $utc_datetime->setTimezone(new DateTimeZone(date_default_timezone_get()));
        $local_time = $utc_datetime->format('Y-m-d H:i:s');
        
        // Update ws_last_interaction field with local time
        $affected = update_booking_list($booking_list_id, 'ws_last_interaction', $local_time);
        
        return [
            'success' => true,
            'booking_list_id' => $booking_list_id,
            'rows_affected' => $affected,
            'local_time' => $local_time
        ];
    } catch (Exception $e) {
        return [
            'success' => false,
            'false_reason' => 'Database update error: ' . $e->getMessage()
        ];
    }
}

/**
 * processChatResponse
 * Process a chat response by finding the related question and returning available answers.
 * 
 * @param array $response - Contains 'store_id', 'booking_list_id', and 'booking_response'
 * @return array - Array of answer objects from answer_list table
 * @throws Exception on database errors
 */
function processChatResponse($response) {
    global $isPreparedStmt;
    
    $cfg = get_db_config();
    if ($cfg['user'] === '' || $cfg['name'] === '') {
        throw new Exception('Database configuration incomplete: DB_USERNAME and DB_NAME are required');
    }

    $mysqli = new mysqli($cfg['host'], $cfg['user'], $cfg['pass'], $cfg['name']);
    if ($mysqli->connect_errno) {
        throw new Exception('DB connect error: ' . $mysqli->connect_error);
    }

    $store_id = $response['store_id'] ?? '';
    $booking_list_id = isset($response['booking_list_id']) ? intval($response['booking_list_id']) : 0;
    $booking_response = isset($response['booking_response']) ? intval($response['booking_response']) : 0;

    // Step 1: Get the last qna_id from history_chat for this booking_list_id
    if ($isPreparedStmt) {
        $sql1 = "SELECT qna_id FROM history_chat WHERE booking_list_id = ? ORDER BY Id DESC LIMIT 1";
        $stmt1 = $mysqli->prepare($sql1);
        if ($stmt1 === false) {
            $mysqli->close();
            throw new Exception('Prepare error (history_chat): ' . $mysqli->error);
        }
        
        $stmt1->bind_param('i', $booking_list_id);
        $stmt1->execute();
        $result1 = $stmt1->get_result();
        $row1 = $result1->fetch_assoc();
        $stmt1->close();
    } else {
        $booking_list_id_safe = intval($booking_list_id);
        $sql1 = "SELECT qna_id FROM history_chat WHERE booking_list_id = $booking_list_id_safe ORDER BY Id DESC LIMIT 1";
        $result1 = $mysqli->query($sql1);
        if ($result1 === false) {
            $mysqli->close();
            throw new Exception('Query error (history_chat): ' . $mysqli->error);
        }
        $row1 = $result1->fetch_assoc();
        $result1->close();
    }

    if (!$row1 || !isset($row1['qna_id'])) {
        $mysqli->close();
        throw new Exception('No chat history found for booking_list_id: ' . $booking_list_id);
    }

    $qna_id = intval($row1['qna_id']);

    // Step 2: Get answer_ids from ask_question_list table
    if ($isPreparedStmt) {
        $sql2 = "SELECT answer_ids FROM ask_question_list WHERE Id = ?";
        $stmt2 = $mysqli->prepare($sql2);
        if ($stmt2 === false) {
            $mysqli->close();
            throw new Exception('Prepare error (ask_question_list): ' . $mysqli->error);
        }
        
        $stmt2->bind_param('i', $qna_id);
        $stmt2->execute();
        $result2 = $stmt2->get_result();
        $row2 = $result2->fetch_assoc();
        $stmt2->close();
    } else {
        $qna_id_safe = intval($qna_id);
        $sql2 = "SELECT answer_ids FROM ask_question_list WHERE Id = $qna_id_safe";
        $result2 = $mysqli->query($sql2);
        if ($result2 === false) {
            $mysqli->close();
            throw new Exception('Query error (ask_question_list): ' . $mysqli->error);
        }
        $row2 = $result2->fetch_assoc();
        $result2->close();
    }

    if (!$row2 || !isset($row2['answer_ids'])) {
        $mysqli->close();
        throw new Exception('No question found for qna_id: ' . $qna_id);
    }

    $answer_ids_str = $row2['answer_ids'];

    // Step 3: Convert answer_ids string "1, 2" to array [1, 2]
    $answer_ids_array = array_map('intval', array_map('trim', explode(',', $answer_ids_str)));

    if (empty($answer_ids_array)) {
        $mysqli->close();
        return [null, null]; // No answers to fetch
    }

    // Step 4: Get all answer texts and badges from answer_list table
    if ($isPreparedStmt) {
        $placeholders = implode(',', array_fill(0, count($answer_ids_array), '?'));
        $sql3 = "SELECT answer, badge, q_level FROM answer_list WHERE Id IN ($placeholders) ORDER BY FIELD(Id, $placeholders)";
        $stmt3 = $mysqli->prepare($sql3);
        if ($stmt3 === false) {
            $mysqli->close();
            throw new Exception('Prepare error (answer_list): ' . $mysqli->error);
        }

        // Bind all answer IDs dynamically (twice: once for IN clause, once for ORDER BY FIELD)
        $types = str_repeat('i', count($answer_ids_array) * 2);
        $bind_params = array_merge($answer_ids_array, $answer_ids_array);
        $stmt3->bind_param($types, ...$bind_params);
        $stmt3->execute();
        $result3 = $stmt3->get_result();
        
        $answer_texts = [];
        $badge_arr = [];
        $q_level_arr = [];
        while ($row = $result3->fetch_assoc()) {
            $answer_texts[] = 'A: '.$row['answer'];
            $badge_arr[] = $row['badge'];
            $q_level_arr[] = $row['q_level'];
        }
        
        $stmt3->close();
    } else {
        // Build IN clause with safe integer values
        $answer_ids_safe = array_map('intval', $answer_ids_array);
        $in_clause = implode(',', $answer_ids_safe);
        $field_clause = implode(',', $answer_ids_safe);
        $sql3 = "SELECT answer, badge, q_level FROM answer_list WHERE Id IN ($in_clause) ORDER BY FIELD(Id, $field_clause)";
        $result3 = $mysqli->query($sql3);
        if ($result3 === false) {
            $mysqli->close();
            throw new Exception('Query error (answer_list): ' . $mysqli->error);
        }
        
        $answer_texts = [];
        $badge_arr = [];
        $q_level_arr = [];
        while ($row = $result3->fetch_assoc()) {
            $answer_texts[] = 'A: '.$row['answer'];
            $badge_arr[] = $row['badge'];
            $q_level_arr[] = $row['q_level'];
        }
        
        $result3->close();
    }

    // Step 5: Add "Cancel" option at the beginning
    array_unshift($answer_ids_array, 0);
    array_unshift($answer_texts, 'Cancel');
    array_unshift($badge_arr, 'Cancel Requested');
    array_unshift($q_level_arr, 0);

    // Step 6: Get selected values based on booking_response index
    $selected_answer_id = $answer_ids_array[$booking_response] ?? null;
    
    // Special handling for booking_response == 99 (No Response timeout)
    if ($booking_response == 99) {
        $selected_answer = 'No Response for 10 min';
    } else {
        $selected_answer = $answer_texts[$booking_response] ?? null;
    }
    
    $selected_badge = $badge_arr[$booking_response] ?? null;
    $selected_q_level = $q_level_arr[$booking_response] ?? null;

    // Step 7: Insert new record into history_chat
    $current_datetime = date('Y-m-d H:i:s');
    $qna_value = $selected_answer ?? '';

    if ($isPreparedStmt) {
        $sql_insert = "INSERT INTO history_chat (booking_list_id, dateTime, qna, qna_id) VALUES (?, ?, ?, ?)";
        $stmt_insert = $mysqli->prepare($sql_insert);
        if ($stmt_insert === false) {
            $mysqli->close();
            throw new Exception('Prepare error (history_chat insert): ' . $mysqli->error);
        }

        if (!$stmt_insert->bind_param('issi', $booking_list_id, $current_datetime, $qna_value, $qna_id)) {
            $err = $stmt_insert->error;
            $stmt_insert->close();
            $mysqli->close();
            throw new Exception('Bind failed (history_chat insert): ' . $err);
        }

        if (!$stmt_insert->execute()) {
            $err = $stmt_insert->error;
            $stmt_insert->close();
            $mysqli->close();
            throw new Exception('Execute failed (history_chat insert): ' . $err);
        }

        $stmt_insert->close();
    } else {
        $booking_list_id_safe = intval($booking_list_id);
        $current_datetime_safe = $mysqli->real_escape_string($current_datetime);
        $qna_value_safe = $mysqli->real_escape_string($qna_value);
        $qna_id_safe = intval($qna_id);
        $sql_insert = "INSERT INTO history_chat (booking_list_id, dateTime, qna, qna_id) VALUES ($booking_list_id_safe, '$current_datetime_safe', '$qna_value_safe', $qna_id_safe)";
        if (!$mysqli->query($sql_insert)) {
            $mysqli->close();
            throw new Exception('Query error (history_chat insert): ' . $mysqli->error);
        }
    }

    // Step 8: Update q_level and status if selected_q_level >= 300
    if ($selected_q_level !== null && intval($selected_q_level) >= 300) {
        if ($isPreparedStmt) {
            $sql_update_q = "UPDATE booking_list SET q_level = ?, status = 'Ready' WHERE booking_list_id = ?";
            $stmt_update_q = $mysqli->prepare($sql_update_q);
            if ($stmt_update_q === false) {
                $mysqli->close();
                throw new Exception('Prepare error (update q_level): ' . $mysqli->error);
            }
            
            $q_level_val = intval($selected_q_level);
            $stmt_update_q->bind_param('ii', $q_level_val, $booking_list_id);
            if (!$stmt_update_q->execute()) {
                $err = $stmt_update_q->error;
                $stmt_update_q->close();
                $mysqli->close();
                throw new Exception('Execute failed (update q_level): ' . $err);
            }
            $stmt_update_q->close();
        } else {
            $q_level_safe = intval($selected_q_level);
            $booking_list_id_safe = intval($booking_list_id);
            $sql_update_q = "UPDATE booking_list SET q_level = $q_level_safe, status = 'Ready' WHERE booking_list_id = $booking_list_id_safe";
            if (!$mysqli->query($sql_update_q)) {
                $mysqli->close();
                throw new Exception('Query error (update q_level): ' . $mysqli->error);
            }
        }
    }

    // Step 9: Update badge in booking_list table if selected_badge exists
    if ($selected_badge !== null && $selected_badge !== '') {
        // Split selected_badge by comma if it contains multiple badges
        $badge_values = array_map('trim', explode(',', $selected_badge));
        
        // Get current badge values
        if ($isPreparedStmt) {
            $sql_get_badges = "SELECT badge1, badge2, badge3 FROM booking_list WHERE booking_list_id = ?";
            $stmt_get = $mysqli->prepare($sql_get_badges);
            if ($stmt_get === false) {
                $mysqli->close();
                throw new Exception('Prepare error (get badges): ' . $mysqli->error);
            }

            $stmt_get->bind_param('i', $booking_list_id);
            $stmt_get->execute();
            $result_badges = $stmt_get->get_result();
            $badge_row = $result_badges->fetch_assoc();
            $stmt_get->close();
        } else {
            $booking_list_id_safe = intval($booking_list_id);
            $sql_get_badges = "SELECT badge1, badge2, badge3 FROM booking_list WHERE booking_list_id = $booking_list_id_safe";
            $result_badges = $mysqli->query($sql_get_badges);
            if ($result_badges === false) {
                $mysqli->close();
                throw new Exception('Query error (get badges): ' . $mysqli->error);
            }
            $badge_row = $result_badges->fetch_assoc();
            $result_badges->close();
        }

        if ($badge_row) {
            // Get available badge columns in order
            $available_columns = [];
            if (empty($badge_row['badge1'])) {
                $available_columns[] = 'badge1';
            }
            if (empty($badge_row['badge2'])) {
                $available_columns[] = 'badge2';
            }
            if (empty($badge_row['badge3'])) {
                $available_columns[] = 'badge3';
            }

            // Update badge columns with available space
            $updates_made = 0;
            foreach ($badge_values as $index => $badge_value) {
                // Skip empty badge values
                if (empty($badge_value)) {
                    continue;
                }
                
                // Stop if no more available columns
                if ($index >= count($available_columns)) {
                    break;
                }
                
                $badge_column = $available_columns[$index];
                
                if ($isPreparedStmt) {
                    $sql_update_badge = "UPDATE booking_list SET `$badge_column` = ? WHERE booking_list_id = ?";
                    $stmt_update = $mysqli->prepare($sql_update_badge);
                    if ($stmt_update === false) {
                        $mysqli->close();
                        throw new Exception('Prepare error (update badge): ' . $mysqli->error);
                    }

                    $stmt_update->bind_param('si', $badge_value, $booking_list_id);
                    if (!$stmt_update->execute()) {
                        $err = $stmt_update->error;
                        $stmt_update->close();
                        $mysqli->close();
                        throw new Exception('Execute failed (update badge): ' . $err);
                    }

                    $stmt_update->close();
                } else {
                    $badge_value_safe = $mysqli->real_escape_string($badge_value);
                    $booking_list_id_safe = intval($booking_list_id);
                    $sql_update_badge = "UPDATE booking_list SET `$badge_column` = '$badge_value_safe' WHERE booking_list_id = $booking_list_id_safe";
                    if (!$mysqli->query($sql_update_badge)) {
                        $mysqli->close();
                        throw new Exception('Query error (update badge): ' . $mysqli->error);
                    }
                }
                
                $updates_made++;
            }
        }
    }

    $mysqli->close();
    
    // Return [selected_answer_id, selected_answer, selected_badge, selected_q_level]
    return [$selected_answer_id, $selected_answer, $selected_badge, $selected_q_level];
}



?>