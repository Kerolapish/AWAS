<?php
// api/get-ledger.php
// This file includes your database connection
include 'db.php';

try {
    // This checks if the user is logged in
    //
    $user_id = check_auth(); 

    // 1. Get all individual ledger entries
    //
    $stmt = $conn->prepare("SELECT * FROM ledger_entries WHERE user_id = ? ORDER BY date DESC");
    $stmt->execute([$user_id]);
    $entries = $stmt->fetchAll();
    
    // 2. Get the profits calculated by the database
    //
    $stmt_profit = $conn->prepare("SELECT crop, SUM(revenue - cost) as profit FROM ledger_entries WHERE user_id = ? GROUP BY crop");
    $stmt_profit->execute([$user_id]);
    $profits = $stmt_profit->fetchAll();
    
    // 3. Send all data back as one JSON object
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