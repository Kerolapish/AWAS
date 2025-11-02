<?php
error_reporting(E_ALL);
ini_set('display_errors', 1);

header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET');
header('Access-Control-Allow-Headers: Content-Type');

// OpenWeatherMap API configuration
$apiKey = '306515b318763e19aba681108b077d1c';

try {
    // Get coordinates from request
    $lat = $_GET['lat'] ?? null;
    $lon = $_GET['lon'] ?? null;

    if (!$lat || !$lon) {
        throw new Exception('Latitude and longitude are required');
    }

    // Call OpenWeatherMap API
    $url = "https://api.openweathermap.org/data/3.0/onecall?lat=$lat&lon=$lon&exclude=minutely&units=metric&appid=$apiKey";
    
    $ch = curl_init();
    curl_setopt($ch, CURLOPT_URL, $url);
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, false); // Only for development
    
    $response = curl_exec($ch);
    
    if (curl_errno($ch)) {
        throw new Exception(curl_error($ch));
    }
    
    curl_close($ch);
    
    // Forward the response directly to the client
    echo $response;

} catch (Exception $e) {
    http_response_code(500);
    echo json_encode([
        'error' => true,
        'message' => $e->getMessage()
    ]);
}