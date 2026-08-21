package com.cargonet.model;

import java.time.LocalDateTime;

public class Trip {
    private String id;
    private String truckId;
    private String originCity;
    private String destinationCity;
    private double originLat;
    private double originLng;
    private double destinationLat;
    private double destinationLng;
    private LocalDateTime departureTime;
    private double availableCapacityKg;
    private boolean isEmptyReturn; // Signature innovation: empty-return flag
    private String status; // PLANNED, IN_TRANSIT, COMPLETED, CANCELLED
    private double pricePerKg;
    private LocalDateTime createdAt;

    // Additional transient helper fields for display
    private String truckRegistrationNumber;
    private String truckType;

    public Trip() {}

    public String getId() { return id; }
    public void setId(String id) { this.id = id; }

    public String getTruckId() { return truckId; }
    public void setTruckId(String truckId) { this.truckId = truckId; }

    public String getOriginCity() { return originCity; }
    public void setOriginCity(String originCity) { this.originCity = originCity; }

    public String getDestinationCity() { return destinationCity; }
    public void setDestinationCity(String destinationCity) { this.destinationCity = destinationCity; }

    public double getOriginLat() { return originLat; }
    public void setOriginLat(double originLat) { this.originLat = originLat; }

    public double getOriginLng() { return originLng; }
    public void setOriginLng(double originLng) { this.originLng = originLng; }

    public double getDestinationLat() { return destinationLat; }
    public void setDestinationLat(double destinationLat) { this.destinationLat = destinationLat; }

    public double getDestinationLng() { return destinationLng; }
    public void setDestinationLng(double destinationLng) { this.destinationLng = destinationLng; }

    public LocalDateTime getDepartureTime() { return departureTime; }
    public void setDepartureTime(LocalDateTime departureTime) { this.departureTime = departureTime; }

    public double getAvailableCapacityKg() { return availableCapacityKg; }
    public void setAvailableCapacityKg(double availableCapacityKg) { this.availableCapacityKg = availableCapacityKg; }

    public boolean getIsEmptyReturn() { return isEmptyReturn; }
    public void setIsEmptyReturn(boolean isEmptyReturn) { this.isEmptyReturn = isEmptyReturn; }

    public String getStatus() { return status; }
    public void setStatus(String status) { this.status = status; }

    public double getPricePerKg() { return pricePerKg; }
    public void setPricePerKg(double pricePerKg) { this.pricePerKg = pricePerKg; }

    public LocalDateTime getCreatedAt() { return createdAt; }
    public void setCreatedAt(LocalDateTime createdAt) { this.createdAt = createdAt; }

    public String getTruckRegistrationNumber() { return truckRegistrationNumber; }
    public void setTruckRegistrationNumber(String truckRegistrationNumber) { this.truckRegistrationNumber = truckRegistrationNumber; }

    public String getTruckType() { return truckType; }
    public void setTruckType(String truckType) { this.truckType = truckType; }
}
