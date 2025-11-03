<?php
// api/api.php - DISAHKAN DENGAN PEMERIKSAAN NILAI YANG TEPAT DAN SELAMAT

// --- DEBUGGING ON & OUTPUT FIX ---
ini_set('display_errors', 1);
ini_set('display_startup_errors', 1);
error_reporting(E_ALL);
header('Content-Type: application/json');
// ---------------------------------

include 'db.php'; 

// --- CONFIGURATION ---
$openWeatherApiKey = '306515b318763e19aba681108b077d1c';
// ---------------------

$action = $_GET['action'] ?? '';
$user_id = $_SESSION['user_id'] ?? null;
$method = $_SERVER['REQUEST_METHOD'];

// Advanced input parsing for JSON, FormData, and Files
$data = [];
$get_params = $_GET; // Simpan GET params

if ($method === 'POST' || $method === 'PUT') {
    $json_input = file_get_contents('php://input');
    
    // 1. Cuba parse JSON
    if ($json_input !== false) {
        $decoded_json = json_decode($json_input, true);
        if (is_array($decoded_json)) {
             $data = $decoded_json;
        }
    }
    
    // 2. Jika input bukan JSON, guna FormData/$_POST (ini adalah laluan Crops)
    if (empty($data) && !empty($_POST)) {
        $data = $_POST;
    }
}

// *** FIX KRITIKAL: Semak dan gabungkan $data dengan $_GET ***
// Pastikan $data adalah array sebelum digabungkan
if (!is_array($data)) {
    $data = [];
}
// Gabungkan data POST/JSON dengan semua parameter GET
$data = array_merge($data, $get_params); 

// FIX KRITIKAL (Masalah "Invalid Action")
if (empty($action) && isset($data['action'])) {
    $action = $data['action'];
}
// *** END FIX ***


try {
    // Semak Autentikasi
    if (!in_array($action, ['register', 'login', 'forgot_password'])) {
        $user_id = check_auth();
    }

    switch ($action) {
        
        // --- AUTH --- (Logik kekal sama)
        case 'register':
            $fullName = $data['fullName'] ?? '';
            $email = $data['email'] ?? '';
            $phone = $data['phone'] ?? '';
            $password = $data['password'] ?? '';
            if (empty($fullName) || empty($email) || empty($password) || empty($phone)) { throw new Exception('All fields are required'); }
            $hash = password_hash($password, PASSWORD_DEFAULT);
            $stmt = $conn->prepare("INSERT INTO users (fullName, email, phone, password) VALUES (?, ?, ?, ?, ?)");
            $stmt->execute([$fullName, $email, $phone, $hash]);
            echo json_encode(['success' => true, 'message' => 'Registration successful']);
            break;

        case 'login':
            $email = $data['email'] ?? '';
            $password = $data['password'] ?? '';
            if (empty($email) || empty($password)) { throw new Exception('Email and password are required'); }
            $stmt = $conn->prepare("SELECT id, fullName, password FROM users WHERE email = ?");
            $stmt->execute([$email]);
            $user = $stmt->fetch();
            if ($user && password_verify($password, $user['password'])) {
                $_SESSION['user_id'] = $user['id'];
                $_SESSION['user_name'] = $user['fullName'];
                echo json_encode(['success' => true, 'message' => 'Login successful']);
            } else { throw new Exception('Invalid email or password'); }
            break;

        case 'check_session':
            echo json_encode(['success' => true, 'auth' => true, 'name' => $_SESSION['user_name']]);
            break;

        case 'logout':
            session_unset();
            session_destroy();
            echo json_encode(['success' => true, 'message' => 'Logged out']);
            break;

        // --- CROP MANAGEMENT ---
        
        case 'get_user_crops':
            $stmt = $conn->prepare("SELECT * FROM user_crops WHERE user_id = ? ORDER BY planting_date DESC");
            $stmt->execute([$user_id]);
            echo json_encode(['success' => true, 'crops' => $stmt->fetchAll()]);
            break;
            
        case 'add_new_crop':
            
            // Pengurusan Upload File DIBUANG sepenuhnya, tetapi kod ditinggalkan untuk rujukan
            $imageUrl = null; 
            
            $plantingDate = $data['planting_date'] ?? null;
            $cropType = $data['crop_type'] ?? 'other'; 
            $fieldLocation = $data['field_location'] ?? null;
            $healthStatus = $data['health_status'] ?? 95;
            $soilMoisture = $data['soil_moisture'] ?? 70;
            $notes = $data['notes'] ?? '';
            $lastWateredDate = $data['last_watered'] ?? $plantingDate; 

            if (empty($data['crop_name']) || empty($plantingDate) || empty($fieldLocation)) {
                throw new Exception('Crop Name, Location, and Planting Date are required.');
            }
            
            $nextFertilizationDate = date('Y-m-d', strtotime($plantingDate . ' +30 days'));
            
            $stmt = $conn->prepare("INSERT INTO user_crops 
                (user_id, crop_name, crop_type, field_location, planting_date, health_status, soil_moisture, notes, last_watered, next_fertilization, image_url)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)");
                
            try {
                $result = $stmt->execute([
                    $user_id,
                    $data['crop_name'], $cropType, $fieldLocation, 
                    $plantingDate, $healthStatus, $soilMoisture, 
                    $notes, $lastWateredDate, $nextFertilizationDate, 
                    $imageUrl
                ]);
            } catch (PDOException $e) {
                 throw new Exception("Database INSERT failed. SQL Error: " . $e->getMessage());
            }

            if (!$result) { throw new Exception('Database execution failed.'); }
            echo json_encode(['success' => true, 'message' => 'New crop added']);
            break;
        
        case 'get_crop_details':
            $cropId = $data['crop_id'] ?? 0;
            $stmtCrop = $conn->prepare("SELECT * FROM user_crops WHERE id = ? AND user_id = ?");
            $stmtCrop->execute([$cropId, $user_id]);
            $crop = $stmtCrop->fetch();
            $stmtHistory = $conn->prepare("SELECT * FROM crop_history WHERE crop_id = ? ORDER BY action_date DESC");
            $stmtHistory->execute([$cropId]);
            $history = $stmtHistory->fetchAll();
            if ($crop) {
                echo json_encode(['success' => true, 'crop' => $crop, 'history' => $history]);
            } else {
                throw new Exception('Crop not found.');
            }
            break;
            
        case 'update_crop':
            $cropId = $data['crop_id'] ?? 0;
            $imageUrl = null; // Ditetapkan NULL
            
            $stmt = $conn->prepare("UPDATE user_crops SET 
                crop_name = ?, crop_type = ?, field_location = ?, planting_date = ?, 
                health_status = ?, soil_moisture = ?, last_watered = ?, next_fertilization = ?, 
                notes = ?, image_url = ?
                WHERE id = ? AND user_id = ?");
            
            $stmt->execute([
                $data['crop_name'], $data['crop_type'], $data['field_location'], 
                $data['planting_date'], $data['health_status'], $data['soil_moisture'], 
                $data['last_watered'], $data['next_fertilization'], $data['notes'], 
                $imageUrl, $cropId, $user_id
            ]);
            echo json_encode(['success' => true, 'message' => 'Crop updated successfully']);
            break;

        case 'log_crop_action':
            $cropId = $data['crop_id'] ?? 0;
            $actionType = $data['action_type'] ?? '';
            $notes = $data['action_notes'] ?? '';
            if (empty($actionType) || empty($cropId)) { throw new Exception('Missing action type or crop ID'); }
            $stmt = $conn->prepare("INSERT INTO crop_history (crop_id, action_type, action_notes) VALUES (?, ?, ?)");
            $stmt->execute([$cropId, $actionType, $notes]);
            if ($actionType === 'water') {
                $stmtUpdate = $conn->prepare("UPDATE user_crops SET last_watered = CURDATE() WHERE id = ?");
                $stmtUpdate->execute([$cropId]);
            } elseif ($actionType === 'fertilize') {
                $stmtUpdate = $conn->prepare("UPDATE user_crops SET next_fertilization = DATE_ADD(CURDATE(), INTERVAL 30 DAY) WHERE id = ?");
                $stmtUpdate->execute([$cropId]);
            }
            echo json_encode(['success' => true, 'message' => 'Action logged and crop status updated']);
            break;

        case 'delete_crop':
            $cropId = $data['crop_id'] ?? 0;
            $stmt = $conn->prepare("DELETE FROM user_crops WHERE id = ? AND user_id = ?");
            $stmt->execute([$cropId, $user_id]);
            echo json_encode(['success' => true, 'message' => 'Crop deleted successfully.']);
            break;

        // --- WEATHER ---
        case 'get_weather':
            check_auth();
            $lat = $_GET['lat'] ?? '0';
            $lon = $_GET['lon'] ?? '0';
            $url = "https://api.openweathermap.org/data/3.0/onecall?lat=$lat&lon=$lon&exclude=minutely&units=metric&appid=$openWeatherApiKey";
            $ch = curl_init();
            curl_setopt($ch, CURLOPT_URL, $url);
            curl_setopt($ch, CURLOPT_RETURNTRANSFER, 1);
            $output = curl_exec($ch);
            if ($output === false) { curl_close($ch); throw new Exception('Failed to fetch weather data. cURL Error.'); }
            curl_close($ch);
            $weatherData = json_decode($output, true);
            if ($weatherData === null || (isset($weatherData['cod']) && $weatherData['cod'] !== 200)) {
                 $errorMsg = $weatherData['message'] ?? 'Failed to decode weather data.';
                 throw new Exception($errorMsg);
            }
            echo json_encode(['success' => true, 'data' => $weatherData]);
            break;
            
        default:
            throw new Exception('Invalid action');
    }
} catch (Exception $e) {
    echo json_encode(['success' => false, 'message' => $e->getMessage()]);
}
?>