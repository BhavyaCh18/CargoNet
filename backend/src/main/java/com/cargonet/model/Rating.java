package com.cargonet.model;

import java.time.LocalDateTime;

public class Rating {
    private String id;
    private String bookingId;
    private String ratedBy;
    private String ratedUser;
    private int score;
    private String comment;
    private LocalDateTime createdAt;

    public Rating() {}

    public String getId() { return id; }
    public void setId(String id) { this.id = id; }

    public String getBookingId() { return bookingId; }
    public void setBookingId(String bookingId) { this.bookingId = bookingId; }

    public String getRatedBy() { return ratedBy; }
    public void setRatedBy(String ratedBy) { this.ratedBy = ratedBy; }

    public String getRatedUser() { return ratedUser; }
    public void setRatedUser(String ratedUser) { this.ratedUser = ratedUser; }

    public int getScore() { return score; }
    public void setScore(int score) { this.score = score; }

    public String getComment() { return comment; }
    public void setComment(String comment) { this.comment = comment; }

    public LocalDateTime getCreatedAt() { return createdAt; }
    public void setCreatedAt(LocalDateTime createdAt) { this.createdAt = createdAt; }
}
