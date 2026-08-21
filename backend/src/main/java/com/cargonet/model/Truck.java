package com.cargonet.model;

import java.time.LocalDate;
import java.time.LocalDateTime;

public class Truck {
    private Integer id;
    private String vehicleNumber;
    private String vehicleType;
    private Double maxCapacity;
    private Double availableCapacity;
    private String currentLocation;
    private String originalPickupLocation;
    private String destination;
    private String returnDestination;
    private String status; // AVAILABLE, BOOKED, IN_TRANSIT, RETURN_AVAILABLE, RETURN_BOOKED
    private Integer ownerId;
    private String ownerName = "Independent Transporter";
    private String ownerPhone;
    private LocalDate availabilityDate;
    private LocalDate expectedDestinationDate;
    private LocalDateTime createdAt;

    public Truck() {}

    public Integer getId() { return id; }
    public void setId(Integer id) { this.id = id; }

    public String getVehicleNumber() { return vehicleNumber; }
    public void setVehicleNumber(String vehicleNumber) { this.vehicleNumber = vehicleNumber; }

    public String getVehicleType() { return vehicleType; }
    public void setVehicleType(String vehicleType) { this.vehicleType = vehicleType; }

    public Double getMaxCapacity() { return maxCapacity; }
    public void setMaxCapacity(Double maxCapacity) { this.maxCapacity = maxCapacity; }

    public Double getAvailableCapacity() { return availableCapacity; }
    public void setAvailableCapacity(Double availableCapacity) { this.availableCapacity = availableCapacity; }

    public String getCurrentLocation() { return currentLocation; }
    public void setCurrentLocation(String currentLocation) { this.currentLocation = currentLocation; }

    public String getOriginalPickupLocation() { return originalPickupLocation; }
    public void setOriginalPickupLocation(String originalPickupLocation) { this.originalPickupLocation = originalPickupLocation; }

    public String getDestination() { return destination; }
    public void setDestination(String destination) { this.destination = destination; }

    public String getReturnDestination() { return returnDestination; }
    public void setReturnDestination(String returnDestination) { this.returnDestination = returnDestination; }

    public String getStatus() { return status; }
    public void setStatus(String status) { this.status = status; }

    public Integer getOwnerId() { return ownerId; }
    public void setOwnerId(Integer ownerId) { this.ownerId = ownerId; }

    public String getOwnerName() { return ownerName != null ? ownerName : "Independent Transporter"; }
    public void setOwnerName(String ownerName) { this.ownerName = ownerName; }

    public String getOwnerPhone() { return ownerPhone; }
    public void setOwnerPhone(String ownerPhone) { this.ownerPhone = ownerPhone; }

    public LocalDate getAvailabilityDate() { return availabilityDate; }
    public void setAvailabilityDate(LocalDate availabilityDate) { this.availabilityDate = availabilityDate; }

    public LocalDate getExpectedDestinationDate() { return expectedDestinationDate; }
    public void setExpectedDestinationDate(LocalDate expectedDestinationDate) { this.expectedDestinationDate = expectedDestinationDate; }

    public LocalDateTime getCreatedAt() { return createdAt; }
    public void setCreatedAt(LocalDateTime createdAt) { this.createdAt = createdAt; }
}
