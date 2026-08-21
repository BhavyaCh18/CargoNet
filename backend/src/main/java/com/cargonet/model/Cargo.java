package com.cargonet.model;

import java.time.LocalDate;
import java.time.LocalDateTime;

public class Cargo {
    private Integer id;
    private String cargoName;
    private String pickupLocation;
    private String destination;
    private Double weight;
    private String description;
    private LocalDate pickupDate;
    private LocalDate requiredDeliveryDate;
    private String preferredVehicleType;
    private String specialHandling;
    private String status; // SEARCHING, MATCHED, BOOKED, IN_TRANSIT, DELIVERED, CANCELLED
    private Integer businessId;
    private String businessName = "Independent Business";
    private LocalDateTime createdAt;

    public Cargo() {}

    public Integer getId() { return id; }
    public void setId(Integer id) { this.id = id; }

    public String getCargoName() { return cargoName; }
    public void setCargoName(String cargoName) { this.cargoName = cargoName; }

    public String getPickupLocation() { return pickupLocation; }
    public void setPickupLocation(String pickupLocation) { this.pickupLocation = pickupLocation; }

    public String getDestination() { return destination; }
    public void setDestination(String destination) { this.destination = destination; }

    public Double getWeight() { return weight; }
    public void setWeight(Double weight) { this.weight = weight; }

    public String getDescription() { return description; }
    public void setDescription(String description) { this.description = description; }

    public LocalDate getPickupDate() { return pickupDate; }
    public void setPickupDate(LocalDate pickupDate) { this.pickupDate = pickupDate; }

    public LocalDate getRequiredDeliveryDate() { return requiredDeliveryDate; }
    public void setRequiredDeliveryDate(LocalDate requiredDeliveryDate) { this.requiredDeliveryDate = requiredDeliveryDate; }

    public String getPreferredVehicleType() { return preferredVehicleType; }
    public void setPreferredVehicleType(String preferredVehicleType) { this.preferredVehicleType = preferredVehicleType; }

    public String getSpecialHandling() { return specialHandling; }
    public void setSpecialHandling(String specialHandling) { this.specialHandling = specialHandling; }

    public String getStatus() { return status; }
    public void setStatus(String status) { this.status = status; }

    public Integer getBusinessId() { return businessId; }
    public void setBusinessId(Integer businessId) { this.businessId = businessId; }

    public String getBusinessName() { return businessName != null ? businessName : "Independent Business"; }
    public void setBusinessName(String businessName) { this.businessName = businessName; }

    public LocalDateTime getCreatedAt() { return createdAt; }
    public void setCreatedAt(LocalDateTime createdAt) { this.createdAt = createdAt; }
}
