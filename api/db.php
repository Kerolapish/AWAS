<?php
// api/db.php
error_reporting(E_ALL);
ini_set('display_errors', 1);

// --- CONFIGURATION ---
$host = 'localhost';
$db_name = 'AWAS';
$username = 'root';
$password = ''; // Change this if you have a password for XAMPP/MAMP
// ---------------------

try {
    // First try to connect without database to check MySQL connection
    $baseConn = new PDO("mysql:host=$host", $username, $password);
    $baseConn->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
    
    // Check if database exists
    $stmt = $baseConn->query("SELECT SCHEMA_NAME FROM INFORMATION_SCHEMA.SCHEMATA WHERE SCHEMA_NAME = '$db_name'");
    if (!$stmt->fetch()) {
        echo json_encode(['success' => false, 'message' => "Database '$db_name' does not exist"]);
        exit();
    }
    
    // Now connect with database
    $conn = new PDO("mysql:host=$host;dbname=$db_name", $username, $password);
    $conn->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
    $conn->setAttribute(PDO::ATTR_DEFAULT_FETCH_MODE, PDO::FETCH_ASSOC);
    
    // Check if required tables exist
    $requiredTables = ['users', 'ledger_entries', 'reminders', 'crops'];
    $existingTables = $conn->query("SHOW TABLES")->fetchAll(PDO::FETCH_COLUMN);
    $missingTables = array_diff($requiredTables, $existingTables);
    
    if (!empty($missingTables)) {
        echo json_encode([
            'success' => false, 
            'message' => 'Missing required tables: ' . implode(', ', $missingTables)
        ]);
        exit();
    }
} catch(PDOException $e) {
    echo json_encode([
        'success' => false, 
        'message' => 'Database connection failed: ' . $e->getMessage(),
        'details' => [
            'host' => $host,
            'database' => $db_name,
            'error' => $e->getMessage()
        ]
    ]);
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