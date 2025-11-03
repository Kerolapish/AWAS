<?php
error_reporting(E_ALL);
ini_set('display_errors', 1);

echo json_encode([
    'status' => 'PHP is working',
    'php_version' => phpversion(),
    'server_software' => $_SERVER['SERVER_SOFTWARE'],
    'document_root' => $_SERVER['DOCUMENT_ROOT'],
    'script_path' => __FILE__
]);
?>