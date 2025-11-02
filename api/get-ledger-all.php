<?php
// api/get-ledger-all.php
// ALL CODE IS IN THIS ONE FILE

// --- 1. START SESSION & SET HEADER ---
header('Content-Type: application/json');
if (session_status() == PHP_SESSION_NONE) {
    session_start();
}

// --- 2. DATABASE CONNECTION (from db.php) ---
$host = 'localhost';
$db_name = 'awas';
$username = 'root';
$password = ''; // Your XAMPP/MAMP password

try {
    $conn = new PDO("mysql:host=$host;dbname=$db_name", $username, $password);
    $conn->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
    $conn->setAttribute(PDO::ATTR_DEFAULT_FETCH_MODE, PDO::FETCH_ASSOC);
} catch(PDOException $e) {
    echo json_encode(['success' => false, 'message' => 'Database connection failed: ' . $e->getMessage()]);
    exit();
}

// --- 3. AUTH FUNCTION (from db.php) ---
// This function checks if the user is logged in
function check_auth() {
    if (!isset($_SESSION['user_id'])) {
        echo json_encode(['success' => false, 'message' => 'Authentication required', 'auth' => false]);
        exit();
    }
    return $_SESSION['user_id'];
}

// --- 4. LEDGER LOGIC (Your code) ---
try {
    // Check if the user is logged in
    $user_id = check_auth(); 

    // Get all ledger entries
    $stmt = $conn->prepare("SELECT * FROM ledger_entries WHERE user_id = ? ORDER BY date DESC");
    $stmt->execute([$user_id]);
    $entries = $stmt->fetchAll();
    
    // Get the calculated profits
    $stmt_profit = $conn->prepare("SELECT crop, SUM(revenue - cost) as profit FROM ledger_entries WHERE user_id = ? GROUP BY crop");
    $stmt_profit->execute([$user_id]);
    $profits = $stmt_profit->fetchAll();
    
    // Send all data back as one JSON object
    echo json_encode([
        'success' => true, 
        'entries' => $entries, 
        'profits' => $profits
    ]);

} catch (Exception $e) {
    // Send a JSON error if something fails
    echo json_encode([
        'success' => false, 
        'message' => $e->getMessage()
    ]);
}
?>