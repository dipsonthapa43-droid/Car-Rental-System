-- Car Rental System - Database Setup
CREATE DATABASE IF NOT EXISTS drivenepal;
USE drivenepal;

-- Users Table
CREATE TABLE IF NOT EXISTS users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    first_name VARCHAR(50) NOT NULL,
    last_name VARCHAR(50) NOT NULL,
    email VARCHAR(100) NOT NULL UNIQUE,
    dob DATE DEFAULT NULL,
    phone VARCHAR(15),
    license_no VARCHAR(50),
    password VARCHAR(255) NOT NULL,
    role ENUM('user', 'admin') DEFAULT 'user',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Cars Table
CREATE TABLE IF NOT EXISTS cars (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    category VARCHAR(50) NOT NULL,
    price_per_day DECIMAL(10, 2) NOT NULL,
    transmission VARCHAR(20) DEFAULT 'Auto',
    fuel_type VARCHAR(20) DEFAULT 'Petrol',
    seats INT DEFAULT 5,
    image_path VARCHAR(255),
    status ENUM('available', 'rented', 'maintenance') DEFAULT 'available',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Bookings Table
CREATE TABLE IF NOT EXISTS bookings (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    car_id INT NOT NULL,
    pickup_location VARCHAR(100),
    dropoff_location VARCHAR(100),
    pickup_date DATE NOT NULL,
    return_date DATE NOT NULL,
    total_price DECIMAL(10, 2) NOT NULL,
    status ENUM('pending', 'confirmed', 'completed', 'cancelled') DEFAULT 'pending',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (car_id) REFERENCES cars(id) ON DELETE CASCADE
);

-- Initial Car Data
INSERT INTO cars (name, category, price_per_day, transmission, fuel_type, seats, image_path, status) VALUES 
('Toyota Yaris', 'Sedan', 3500.00, 'Auto', 'Petrol', 5, 'Available Cars for boking/Yaris.jpg', 'available'),
('Honda City', 'Sedan', 4200.00, 'Auto', 'Petrol', 5, 'Available Cars for boking/Honda City.jpg', 'available'),
('Toyota Fortuner', 'SUV', 6500.00, 'Manual', 'Diesel', 7, 'Available Cars for boking/Toyota Fortuner.jpg', 'available'),
('Hyundai Tucson', 'SUV', 5800.00, 'Auto', 'Petrol', 5, 'Available Cars for boking/Hyundai Tucson.jpg', 'available'),
('Mahindra Scorpio', 'SUV', 5500.00, 'Manual', 'Diesel', 7, 'Available Cars for boking/Mahindra Scorpio.jpg', 'available'),
('Suzuki Swift', 'Hatchback', 2800.00, 'Manual', 'Petrol', 5, 'Available Cars for boking/Suzuki Swift.jpg', 'available');

-- Initial Admin Account (Password: admin123)
INSERT INTO users (first_name, last_name, email, password, role) VALUES 
('System', 'Admin', 'admin@drivenepal.com', '$2y$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'admin');
