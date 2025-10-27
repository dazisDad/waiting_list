<?php
/* Simple test endpoint that emits two SSE messages and exits.
   Use this to confirm the server handles PHP and returns Content-Type: text/event-stream
*/

header("Content-Type: text/event-stream");
header('Cache-Control: no-cache');

// Small test payloads
echo "data: {\"test\": \"ok\"}\n\n";
flush();

sleep(1);

echo "data: {\"test\": \"done\"}\n\n";
flush();

?>