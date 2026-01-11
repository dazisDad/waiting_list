<?php
// check_curl.php
echo "<h2>PHP cURL 상태 확인</h2>";
echo "PHP 버전: " . phpversion() . "<br>";
echo "cURL 확장 설치됨: " . (extension_loaded('curl') ? '예 ✓' : '아니오 ✗') . "<br>";

if (function_exists('curl_version')) {
    $version = curl_version();
    echo "cURL 버전: " . $version['version'] . "<br>";
} else {
    echo "<strong>cURL이 설치되지 않았습니다!</strong><br>";
}

echo "<h3>모든 로드된 확장:</h3>";
print_r(get_loaded_extensions());

echo "<hr><h2>🔍 추가 진단</h2>";

// 1. disable_functions 확인
echo "<h3>1. 비활성화된 함수 확인:</h3>";
$disabled = ini_get('disable_functions');
if (empty($disabled)) {
    echo "비활성화된 함수 없음 ✓<br>";
} else {
    echo "<strong>비활성화된 함수:</strong> " . $disabled . "<br>";
    if (strpos($disabled, 'curl_exec') !== false) {
        echo "<span style='color:red;'>⚠️ curl_exec이 비활성화되어 있습니다!</span><br>";
    }
}

// 2. 개별 cURL 함수 확인
echo "<h3>2. cURL 함수 사용 가능 여부:</h3>";
$curl_functions = ['curl_init', 'curl_setopt', 'curl_exec', 'curl_getinfo', 'curl_error', 'curl_close'];
foreach ($curl_functions as $func) {
    $status = function_exists($func) ? '✓ 사용 가능' : '✗ 사용 불가';
    $color = function_exists($func) ? 'green' : 'red';
    echo "<span style='color:$color;'>$func: $status</span><br>";
}

// 3. 실제 cURL 테스트
echo "<h3>3. 실제 cURL 실행 테스트:</h3>";
try {
    if (function_exists('curl_init')) {
        $ch = curl_init('https://httpbin.org/get');
        curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
        curl_setopt($ch, CURLOPT_TIMEOUT, 5);
        $result = curl_exec($ch);
        $error = curl_error($ch);
        curl_close($ch);
        
        if ($result === false) {
            echo "<span style='color:orange;'>⚠️ cURL 실행 실패: $error</span><br>";
        } else {
            echo "<span style='color:green;'>✓ cURL 실행 성공!</span><br>";
            echo "응답 길이: " . strlen($result) . " bytes<br>";
        }
    } else {
        echo "<span style='color:red;'>✗ curl_init 함수가 없습니다</span><br>";
    }
} catch (Exception $e) {
    echo "<span style='color:red;'>에러 발생: " . $e->getMessage() . "</span><br>";
}

// 4. PHP 설정 파일 위치
echo "<h3>4. PHP 설정 정보:</h3>";
echo "Loaded php.ini: " . php_ini_loaded_file() . "<br>";
echo "Additional .ini files: " . (php_ini_scanned_files() ?: '없음') . "<br>";
echo "현재 디렉토리: " . __DIR__ . "<br>";

// 5. open_basedir 제한 확인
echo "<h3>5. 보안 제한 확인:</h3>";
$open_basedir = ini_get('open_basedir');
echo "open_basedir: " . ($open_basedir ?: '제한 없음') . "<br>";

$safe_mode = ini_get('safe_mode');
echo "safe_mode: " . ($safe_mode ? '활성화' : '비활성화') . "<br>";
?>