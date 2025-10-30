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
function get_booking_list() {
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
    $sql = 'SELECT * FROM booking_list WHERE time_cleared IS NULL';
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
    $required = ['booking_from', 'subscriber_id', 'customer_name', 'customer_phone', 'pax'];
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

    $sql = 'INSERT INTO booking_list (booking_from, subscriber_id, customer_name, customer_phone, pax, time_created) VALUES (?,?,?,?,?,?)';
    $stmt = $mysqli->prepare($sql);
    if ($stmt === false) {
        $err = $mysqli->error;
        $mysqli->close();
        throw new Exception('Prepare failed: ' . $err);
    }

    // Normalize and bind params
    $booking_from = strval($inputDataSet['booking_from']);
    $subscriber_id = intval($inputDataSet['subscriber_id']);
    $customer_name = strval($inputDataSet['customer_name']);
    $customer_phone = strval($inputDataSet['customer_phone']);
    $pax = intval($inputDataSet['pax']);
    $time_created = date('Y-m-d H:i:s');

    // types: s (booking_from), i (subscriber_id), s (customer_name), s (customer_phone), i (pax), s (time_created)
    if (!$stmt->bind_param('sissis', $booking_from, $subscriber_id, $customer_name, $customer_phone, $pax, $time_created)) {
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

function flow_execution ($inputDataSet) {
    $flow = $inputDataSet['booking_flow'];
    switch ($flow) {
          case 1.1:
              $booking_list_id = insert_to_booking_list($inputDataSet);
              $booking_list = get_booking_list();
              $booking_number = generate_booking_number($inputDataSet['pax'],$booking_list_id);
              update_booking_list($booking_list_id, 'booking_number', $booking_number);

              // Success - prepare structured response
              $return_json = [
                  'success' => true,
                  'booking_list_id' => $booking_list_id,
                  'booking_ahead' => count($booking_list) - 1,
                  'estimate_waiting_time' => '1min',
                  'is_booking_loop' => 1,
                  'booking_number' => $booking_number
              ];
              return $return_json;
            case 2.1:
              // booking_ahead 만 확인해서 is_booking_loop 응답
               $return_json = [
                  'success' => true,
                  'booking_ahead' => 0,
                  'estimate_waiting_time' => '2min',
                  'is_booking_loop' => 0
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