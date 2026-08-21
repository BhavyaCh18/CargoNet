$body = @{
    name = "Test User"
    email = "testreg" + (Get-Random) + "@cargonet.in"
    password = "password123"
    role = "BUSINESS"
    companyName = "Test Co"
} | ConvertTo-Json

$reg = Invoke-RestMethod -Uri "http://localhost:8080/api/v1/auth/register" -Method Post -Body $body -ContentType "application/json"
Write-Host "Registered User ID: $($reg.user.id)"

# Fetch password hash from DB for the newly registered user
$mysqlPath = "C:\Program Files\MySQL\MySQL Server 8.4\bin\mysql.exe"
$hash = & $mysqlPath -u root --execute="USE india_shared_transport; SELECT password_hash FROM users WHERE email='$($body.email)';" -s -N

Write-Host "Generated BCrypt Hash: $hash"

# Copy valid hash to all seed users
& $mysqlPath -u root --execute="USE india_shared_transport; UPDATE users SET password_hash='$hash';"
Write-Host "Updated all users with valid password_hash for 'password123'!"
