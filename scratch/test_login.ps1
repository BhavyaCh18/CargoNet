$loginRes = Invoke-RestMethod -Uri "http://localhost:8080/api/v1/auth/login" -Method Post -Body (@{
    email = "truckowner1@cargonet.in"
    password = "password123"
} | ConvertTo-Json) -ContentType "application/json"

Write-Host "Token: $($loginRes.token)"
Write-Host "User Role: $($loginRes.user.role)"

$headers = @{ "Authorization" = "Bearer $($loginRes.token)" }

$me = Invoke-RestMethod -Uri "http://localhost:8080/api/v1/auth/me" -Method Get -Headers $headers
Write-Host "ME Endpoint Result:"
Write-Host ($me | ConvertTo-Json)
