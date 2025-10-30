<?php

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
function get_booking_list($store_id) {
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
    $sql = "SELECT * FROM booking_list WHERE time_cleared IS NULL AND store_id = '" . $mysqli->real_escape_string($store_id) . "' ORDER BY booking_list_id ASC";
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

    $sql = 'INSERT INTO booking_list (store_id, booking_from, subscriber_id, customer_name, customer_phone, pax, time_created) VALUES (?,?,?,?,?,?,?)';
    $stmt = $mysqli->prepare($sql);
    if ($stmt === false) {
        $err = $mysqli->error;
        $mysqli->close();
        throw new Exception('Prepare failed: ' . $err);
    }

    // Normalize and bind params
    $store_id = strval($inputDataSet['store_id']);
    $booking_from = strval($inputDataSet['booking_from']);
    $subscriber_id = intval($inputDataSet['subscriber_id']);
    $customer_name = strval($inputDataSet['customer_name']);
    $customer_phone = strval($inputDataSet['customer_phone']);
    $pax = intval($inputDataSet['pax']);
    $time_created = date('Y-m-d H:i:s');

    // types: s (store_id), s (booking_from), i (subscriber_id), s (customer_name), s (customer_phone), i (pax), s (time_created)
    if (!$stmt->bind_param('ssissis', $store_id, $booking_from, $subscriber_id, $customer_name, $customer_phone, $pax, $time_created)) {
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
    $id = intval($booking_list_id);
    if ($id <= 0) {
        throw new Exception('Invalid booking_list_id');
    }

    // Whitelist of allowed updatable columns to avoid SQL injection via column name
    $allowed = [
        'booking_from','subscriber_id','customer_name','customer_phone','pax',
        'time_cleared','booking_number'
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

    // Build SQL. If value is null, set column = NULL directly.
    if ($value === null) {
        $sql = "UPDATE booking_list SET `" . $mysqli->real_escape_string($key) . "` = NULL WHERE booking_list_id = ?";
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
        $intCols = ['subscriber_id','pax'];
        $type = in_array($key, $intCols, true) ? 'i' : 's';

        $sql = "UPDATE booking_list SET `" . $mysqli->real_escape_string($key) . "` = ? WHERE booking_list_id = ?";
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
    $sql = "SELECT * FROM booking_list WHERE " . $col . " = ?";

    // For non-id searches, only include non-cleared rows
    if ($key !== 'booking_list_id') {
        $sql .= ' AND time_cleared IS NULL';
    }

    // If isToday is truthy, filter to today's time_created (DATE equality)
    if ($isToday) {
        $sql .= ' AND DATE(time_created) = CURDATE()';
    }

    $stmt = $mysqli->prepare($sql);
    if ($stmt === false) {
        $err = $mysqli->error;
        $mysqli->close();
        throw new Exception('Prepare failed: ' . $err);
    }

    // Determine bind type for the search value
    $intCols = ['subscriber_id','pax','booking_list_id'];
    $type = in_array($key, $intCols, true) ? 'i' : 's';

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



function flow_execution ($inputDataSet) {
    $flow = $inputDataSet['booking_flow'];
    $store_id = $inputDataSet['store_id'];
    switch ($flow) {
          case 1.1:
              // Check for duplicate booking
              $retrieved_booking_detail = get_booking_detail('subscriber_id', $inputDataSet['subscriber_id'], true);
              $return_json = [
                  'success' => true,
                  'is_booking_duplicate' => count($retrieved_booking_detail) > 0 ? 1 : 0,
                  'booking_number' => count($retrieved_booking_detail) > 0 ? $retrieved_booking_detail[0]['booking_number'] : null
              ];
              return $return_json;
          case 1.2:
              // New Booking
              $booking_list_id = insert_to_booking_list($inputDataSet);
              $booking_list = get_booking_list($store_id);
              $booking_number = generate_booking_number($inputDataSet['pax'],$booking_list_id);
              update_booking_list($booking_list_id, 'booking_number', $booking_number);
              $booking_ahead = count($booking_list) - 1; // 자료 입력단계에서만 이 방식으로 계산

              $return_json = [
                  'success' => true,
                  'booking_list_id' => $booking_list_id,
                  'booking_ahead' => $booking_ahead,
                  'estimate_waiting_time' => estimate_waiting_time($booking_ahead),
                  'is_booking_loop' => is_booking_loop($booking_ahead),
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
              // Change Pax
               $return_json = [
                  'success' => true,
                  'booking_ahead' => 0,
                  'estimate_waiting_time' => '2min',
                  'is_booking_loop' => 0
              ];
              return $return_json;
          case 2.3:
              // Cancel Booking
               $return_json = [
                  'success' => true,
                  'booking_ahead' => 0,
                  'estimate_waiting_time' => '2min',
                  'is_booking_loop' => 0
              ];
              return $return_json;
          default:
              throw new Exception('Unknown flow: ' . $flow);
    }
}



?>