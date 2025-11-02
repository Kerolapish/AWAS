<?php
// api/db.php

// Start a session to handle user login state
if (session_status() == PHP_SESSION_NONE) {
    session_start(); // FIX: Ini HARUS dipanggil pertama kali, sebelum output apa pun.
}

// FIX: Pindahkan header() ke setelah session_start()
header('Content-Type: application/json');

// --- CONFIGURATION ---
$host = 'localhost';
$db_name = 'awas';
$username = 'root';
$password = ''; // Change this if you have a password for XAMPP/MAMP
// ---------------------

try {
    $conn = new PDO("mysql:host=$host;dbname=$db_name", $username, $password);
    $conn->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
    $conn->setAttribute(PDO::ATTR_DEFAULT_FETCH_MODE, PDO::FETCH_ASSOC);
} catch(PDOException $e) {
    // Kirim pesan error dalam format JSON yang konsisten
    echo json_encode(['success' => false, 'message' => 'Database connection failed: ' . $e->getMessage()]);
    exit();
}

// Function to check if user is logged in
function check_auth() {
    if (!isset($_SESSION['user_id'])) {
        // Jika session tidak ada, kirim respon JSON dan keluar
        echo json_encode(['success' => false, 'message' => 'Authentication required', 'auth' => false]);
        exit();
    }
    // Jika session ada, kembalikan user_id
    return $_SESSION['user_id'];
}
