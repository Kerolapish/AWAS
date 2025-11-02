<?php
// --- DATABASE CONNECTION ---
// Put your database details here
$servername = "localhost";
$username = "root"; // Your MySQL username
$password = "";     // Your MySQL password
$dbname = "AWAS";

// Create connection
$conn = new mysqli($servername, $username, $password, $dbname);

// Check connection
if ($conn->connect_error) {
    echo json_encode(['success' => false, 'error' => 'Connection failed: ' . $conn->connect_error]);
    exit();
}

// --- GET DATA FROM THE FORM ---
$type = $_POST['type'];
$date = $_POST['date'];
$crop = $_POST['crop'];
$amount = (float)$_POST['amount']; // Convert amount to a float

// *** IMPORTANT ***
// We assume a 'user_id' of 1 for this example.
// In a real app, you would get this from the user's login session.
$user_id = 1; 

// --- PREPARE DATA FOR SQL ---
// Based on the 'type', we set the correct column
$revenue = 0.00;
$cost = 0.00;

if ($type == 'revenue') {
    $revenue = $amount;
} else {
    $cost = $amount;
}

// --- CREATE THE SQL QUERY ---
// We use "prepared statements" (?) to prevent SQL injection
$sql = "INSERT INTO ledger_entries (user_id, crop, revenue, cost, date) VALUES (?, ?, ?, ?, ?)";

$stmt = $conn->prepare($sql);

if ($stmt === false) {
    echo json_encode(['success' => false, 'error' => 'SQL prepare failed: ' . $conn->error]);
    exit();
}

// "issds" means: (i)nteger, (s)tring, (d)ecimal, (d)ecimal, (s)tring
$stmt->bind_param("isdds", $user_id, $crop, $revenue, $cost, $date);

// --- EXECUTE THE QUERY ---
if ($stmt->execute()) {
    // It worked! Send a success message back to the JavaScript
    echo json_encode(['success' => true]);
} else {
    // It failed. Send the error message
    echo json_encode(['success' => false, 'error' => $stmt->error]);
}

// Close the connection
$stmt->close();
$conn->close();

?>