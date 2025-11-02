<?php
// api/api.php
error_reporting(E_ALL);
ini_set('display_errors', 1);

// Start session at the very beginning to avoid any "headers already sent" issues.
if (session_status() == PHP_SESSION_NONE) {
    session_start();
}

// Ensure no output before headers
ob_start();

// Set JSON content type
header('Content-Type: application/json');

// Log incoming requests
$requestLog = [
    'time' => date('Y-m-d H:i:s'),
    'method' => $_SERVER['REQUEST_METHOD'],
    'action' => $_GET['action'] ?? 'none',
    'post_data' => file_get_contents('php://input')
];
error_log(json_encode($requestLog));

include 'db.php';

// Enable CORS for development
header('Access-Control-Allow-Origin: http://localhost');
header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Accept');
header('Access-Control-Allow-Credentials: true');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    exit(0);
}

$action = $_GET['action'] ?? '';
$user_id = $_SESSION['user_id'] ?? null;
$data = json_decode(file_get_contents('php://input'), true);

// Log received data
error_log("Action: " . $action);
error_log("Received data: " . json_encode($data));

try {
    switch ($action) {
        // --- WEATHER ---
        case 'get_weather':
            // No authentication needed for this endpoint
            $lat = $_GET['lat'] ?? null;
            $lon = $_GET['lon'] ?? null;

            if (!$lat || !$lon) {
                throw new Exception('Latitude and longitude are required');
            }

            $apiKey = '306515b318763e19aba681108b077d1c'; // Consider moving to a config file
            $url = "https://api.openweathermap.org/data/3.0/onecall?lat=$lat&lon=$lon&exclude=minutely&units=metric&appid=$apiKey";

            $ch = curl_init();
            curl_setopt($ch, CURLOPT_URL, $url);
            curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
            // In production, consider setting CURLOPT_SSL_VERIFYPEER to true and providing a CA bundle.
            // curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, true); 

            $response = curl_exec($ch);

            if (curl_errno($ch)) {
                throw new Exception('Weather API error: ' . curl_error($ch));
            }
            curl_close($ch);

            echo $response; // Forward the JSON response from OpenWeatherMap
            break;

        // --- LEDGER ---
        case 'get_ledger':
            $user_id = check_auth();
            $stmt = $conn->prepare("SELECT * FROM ledger_entries WHERE user_id = ? ORDER BY date DESC");
            $stmt->execute([$user_id]);
            $entries = $stmt->fetchAll();
            
            $stmt_profit = $conn->prepare("SELECT crop, SUM(revenue - cost) as profit FROM ledger_entries WHERE user_id = ? GROUP BY crop");
            $stmt_profit->execute([$user_id]);
            $profits = $stmt_profit->fetchAll();
            
            echo json_encode(['success' => true, 'entries' => $entries, 'profits' => $profits]);
            break;

        case 'add_ledger':
            $user_id = check_auth();
            $stmt = $conn->prepare("INSERT INTO ledger_entries (user_id, crop, revenue, cost, date) VALUES (?, ?, ?, ?, ?)");
            $stmt->execute([$user_id, $data['crop'], $data['revenue'], $data['cost'], $data['date']]);
            echo json_encode(['success' => true, 'message' => 'Ledger entry added']);
            break;
            
        case 'delete_ledger':
            $user_id = check_auth();
            $id = $_GET['id'] ?? 0;
            $stmt = $conn->prepare("DELETE FROM ledger_entries WHERE id = ? AND user_id = ?");
            $stmt->execute([$id, $user_id]);
            echo json_encode(['success' => true, 'message' => 'Ledger entry deleted']);
            break;

        // --- REMINDERS ---
        case 'get_reminders':
            $user_id = check_auth();
            $stmt = $conn->prepare("SELECT * FROM reminders WHERE user_id = ? ORDER BY createdAt DESC");
            $stmt->execute([$user_id]);
            echo json_encode(['success' => true, 'reminders' => $stmt->fetchAll()]);
            break;

        case 'add_reminder':
            $user_id = check_auth();
            $stmt = $conn->prepare("INSERT INTO reminders (user_id, text) VALUES (?, ?)");
            $stmt->execute([$user_id, $data['text']]);
            echo json_encode(['success' => true, 'message' => 'Reminder added']);
            break;
            
        case 'delete_reminder':
            $user_id = chec