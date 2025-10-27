<?php
// Sync endpoint removed
// This file is intentionally kept as a small stub so any legacy requests
// receive a clear response. If you prefer actual deletion, remove this file
// from the repository / filesystem manually.
header('Content-Type: application/json');
http_response_code(410); // Gone
echo json_encode([
    'success' => false,
    'error' => 'Sync endpoint disabled',
    'message' => 'Server-side sync has been removed. Please remove client calls to this endpoint.'
]);
exit;
