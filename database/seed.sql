-- INDIA SHARED TRANSPORT NETWORK — POSTGRESQL SEED DATA

-- Clear existing data and reset identity sequences
TRUNCATE TABLE complaints, reviews, notifications, tracking, payments, bookings, cargo, trucks, users RESTART IDENTITY CASCADE;

-- 1. USERS
-- Password for all seed accounts: password123 ($2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy)
INSERT INTO users (id, name, email, password_hash, phone, company_name, role, status) VALUES
(1, 'Logistics Admin', 'admin@cargonet.in', '$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy', '9876543210', 'India Transport Corp', 'ADMIN', 'ACTIVE'),
(2, 'Deccan Retail Ltd', 'businessA@cargonet.in', '$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy', '9876543211', 'Deccan Retail Ltd', 'BUSINESS', 'ACTIVE'),
(3, 'Bangalore Electronics', 'businessB@cargonet.in', '$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy', '9876543212', 'Bangalore Electronics', 'BUSINESS', 'ACTIVE'),
(4, 'Sri Venkateswara Logistics', 'truckowner1@cargonet.in', '$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy', '9876543213', 'SV Transports', 'TRUCK_OWNER', 'ACTIVE');

SELECT setval('users_id_seq', (SELECT MAX(id) FROM users));

-- 2. TRUCKS
INSERT INTO trucks (id, vehicle_number, vehicle_type, max_capacity, available_capacity, current_location, original_pickup_location, destination, return_destination, status, owner_id, availability_date, expected_destination_date) VALUES
(1, 'AP39XX1234', 'Container 20ft', 20.00, 20.00, 'Hyderabad', 'Hyderabad', 'Bengaluru', 'Hyderabad', 'AVAILABLE', 4, CURRENT_DATE, CURRENT_DATE + INTERVAL '2 days');

SELECT setval('trucks_id_seq', (SELECT MAX(id) FROM trucks));

-- 3. CARGO
INSERT INTO cargo (id, cargo_name, pickup_location, destination, weight, description, pickup_date, required_delivery_date, preferred_vehicle_type, special_handling, status, business_id) VALUES
(1, 'Office Furniture', 'Hyderabad', 'Bengaluru', 12.00, 'Modular desks and office chairs', CURRENT_DATE, CURRENT_DATE + INTERVAL '2 days', 'Container 20ft', 'Handle with care', 'SEARCHING', 2);

SELECT setval('cargo_id_seq', (SELECT MAX(id) FROM cargo));
