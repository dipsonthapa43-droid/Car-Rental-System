<?php
require_once 'backend/db.php';

try {
    $sql = "ALTER TABLE users ADD COLUMN dob DATE DEFAULT NULL";
    $pdo->exec($sql);
    echo "<h1>Migration Successful</h1><p>DOB column added to 'users' table.</p>";
} catch (PDOException $e) {
    if (strpos($e->getMessage(), 'Duplicate column name') !== false) {
        echo "<h1>Already Migrated</h1><p>Column 'dob' already exists.</p>";
    } else {
        echo "<h1>Migration Failed</h1><p>" . $e->getMessage() . "</p>";
    }
}
?>
