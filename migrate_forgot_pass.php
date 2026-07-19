<?php
require_once 'backend/db.php';

try {
    $sql = "ALTER TABLE users 
            ADD COLUMN reset_token VARCHAR(255) DEFAULT NULL, 
            ADD COLUMN reset_expires DATETIME DEFAULT NULL";
    $pdo->exec($sql);
    echo "<h1>Migration Successful</h1><p>Reset columns added to 'users' table.</p>";
} catch (PDOException $e) {
    if (strpos($e->getMessage(), 'Duplicate column name') !== false) {
        echo "<h1>Already Migrated</h1><p>Columns already exist.</p>";
    } else {
        echo "<h1>Migration Failed</h1><p>" . $e->getMessage() . "</p>";
    }
}
?>
