-- INDIA SHARED TRANSPORT NETWORK — SUPABASE POSTGRESQL SCHEMA

DROP TABLE IF EXISTS complaints CASCADE;
DROP TABLE IF EXISTS reviews CASCADE;
DROP TABLE IF EXISTS notifications CASCADE;
DROP TABLE IF EXISTS tracking CASCADE;
DROP TABLE IF EXISTS payments CASCADE;
DROP TABLE IF EXISTS bookings CASCADE;
DROP TABLE IF EXISTS cargo CASCADE;
DROP TABLE IF EXISTS trucks CASCADE;
DROP TABLE IF EXISTS users CASCADE;

-- 1. USERS TABLE
CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    phone VARCHAR(50),
    company_name VARCHAR(255),
    role VARCHAR(50) NOT NULL, -- 'BUSINESS', 'TRUCK_OWNER', 'ADMIN'
    status VARCHAR(50) NOT NULL DEFAULT 'ACTIVE', -- 'ACTIVE', 'BLOCKED'
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 2. TRUCKS TABLE
CREATE TABLE trucks (
    id SERIAL PRIMARY KEY,
    vehicle_number VARCHAR(50) NOT NULL UNIQUE,
    vehicle_type VARCHAR(100) NOT NULL,
    max_capacity DECIMAL(10,2) NOT NULL,
    available_capacity DECIMAL(10,2) NOT NULL,
    current_location VARCHAR(255) NOT NULL,
    original_pickup_location VARCHAR(255) NOT NULL,
    destination VARCHAR(255) NOT NULL,
    return_destination VARCHAR(255),
    status VARCHAR(50) NOT NULL DEFAULT 'AVAILABLE', -- 'AVAILABLE', 'BOOKED', 'IN_TRANSIT', 'RETURN_AVAILABLE', 'RETURN_BOOKED'
    owner_id INT,
    availability_date DATE,
    expected_destination_date DATE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_trucks_owner FOREIGN KEY (owner_id) REFERENCES users(id) ON DELETE SET NULL
);

-- 3. CARGO TABLE
CREATE TABLE cargo (
    id SERIAL PRIMARY KEY,
    cargo_name VARCHAR(255) NOT NULL,
    pickup_location VARCHAR(255) NOT NULL,
    destination VARCHAR(255) NOT NULL,
    weight DECIMAL(10,2) NOT NULL,
    description TEXT,
    pickup_date DATE,
    required_delivery_date DATE,
    preferred_vehicle_type VARCHAR(100),
    special_handling TEXT,
    status VARCHAR(50) NOT NULL DEFAULT 'SEARCHING', -- 'SEARCHING', 'MATCHED', 'BOOKED', 'IN_TRANSIT', 'DELIVERED', 'CANCELLED'
    business_id INT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_cargo_business FOREIGN KEY (business_id) REFERENCES users(id) ON DELETE SET NULL
);

-- 4. BOOKINGS TABLE
CREATE TABLE bookings (
    id SERIAL PRIMARY KEY,
    booking_code VARCHAR(50) NOT NULL UNIQUE,
    business_id INT,
    truck_id INT,
    cargo_id INT,
    pickup_location VARCHAR(255) NOT NULL,
    destination VARCHAR(255) NOT NULL,
    weight DECIMAL(10,2) NOT NULL,
    transport_cost DECIMAL(10,2) NOT NULL,
    platform_fee DECIMAL(10,2) NOT NULL,
    total_cost DECIMAL(10,2) NOT NULL,
    booking_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    status VARCHAR(50) NOT NULL DEFAULT 'CONFIRMED', -- 'SEARCHING', 'MATCHED', 'BOOKING_REQUESTED', 'CONFIRMED', 'CARGO_PICKED_UP', 'IN_TRANSIT', 'DELIVERED', 'CANCELLED', 'RETURN_BOOKED'
    is_return_load BOOLEAN DEFAULT FALSE,
    original_business_id INT, -- Mandatory for return-load matching!
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_bookings_business FOREIGN KEY (business_id) REFERENCES users(id) ON DELETE SET NULL,
    CONSTRAINT fk_bookings_truck FOREIGN KEY (truck_id) REFERENCES trucks(id) ON DELETE SET NULL,
    CONSTRAINT fk_bookings_cargo FOREIGN KEY (cargo_id) REFERENCES cargo(id) ON DELETE SET NULL,
    CONSTRAINT fk_bookings_orig_business FOREIGN KEY (original_business_id) REFERENCES users(id) ON DELETE SET NULL
);

-- 5. PAYMENTS TABLE
CREATE TABLE payments (
    id SERIAL PRIMARY KEY,
    booking_id INT,
    transaction_id VARCHAR(100) NOT NULL UNIQUE,
    amount DECIMAL(10,2) NOT NULL,
    platform_fee DECIMAL(10,2) NOT NULL,
    total_amount DECIMAL(10,2) NOT NULL,
    payment_method VARCHAR(50) NOT NULL,
    payment_status VARCHAR(50) NOT NULL DEFAULT 'PENDING', -- 'PENDING', 'PAID', 'FAILED'
    paid_at TIMESTAMP,
    CONSTRAINT fk_payments_booking FOREIGN KEY (booking_id) REFERENCES bookings(id) ON DELETE SET NULL
);

-- 6. TRACKING TABLE
CREATE TABLE tracking (
    id SERIAL PRIMARY KEY,
    booking_id INT,
    current_location VARCHAR(255) NOT NULL,
    status VARCHAR(50) NOT NULL,
    latitude DOUBLE PRECISION NOT NULL,
    longitude DOUBLE PRECISION NOT NULL,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    notes TEXT,
    CONSTRAINT fk_tracking_booking FOREIGN KEY (booking_id) REFERENCES bookings(id) ON DELETE SET NULL
);

-- 7. NOTIFICATIONS TABLE
CREATE TABLE notifications (
    id SERIAL PRIMARY KEY,
    user_id INT,
    title VARCHAR(255) NOT NULL,
    message TEXT NOT NULL,
    type VARCHAR(50) NOT NULL,
    read_status BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_notifications_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
);

-- 8. REVIEWS TABLE
CREATE TABLE reviews (
    id SERIAL PRIMARY KEY,
    booking_id INT,
    business_id INT,
    truck_id INT,
    rating INT NOT NULL CHECK (rating >= 1 AND rating <= 5),
    comment TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_reviews_booking FOREIGN KEY (booking_id) REFERENCES bookings(id) ON DELETE SET NULL,
    CONSTRAINT fk_reviews_business FOREIGN KEY (business_id) REFERENCES users(id) ON DELETE SET NULL,
    CONSTRAINT fk_reviews_truck FOREIGN KEY (truck_id) REFERENCES trucks(id) ON DELETE SET NULL
);

-- 9. COMPLAINTS TABLE
CREATE TABLE complaints (
    id SERIAL PRIMARY KEY,
    user_id INT,
    booking_id INT,
    subject VARCHAR(255) NOT NULL,
    description TEXT NOT NULL,
    status VARCHAR(50) NOT NULL DEFAULT 'PENDING',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_complaints_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL,
    CONSTRAINT fk_complaints_booking FOREIGN KEY (booking_id) REFERENCES bookings(id) ON DELETE SET NULL
);

-- INDEXES FOR PERFORMANCE
CREATE INDEX idx_trucks_status ON trucks(status);
CREATE INDEX idx_cargo_status ON cargo(status);
CREATE INDEX idx_cargo_route ON cargo(pickup_location, destination);
CREATE INDEX idx_bookings_user ON bookings(business_id);
CREATE INDEX idx_bookings_truck ON bookings(truck_id);
