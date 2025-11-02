<?php
// api/db.php
header('Content-Type: application/json');

// --- CONFIGURATION ---
$host = 'localhost';
$db_name = 'AWAS';
$username = 'root';
$password = ''; // Change this if you have a password for XAMPP/MAMP
// ---------------------

try {
    $conn = new PDO("mysql:host=$host;dbname=$db_name", $username, $password);
    $conn->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
    $conn->setAttribute(PDO::ATTR_DEFAULT_FETCH_MODE, PDO::FETCH_ASSOC);
} catch(PDOException $e) {
    echo json_encode(['success' => false, 'message' => 'Database connection failed: ' . $e->getMessage()]);
    exit();
}
?>