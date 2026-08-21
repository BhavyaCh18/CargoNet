package com.cargonet.model;

import java.time.LocalDateTime;

public class Complaint {
    private Integer id;
    private Integer userId;
    private String userName = "Unknown User";
    private Integer bookingId;
    private String subject;
    private String description;
    private String status = "PENDING"; // PENDING, RESOLVED
    private LocalDateTime createdAt;

    public Complaint() {}

    public Integer getId() { return id; }
    public void setId(Integer id) { this.id = id; }

    public Integer getUserId() { return userId; }
    public void setUserId(Integer userId) { this.userId = userId; }

    public String getUserName() { return userName != null ? userName : "Unknown User"; }
    public void setUserName(String userName) { this.userName = userName; }

    public Integer getBookingId() { return bookingId; }
    public void setBookingId(Integer bookingId) { this.bookingId = bookingId; }

    public String getSubject() { return subject; }
    public void setSubject(String subject) { this.subject = subject; }

    public String getDescription() { return description; }
    public void setDescription(String description) { this.description = description; }

    public String getStatus() { return status; }
    public void setStatus(String status) { this.status = status; }

    public LocalDateTime getCreatedAt() { return createdAt; }
    public void setCreatedAt(LocalDateTime createdAt) { this.createdAt = createdAt; }
}
