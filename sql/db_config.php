<?php
/**
 * 데이터베이스 설정 파일
 * 환경변수 또는 안전한 설정에서 데이터베이스 정보를 로드합니다.
 */

// 간단한 .env 파일 로더
function loadEnv($path) {
    if (!file_exists($path)) {
        return;
    }
    
    $lines = file($path, FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES);
    foreach ($lines as $line) {
        if (strpos(trim($line), '#') === 0) {
            continue; // 주석 건너뛰기
        }
        
        list($name, $value) = explode('=', $line, 2);
        $name = trim($name);
        $value = trim($value);
        
        if (!array_key_exists($name, $_SERVER) && !array_key_exists($name, $_ENV)) {
            putenv(sprintf('%s=%s', $name, $value));
            $_ENV[$name] = $value;
            $_SERVER[$name] = $value;
        }
    }
}

// .env 파일 로드 (현재 파일과 동일한 디렉터리에서 찾음)
loadEnv(__DIR__ . '/.env');

// 타임존 설정
date_default_timezone_set('Asia/Kuala_Lumpur');

// 환경변수에서 데이터베이스 정보를 가져옵니다 (필수)
function getDbInfo() {
    return [
        'preProd' => [
            'db_server_address' => $_ENV['DB_SERVER_ADDRESS'],
            'db_username' => $_ENV['DB_USERNAME'],
            'db_password' => $_ENV['DB_PASSWORD'],
            'db_names' => [
                'pos' => $_ENV['DB_POS_PREPROD'],
                'waitlist' => $_ENV['DB_WAITLIST_PREPROD']
            ]
        ],
        'live' => [
            'db_server_address' => $_ENV['DB_SERVER_ADDRESS'],
            'db_username' => $_ENV['DB_USERNAME'],
            'db_password' => $_ENV['DB_PASSWORD'],
            'db_names' => [
                'pos' => $_ENV['DB_POS_LIVE'],
                'waitlist' => $_ENV['DB_WAITLIST_LIVE']
            ]
        ]
    ];
}
?>