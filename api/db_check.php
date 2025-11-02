<?php
error_reporting(E_ALL);
ini_set('display_errors', 1);
header('Content-Type: application/json');

require 'db.php';

try {
    // Check MySQL connection
    $tables = $conn->query("SHOW TABLES")->fetchAll(PDO::FETCH_COLUMN);
    
    echo json_encode([
        'success' => true,
        'database' => [
            'name' => $db_name,
            'tables' => $tables,
            'connection' => 'successful'
        ]
    ]);
} catch (PDOException $e) {
    echo json_encode([
        'success' => false,
        'error' => $e->getMessage(),
        'database' => [
            'name' => $db_name,
            'connection' => 'failed'
        ]
    ]);
}
?>