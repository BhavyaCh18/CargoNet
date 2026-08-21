$baseUrl = "http://localhost:8080/api/v1"

# 1. Admin
$admin = @{
    name = "Admin User"
    email = "admin@cargonet.in"
    password = "password123"
    role = "ADMIN"
    companyName = "CargoNet Operations"
} | ConvertTo-Json

Invoke-RestMethod -Uri "$baseUrl/auth/register" -Method Post -Body $admin -ContentType "application/json"
Write-Host "Registered admin@cargonet.in" -ForegroundColor Green

# 2. Business A
$busA = @{
    name = "Apex Logistics Solutions"
    email = "businessA@cargonet.in"
    password = "password123"
    role = "BUSINESS"
    companyName = "Apex Commercial Corp"
} | ConvertTo-Json

Invoke-RestMethod -Uri "$baseUrl/auth/register" -Method Post -Body $busA -ContentType "application/json"
Write-Host "Registered businessA@cargonet.in" -ForegroundColor Green

# 3. Business B
$busB = @{
    name = "Bharat Goods Ltd"
    email = "businessB@cargonet.in"
    password = "password123"
    role = "BUSINESS"
    companyName = "Bharat Industrial Trading"
} | ConvertTo-Json

Invoke-RestMethod -Uri "$baseUrl/auth/register" -Method Post -Body $busB -ContentType "application/json"
Write-Host "Registered businessB@cargonet.in" -ForegroundColor Green

# 4. Truck Owner
$truckOwner = @{
    name = "Rajesh Transports"
    email = "truckowner1@cargonet.in"
    password = "password123"
    role = "TRUCK_OWNER"
    companyName = "Rajesh Express Freight"
} | ConvertTo-Json

Invoke-RestMethod -Uri "$baseUrl/auth/register" -Method Post -Body $truckOwner -ContentType "application/json"
Write-Host "Registered truckowner1@cargonet.in" -ForegroundColor Green
