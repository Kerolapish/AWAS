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

// Start a session to handle user login state
if (session_status() == PHP_SESSION_NONE) {
    session_start();
}

// Function to check if user is logged in
function check_auth() {
    if (!isset($_SESSION['user_id'])) {
        echo json_encode(['success' => false, 'message' => 'Authentication required', 'auth' => false]);
        exit();
    }
    return $_SESSION['user_id'];
}
?>