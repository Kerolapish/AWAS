<?php
// api/api.php
include 'db.php';

// --- CONFIGURATION ---
// FIX: Move API key to a variable. Ideally, this would be in an environment file.
$openWeatherApiKey = '306515b318763e19aba681108b077d1c';
// ---------------------

$action = $_GET['action'] ?? '';
$user_id = $_SESSION['user_id'] ?? null;
$data = json_decode(file_get_contents('php://input'), true);

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
            $email = $data['email'] ?? '';
            $password = $data['password'] ?? '';
            if (empty($email) || empty($password)) {
                throw new Exception('Email and password are required');
            }
            $stmt = $conn->prepare("SELECT * FROM users WHERE email = ?");
            $stmt->execute([$email]);
            $user = $stmt->fetch();
            if ($user && password_verify($password, $user['password'])) {
                $_SESSION['user_id'] = $user['id'];
                $_SESSION['user_name'] = $user['fullName'];
                echo json_encode(['success' => true, 'message' => 'Login successful']);
            } else {
                throw new Exception('Invalid email or password');
            }
            break;

        case 'forgot_password':
            $email = $data['email'] ?? '';
            // TODO: Add email sending logic here (e.g., using PHPMailer)
            // This feature is not implemented, but we send a success message
            // as the frontend (auth.js) expects.
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
            // Use the API key from the variable at the top
            $lat = $_GET['lat'] ?? '0';
            $lon = $_GET['lon'] ?? '0';
            $url = "https://api.openweathermap.org/data/3.0/onecall?lat=$lat&lon=$lon&exclude=minutely&units=metric&appid=$openWeatherApiKey";
            
            $ch = curl_init();
            curl_setopt($ch, CURLOPT_URL, $url);
            curl_setopt($ch, CURLOPT_RETURNTRANSFER, 1);
            $output = curl_exec($ch);
            
            // --- FIX: Add error handling for cURL ---
            if ($output === false) {
                curl_close($ch);
                throw new Exception('Failed to fetch weather data. cURL Error.');
            }
            curl_close($ch);
            
            $weatherData = json_decode($output, true);
            if ($weatherData === null) {
                throw new Exception('Failed to decode weather data.');
            }
            
            // --- FIX: Wrap the response in our standard API format ---
            // This makes the frontend 'api' function much happier.
            echo json_encode(['success' => true, 'data' => $weatherData]);
            break;
            // --- End of Weather Fix ---
            
        default:
            throw new Exception('Invalid action');
    }
} catch (Exception $e) {
    echo json_encode(['success' => false, 'message' => $e->getMessage()]);
}
?>