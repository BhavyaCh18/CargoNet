package com.cargonet.model;

import java.time.LocalDateTime;

public class User {
    private Integer id;
    private String name;
    private String email;
    private String passwordHash;
    private String phone;
    private String companyName;
    private String role; // BUSINESS, TRUCK_OWNER, ADMIN (or SHIPPER, TRANSPORTER)
    private String status; // ACTIVE, BLOCKED
    private LocalDateTime createdAt;

    public User() {}

    public User(Integer id, String name, String email, String passwordHash, String phone, String companyName, String role, String status, LocalDateTime createdAt) {
        this.id = id;
        this.name = name;
        this.email = email;
        this.passwordHash = passwordHash;
        this.phone = phone;
        this.companyName = companyName;
        this.role = role;
        this.status = status;
        this.createdAt = createdAt;
    }

    public Integer getId() { return id; }
    public void setId(Integer id) { this.id = id; }

    public String getName() { return name; }
    public void setName(String name) { this.name = name; }

    public String getEmail() { return email; }
    public void setEmail(String email) { this.email = email; }

    public String getPasswordHash() { return passwordHash; }
    public void setPasswordHash(String passwordHash) { this.passwordHash = passwordHash; }

    public String getPhone() { return phone; }
    public void setPhone(String phone) { this.phone = phone; }

    public String getCompanyName() { return companyName; }
    public void setCompanyName(String companyName) { this.companyName = companyName; }

    public String getRole() { return role; }
    public void setRole(String role) { this.role = role; }

    public String getStatus() { return status; }
    public void setStatus(String status) { this.status = status; }

    public LocalDateTime getCreatedAt() { return createdAt; }
    public void setCreatedAt(LocalDateTime createdAt) { this.createdAt = createdAt; }
}
