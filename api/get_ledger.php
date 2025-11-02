<?php
// --- DATABASE CONNECTION ---
$servername = "localhost";
$username = "root"; // Your MySQL username
$password = "";     // Your MySQL password
$dbname = "AWAS";

// We will assume user_id 1, just like in save-transaction.php
$user_id = 1;

$conn = new mysqli($servername, $username, $password, $dbname);

if ($conn->connect_error) {
    echo json_encode(['error' => 'Connection failed: ' . $conn->connect_error]);
    exit();
}

// --- PREPARE THE SQL QUERY ---
// Select all entries for our user, ordered by most recent date first
$sql = "SELECT crop, revenue, cost, date FROM ledger_entries WHERE user_id = ? ORDER BY date DESC";

$stmt = $conn->prepare($sql);
$stmt->bind_param("i", $user_id);
$stmt->execute();

$result = $stmt->get_result();
$data = [];

// Loop through all the rows and add them to an array
if ($result->num_rows > 0) {
    while($row = $result->fetch_assoc()) {
        $data[] = $row;
    }
}

// --- SEND THE DATA ---
// Set the header to tell the browser it's JSON data
header('Content-Type: application/json');
// Encode the array of data as JSON and send it
echo json_encode($data);

$stmt->close();
$conn->close();

?>