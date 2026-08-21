package com.cargonet.model;

import java.time.LocalDateTime;

public class Booking {
    private Integer id;
    private String bookingCode;
    private Integer businessId;
    private String businessName = "Independent Business";
    private Integer truckId;
    private String vehicleNumber = "Unassigned Truck";
    private Integer cargoId;
    private String cargoName = "Unassigned Cargo";
    private String pickupLocation;
    private String destination;
    private Double weight;
    private Double transportCost;
    private Double platformFee;
    private Double totalCost;
    private LocalDateTime bookingDate;
    private String status; // SEARCHING, MATCHED, BOOKING_REQUESTED, CONFIRMED, CARGO_PICKED_UP, IN_TRANSIT, DELIVERED, CANCELLED, RETURN_BOOKED
    private Boolean isReturnLoad = false;
    private Integer originalBusinessId;
    private LocalDateTime createdAt;

    public Booking() {}

    public Integer getId() { return id; }
    public void setId(Integer id) { this.id = id; }

    public String getBookingCode() { return bookingCode; }
    public void setBookingCode(String bookingCode) { this.bookingCode = bookingCode; }

    public Integer getBusinessId() { return businessId; }
    public void setBusinessId(Integer businessId) { this.businessId = businessId; }

    public String getBusinessName() { return businessName != null ? businessName : "Independent Business"; }
    public void setBusinessName(String businessName) { this.businessName = businessName; }

    public Integer getTruckId() { return truckId; }
    public void setTruckId(Integer truckId) { this.truckId = truckId; }

    public String getVehicleNumber() { return vehicleNumber != null ? vehicleNumber : "Unassigned Truck"; }
    public void setVehicleNumber(String vehicleNumber) { this.vehicleNumber = vehicleNumber; }

    public Integer getCargoId() { return cargoId; }
    public void setCargoId(Integer cargoId) { this.cargoId = cargoId; }

    public String getCargoName() { return cargoName != null ? cargoName : "Unassigned Cargo"; }
    public void setCargoName(String cargoName) { this.cargoName = cargoName; }

    public String getPickupLocation() { return pickupLocation; }
    public void setPickupLocation(String pickupLocation) { this.pickupLocation = pickupLocation; }

    public String getDestination() { return destination; }
    public void setDestination(String destination) { this.destination = destination; }

    public Double getWeight() { return weight; }
    public void setWeight(Double weight) { this.weight = weight; }

    public Double getTransportCost() { return transportCost; }
    public void setTransportCost(Double transportCost) { this.transportCost = transportCost; }

    public Double getPlatformFee() { return platformFee; }
    public void setPlatformFee(Double platformFee) { this.platformFee = platformFee; }

    public Double getTotalCost() { return totalCost; }
    public void setTotalCost(Double totalCost) { this.totalCost = totalCost; }

    public LocalDateTime getBookingDate() { return bookingDate; }
    public void setBookingDate(LocalDateTime bookingDate) { this.bookingDate = bookingDate; }

    public String getStatus() { return status; }
    public void setStatus(String status) { this.status = status; }

    public Boolean getIsReturnLoad() { return isReturnLoad != null ? isReturnLoad : false; }
    public void setIsReturnLoad(Boolean isReturnLoad) { this.isReturnLoad = isReturnLoad; }

    public Integer getOriginalBusinessId() { return originalBusinessId; }
    public void setOriginalBusinessId(Integer originalBusinessId) { this.originalBusinessId = originalBusinessId; }

    public LocalDateTime getCreatedAt() { return createdAt; }
    public void setCreatedAt(LocalDateTime createdAt) { this.createdAt = createdAt; }
}
