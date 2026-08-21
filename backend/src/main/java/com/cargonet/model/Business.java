package com.cargonet.model;

import java.time.LocalDateTime;

public class Business {
    private String id;
    private String userId;
    private String companyName;
    private String gstNumber;
    private String address;
    private LocalDateTime createdAt;

    public Business() {}

    public Business(String id, String userId, String companyName, String gstNumber, String address, LocalDateTime createdAt) {
        this.id = id;
        this.userId = userId;
        this.companyName = companyName;
        this.gstNumber = gstNumber;
        this.address = address;
        this.createdAt = createdAt;
    }

    public String getId() { return id; }
    public void setId(String id) { this.id = id; }

    public String getUserId() { return userId; }
    public void setUserId(String userId) { this.userId = userId; }

    public String getCompanyName() { return companyName; }
    public void setCompanyName(String companyName) { this.companyName = companyName; }

    public String getGstNumber() { return gstNumber; }
    public void setGstNumber(String gstNumber) { this.gstNumber = gstNumber; }

    public String getAddress() { return address; }
    public void setAddress(String address) { this.address = address; }

    public LocalDateTime getCreatedAt() { return createdAt; }
    public void setCreatedAt(LocalDateTime createdAt) { this.createdAt = createdAt; }
}
