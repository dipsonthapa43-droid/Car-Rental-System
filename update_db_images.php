<?php
require_once 'backend/db.php';

// First, clear existing cars to avoid confusion or just update them
$pdo->query("DELETE FROM cars");

$cars = [
    ['Toyota Yaris', 'Sedan', 3500, 'Auto', 'Petrol', 5, 'Available Cars for boking/Yaris.jpg'],
    ['Honda City', 'Sedan', 4200, 'Auto', 'Petrol', 5, 'Available Cars for boking/Honda City.jpg'],
    ['Toyota Fortuner', 'SUV', 6500, 'Manual', 'Diesel', 7, 'Available Cars for boking/Toyota Fortuner.jpg'],
    ['Hyundai Tucson', 'SUV', 5800, 'Auto', 'Petrol', 5, 'Available Cars for boking/Hyundai Tucson.jpg'],
    ['Mahindra Scorpio', 'SUV', 5500, 'Manual', 'Diesel', 7, 'Available Cars for boking/Mahindra Scorpio.jpg'],
    ['Suzuki Swift', 'Hatchback', 2800, 'Manual', 'Petrol', 5, 'Available Cars for boking/Suzuki Swift.jpg'],
];

foreach ($cars as $car) {
    $stmt = $pdo->prepare("INSERT INTO cars (name, category, price_per_day, transmission, fuel_type, seats, image_path, status) VALUES (?, ?, ?, ?, ?, ?, ?, 'available')");
    $stmt->execute($car);
    echo "Inserted {$car[0]}<br>";
}

echo "Database updated successfully!";
?>
