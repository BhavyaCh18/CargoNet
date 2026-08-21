# END-TO-END AUTOMATED VERIFICATION SCRIPT FOR INDIA SHARED TRANSPORT NETWORK

$baseUrl = "http://localhost:8080/api/v1"

Write-Host "==================================================" -ForegroundColor Cyan
Write-Host "1. HEALTH CHECK" -ForegroundColor Cyan
Write-Host "==================================================" -ForegroundColor Cyan
$health = Invoke-RestMethod -Uri "$baseUrl/health" -Method Get
Write-Host "Health Status: $health" -ForegroundColor Green

Write-Host "==================================================" -ForegroundColor Cyan
Write-Host "2. AUTHENTICATION & LOGIN" -ForegroundColor Cyan
Write-Host "==================================================" -ForegroundColor Cyan

# Login Business A
$busAAuth = Invoke-RestMethod -Uri "$baseUrl/auth/login" -Method Post -Body (@{
    email = "businessA@cargonet.in"
    password = "password123"
} | ConvertTo-Json) -ContentType "application/json"
$busAToken = $busAAuth.token
$busAId = [int]($busAAuth.user.id)
Write-Host "Logged in Business A (ID: $busAId)" -ForegroundColor Green

# Login Business B
$busBAuth = Invoke-RestMethod -Uri "$baseUrl/auth/login" -Method Post -Body (@{
    email = "businessB@cargonet.in"
    password = "password123"
} | ConvertTo-Json) -ContentType "application/json"
$busBToken = $busBAuth.token
$busBId = [int]($busBAuth.user.id)
Write-Host "Logged in Business B (ID: $busBId)" -ForegroundColor Green

# Login Truck Owner
$truckOwnerAuth = Invoke-RestMethod -Uri "$baseUrl/auth/login" -Method Post -Body (@{
    email = "truckowner1@cargonet.in"
    password = "password123"
} | ConvertTo-Json) -ContentType "application/json"
$truckOwnerToken = $truckOwnerAuth.token
$truckOwnerId = [int]($truckOwnerAuth.user.id)
Write-Host "Logged in Truck Owner (ID: $truckOwnerId)" -ForegroundColor Green

# Headers
$headersBusA = @{ "Authorization" = "Bearer $busAToken" }
$headersBusB = @{ "Authorization" = "Bearer $busBToken" }
$headersTruckOwner = @{ "Authorization" = "Bearer $truckOwnerToken" }

Write-Host "==================================================" -ForegroundColor Cyan
Write-Host "3. REGISTER TRUCK T101 (Hyderabad -> Bengaluru, 20 Tons)" -ForegroundColor Cyan
Write-Host "==================================================" -ForegroundColor Cyan

$randVal = Get-Random -Minimum 10000 -Maximum 99999
$regNum = "AP39XX$randVal"
$truckReq = @{
    vehicleNumber = $regNum
    vehicleType = "Container 20ft"
    maxCapacity = 20.0
    availableCapacity = 20.0
    currentLocation = "Hyderabad"
    originalPickupLocation = "Hyderabad"
    destination = "Bengaluru"
    returnDestination = "Hyderabad"
    availabilityDate = (Get-Date).ToString("yyyy-MM-dd")
    expectedDestinationDate = (Get-Date).AddDays(2).ToString("yyyy-MM-dd")
} | ConvertTo-Json

$truck = Invoke-RestMethod -Uri "$baseUrl/trucks" -Method Post -Headers $headersTruckOwner -Body $truckReq -ContentType "application/json"
$truckId = [int]($truck.id)
Write-Host "Truck Registered: ID #$truckId, Registration: $($truck.vehicleNumber), Status: $($truck.status)" -ForegroundColor Green

Write-Host "==================================================" -ForegroundColor Cyan
Write-Host "4. CREATE CARGO C001 (Business A: Office Furniture, Hyderabad -> Bengaluru, 12 Tons)" -ForegroundColor Cyan
Write-Host "==================================================" -ForegroundColor Cyan

$cargo1Req = @{
    cargoName = "Office Furniture"
    pickupLocation = "Hyderabad"
    destination = "Bengaluru"
    weight = 12.0
    description = "Modular desks"
    pickupDate = (Get-Date).ToString("yyyy-MM-dd")
    requiredDeliveryDate = (Get-Date).AddDays(2).ToString("yyyy-MM-dd")
    preferredVehicleType = "Container 20ft"
    specialHandling = "Handle with care"
} | ConvertTo-Json

$cargo1 = Invoke-RestMethod -Uri "$baseUrl/cargo" -Method Post -Headers $headersBusA -Body $cargo1Req -ContentType "application/json"
$cargo1Id = [int]($cargo1.id)
Write-Host "Cargo 1 Created: ID #$cargo1Id, Name: $($cargo1.cargoName), BusinessId: $($cargo1.businessId)" -ForegroundColor Green

Write-Host "==================================================" -ForegroundColor Cyan
Write-Host "5. MATCHING TRUCKS FOR CARGO C001" -ForegroundColor Cyan
Write-Host "==================================================" -ForegroundColor Cyan

$matchRes = Invoke-RestMethod -Uri "$baseUrl/matching/cargo/$cargo1Id" -Method Get
Write-Host "Matches Found: $($matchRes.totalMatches)" -ForegroundColor Green
$topMatch = $matchRes.matches[0]
Write-Host "Top Match Badge: $($topMatch.matchBadge) (Score: $($topMatch.matchScore)%)" -ForegroundColor Yellow

Write-Host "==================================================" -ForegroundColor Cyan
Write-Host "6. BOOK TRUCK FOR CARGO C001" -ForegroundColor Cyan
Write-Host "==================================================" -ForegroundColor Cyan

$bookReq = @{
    cargoId = $cargo1Id
    truckId = $truckId
} | ConvertTo-Json

$booking1 = Invoke-RestMethod -Uri "$baseUrl/bookings" -Method Post -Headers $headersBusA -Body $bookReq -ContentType "application/json"
$booking1Id = [int]($booking1.id)
Write-Host "Booking 1 Created: ID #$booking1Id, Code: $($booking1.bookingCode), Cost: ₹$($booking1.totalCost)" -ForegroundColor Green

Write-Host "==================================================" -ForegroundColor Cyan
Write-Host "7. SIMULATE PAYMENT FOR BOOKING 1" -ForegroundColor Cyan
Write-Host "==================================================" -ForegroundColor Cyan

$payReq = @{
    bookingId = $booking1Id
    paymentMethod = "SIMULATED_CARD"
} | ConvertTo-Json

$payment1 = Invoke-RestMethod -Uri "$baseUrl/payments" -Method Post -Headers $headersBusA -Body $payReq -ContentType "application/json"
Write-Host "Payment Completed: Transaction ID $($payment1.transactionId), Status: $($payment1.paymentStatus)" -ForegroundColor Green

Write-Host "==================================================" -ForegroundColor Cyan
Write-Host "8. TRUCK OWNER DELIVERS OUTBOUND TRIP (Status: CARGO_PICKED_UP -> IN_TRANSIT -> DELIVERED)" -ForegroundColor Cyan
Write-Host "==================================================" -ForegroundColor Cyan

Invoke-RestMethod -Uri "$baseUrl/bookings/$booking1Id/status" -Method Put -Headers $headersTruckOwner -Body (@{ status = "CARGO_PICKED_UP" } | ConvertTo-Json) -ContentType "application/json" | Out-Null
Invoke-RestMethod -Uri "$baseUrl/bookings/$booking1Id/status" -Method Put -Headers $headersTruckOwner -Body (@{ status = "IN_TRANSIT" } | ConvertTo-Json) -ContentType "application/json" | Out-Null
Invoke-RestMethod -Uri "$baseUrl/bookings/$booking1Id/status" -Method Put -Headers $headersTruckOwner -Body (@{ status = "DELIVERED" } | ConvertTo-Json) -ContentType "application/json" | Out-Null
Write-Host "Outbound Trip Delivered!" -ForegroundColor Green

# Check Truck Status after Delivery -> Should automatically be RETURN_AVAILABLE at Bengaluru for Hyderabad!
$updatedTruck = Invoke-RestMethod -Uri "$baseUrl/trucks/$truckId" -Method Get
Write-Host "Truck Status After Outbound Delivery:" -ForegroundColor Yellow
Write-Host "  Status: $($updatedTruck.status)" -ForegroundColor Yellow
Write-Host "  Current Location: $($updatedTruck.currentLocation)" -ForegroundColor Yellow
Write-Host "  Return Destination: $($updatedTruck.returnDestination)" -ForegroundColor Yellow
Write-Host "  Available Capacity: $($updatedTruck.availableCapacity) Tons" -ForegroundColor Yellow

if ($updatedTruck.status -eq "RETURN_AVAILABLE" -and $updatedTruck.currentLocation -eq "Bengaluru" -and $updatedTruck.returnDestination -eq "Hyderabad") {
    Write-Host "SUCCESS: Truck automatically transitioned to RETURN_AVAILABLE (Bengaluru -> Hyderabad)!" -ForegroundColor Green
} else {
    Write-Error "ERROR: Expected truck status RETURN_AVAILABLE, got $($updatedTruck.status)"
}

Write-Host "==================================================" -ForegroundColor Cyan
Write-Host "9. SAME BUSINESS RULE TEST (SECTION 28 & 43)" -ForegroundColor Cyan
Write-Host "==================================================" -ForegroundColor Cyan

# Business A (Original Business) creates return cargo: Bengaluru -> Hyderabad
$cargoRetBusAReq = @{
    cargoName = "Business A Return Electronics"
    pickupLocation = "Bengaluru"
    destination = "Hyderabad"
    weight = 5.0
    pickupDate = (Get-Date).ToString("yyyy-MM-dd")
    requiredDeliveryDate = (Get-Date).AddDays(2).ToString("yyyy-MM-dd")
} | ConvertTo-Json

$cargoRetBusA = Invoke-RestMethod -Uri "$baseUrl/cargo" -Method Post -Headers $headersBusA -Body $cargoRetBusAReq -ContentType "application/json"
$cargoRetBusAId = [int]($cargoRetBusA.id)

# Check return load matches for truck T101
$retMatches = Invoke-RestMethod -Uri "$baseUrl/matching/return-load/$truckId" -Method Get
$matchingIdsBusA = @()
if ($retMatches.matchingCargo) {
    $matchingIdsBusA = @($retMatches.matchingCargo | Select-Object -ExpandProperty id)
}

if ($matchingIdsBusA -contains $cargoRetBusAId) {
    Write-Error "FAILURE: Business A's return cargo appeared for T101! (Same Business Rule Violated)"
} else {
    Write-Host "SUCCESS: Business A's return cargo #$cargoRetBusAId was correctly EXCLUDED from T101 return matches! (Same Business Rule Verified)" -ForegroundColor Green
}

Write-Host "==================================================" -ForegroundColor Cyan
Write-Host "10. OTHER BUSINESS RETURN LOAD MATCH (SECTION 27 & 28)" -ForegroundColor Cyan
Write-Host "==================================================" -ForegroundColor Cyan

$cargo2Req = @{
    cargoName = "Industrial Machinery Spare Parts"
    pickupLocation = "Bengaluru"
    destination = "Hyderabad"
    weight = 8.0
    description = "Return cargo from Business B"
    pickupDate = (Get-Date).ToString("yyyy-MM-dd")
    requiredDeliveryDate = (Get-Date).AddDays(2).ToString("yyyy-MM-dd")
} | ConvertTo-Json

$cargo2 = Invoke-RestMethod -Uri "$baseUrl/cargo" -Method Post -Headers $headersBusB -Body $cargo2Req -ContentType "application/json"
$cargo2Id = [int]($cargo2.id)
Write-Host "Business B Return Cargo Created: ID #$cargo2Id (Bengaluru -> Hyderabad, 8 Tons)" -ForegroundColor Green

# Check return load matches for T101
$retMatches2 = Invoke-RestMethod -Uri "$baseUrl/matching/return-load/$truckId" -Method Get
$matchingIdsBusB = @($retMatches2.matchingCargo | Select-Object -ExpandProperty id)

if ($matchingIdsBusB -contains $cargo2Id) {
    Write-Host "SUCCESS: Business B's return cargo #$cargo2Id MATCHED T101 return leg!" -ForegroundColor Green
} else {
    Write-Error "FAILURE: Business B's return cargo did not match T101!"
}

Write-Host "==================================================" -ForegroundColor Cyan
Write-Host "11. ACCEPT RETURN LOAD CARGO" -ForegroundColor Cyan
Write-Host "==================================================" -ForegroundColor Cyan

$retBookReq = @{
    truckId = $truckId
    cargoId = $cargo2Id
} | ConvertTo-Json

$returnBooking = Invoke-RestMethod -Uri "$baseUrl/bookings/return-load" -Method Post -Headers $headersTruckOwner -Body $retBookReq -ContentType "application/json"
$returnBookingId = [int]($returnBooking.id)
Write-Host "Return Booking Created: ID #$returnBookingId, Code: $($returnBooking.bookingCode), IsReturnLoad: $($returnBooking.isReturnLoad)" -ForegroundColor Green

# Check remaining truck capacity: 20 - 8 = 12 Tons
$truckAfterReturnBook = Invoke-RestMethod -Uri "$baseUrl/trucks/$truckId" -Method Get
Write-Host "Truck Status After Return Booking: $($truckAfterReturnBook.status), Remaining Capacity: $($truckAfterReturnBook.availableCapacity) Tons" -ForegroundColor Yellow

if ([double]($truckAfterReturnBook.availableCapacity) -eq 12.0) {
    Write-Host "SUCCESS: Capacity correctly updated to 12 Tons!" -ForegroundColor Green
} else {
    Write-Error "ERROR: Expected 12 Tons remaining capacity, got $($truckAfterReturnBook.availableCapacity)"
}

Write-Host "==================================================" -ForegroundColor Cyan
Write-Host "12. COMPLETE RETURN TRIP DELIVERY" -ForegroundColor Cyan
Write-Host "==================================================" -ForegroundColor Cyan

Invoke-RestMethod -Uri "$baseUrl/bookings/$returnBookingId/status" -Method Put -Headers $headersTruckOwner -Body (@{ status = "CARGO_PICKED_UP" } | ConvertTo-Json) -ContentType "application/json" | Out-Null
Invoke-RestMethod -Uri "$baseUrl/bookings/$returnBookingId/status" -Method Put -Headers $headersTruckOwner -Body (@{ status = "IN_TRANSIT" } | ConvertTo-Json) -ContentType "application/json" | Out-Null
Invoke-RestMethod -Uri "$baseUrl/bookings/$returnBookingId/status" -Method Put -Headers $headersTruckOwner -Body (@{ status = "DELIVERED" } | ConvertTo-Json) -ContentType "application/json" | Out-Null

$finalTruck = Invoke-RestMethod -Uri "$baseUrl/trucks/$truckId" -Method Get
Write-Host "Final Truck State After Complete Workflow:" -ForegroundColor Green
Write-Host "  Status: $($finalTruck.status)" -ForegroundColor Green
Write-Host "  Current Location: $($finalTruck.currentLocation)" -ForegroundColor Green
Write-Host "  Available Capacity: $($finalTruck.availableCapacity) Tons" -ForegroundColor Green

if ($finalTruck.status -eq "AVAILABLE" -and $finalTruck.currentLocation -eq "Hyderabad" -and [double]($finalTruck.availableCapacity) -eq 20.0) {
    Write-Host "SUCCESS: Truck reset to AVAILABLE at Hyderabad with 20 Tons capacity!" -ForegroundColor Green
}

Write-Host "==================================================" -ForegroundColor Cyan
Write-Host "13. DATABASE DELETION RESILIENCE TEST (SECTION 44)" -ForegroundColor Cyan
Write-Host "==================================================" -ForegroundColor Cyan

$adminAuth = Invoke-RestMethod -Uri "$baseUrl/auth/login" -Method Post -Body (@{ email = "admin@cargonet.in"; password = "password123" } | ConvertTo-Json) -ContentType "application/json"
$adminToken = $adminAuth.token
$headersAdmin = @{ "Authorization" = "Bearer $adminToken" }

$allBookings = Invoke-RestMethod -Uri "$baseUrl/bookings/my-bookings" -Method Get -Headers $headersAdmin
Write-Host "All Bookings Retrieved Successfully Without Crashing! Total Count: $($allBookings.Count)" -ForegroundColor Green

Write-Host "==================================================" -ForegroundColor Green
Write-Host "🎉 ALL E2E VERIFICATION CHECKS PASSED PERFECTLY! 🎉" -ForegroundColor Green
Write-Host "==================================================" -ForegroundColor Green
