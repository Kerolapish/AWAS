<?php
// api/api.php
error_reporting(E_ALL);
ini_set('display_errors', 1);

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
        // --- AUTH ---
        case 'register':
            $fullName = $data['fullName'] ?? '';
            $email = $data['email'] ?? '';
            $phone = $data['phone'] ?? '';
            $password = $data['password'] ?? '';
            if (empty($fullName) || empty($email) || empty($password) || empty($phone)) {
                throw new Exception('All fields are required');
            }
            $hash = password_hash($password, PASSWORD_DEFAULT);
            $stmt = $conn->prepare("INSERT INTO users (fullName, email, phone, password) VALUES (?, ?, ?, ?)");
            $stmt->execute([$fullName, $email, $phone, $hash]);
            echo json_encode(['success' => true, 'message' => 'Registration successful']);
            break;

        case 'login':
            error_log("Login attempt - Email: " . ($data['email'] ?? 'not provided'));
            
            $email = $data['email'] ?? '';
            $password = $data['password'] ?? '';
            if (empty($email) || empty($password)) {
                throw new Exception('Email and password are required');
            }
            
            try {
                $stmt = $conn->prepare("SELECT * FROM users WHERE email = ?");
                $stmt->execute([$email]);
                $user = $stmt->fetch();
                
                if ($user && password_verify($password, $user['password'])) {
                    // Start a new session
                    session_start();
                    session_regenerate_id(true);
                    
                    $_SESSION['user_id'] = $user['id'];
                    $_SESSION['user_name'] = $user['fullName'];
                    
                    error_log("Login successful for user: " . $user['id']);
                    
                    echo json_encode([
                        'success' => true,
                        'message' => 'Login successful',
                        'user' => [
                            'id' => $user['id'],
                            'name' => $user['fullName']
                        ]
                    ]);
                } else {
                    error_log("Login failed - Invalid credentials for email: " . $email);
                    throw new Exception('Invalid email or password');
                }
            } catch (PDOException $e) {
                error_log("Database error during login: " . $e->getMessage());
                throw new Exception('Database error occurred');
            }
            break;

        case 'forgot_password':
            $email = $data['email'] ?? '';
            // TODO: Add email sending logic here (e.g., using PHPMailer)
            // For now, just pretend it worked.
            echo json_encode(['success' => true, 'message' => 'If an account exists, a reset link has been sent.']);
            break;
            
        case 'check_session':
            $user_id = check_auth();
            echo json_encode(['success' => true, 'auth' => true, 'name' => $_SESSION['user_name']]);
            break;
            
        case 'logout':
            session_unset();
            session_destroy();
            echo json_encode(['success' => true, 'message' => 'Logged out']);
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
            $user_id = check_auth();
            $id = $_GET['id'] ?? 0;
            $stmt = $conn->prepare("DELETE FROM reminders WHERE id = ? AND user_id = ?");
            $stmt->execute([$id, $user_id]);
            echo json_encode(['success' => true, 'message' => 'Reminder deleted']);
            break;

        // --- CROPS ---
        case 'get_crops':
            check_auth();
            $stmt = $conn->query("SELECT * FROM crops ORDER BY name");
            echo json_encode(['success' => true, 'crops' => $stmt->fetchAll()]);
            break;
            
        case 'get_crop_detail':
            check_auth();
            $id = $_GET['id'] ?? 0;
            $stmt = $conn->prepare("SELECT * FROM crops WHERE id = ?");
            $stmt->execute([$id]);
            echo json_encode(['success' => true, 'crop' => $stmt->fetch()]);
            break;

        // --- WEATHER ---
        case 'get_weather':
            check_auth();
            $apiKey = '306515b318763e19aba681108b077d1c'; // Your API key
            $lat = $_GET['lat'] ?? '0';
            $lon = $_GET['lon'] ?? '0';
            $url = "https://api.openweathermap.org/data/3.0/onecall?lat=$lat&lon=$lon&exclude=minutely&units=metric&appid=$apiKey";
            
            $ch = curl_init();
            curl_setopt($ch, CURLOPT_URL, $url);
            curl_setopt($ch, CURLOPT_RETURNTRANSFER, 1);
            $output = curl_exec($ch);
            curl_close($ch);
            
            // Send the raw JSON from OpenWeatherMap straight to the frontend
            header('Content-Type: application/json');
            echo $output;
            exit(); // Exit here to avoid re-encoding
            
        default:
            throw new Exception('Invalid action');
    }
} catch (Exception $e) {
    echo json_encode(['success' => false, 'message' => $e->getMessage()]);
}
?>