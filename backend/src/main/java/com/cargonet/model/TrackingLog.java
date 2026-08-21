package com.cargonet.model;

import java.time.LocalDateTime;

public class TrackingLog {
    private String id;
    private String bookingId;
    private double lat;
    private double lng;
    private double speedKmh;
    private LocalDateTime timestamp;

    public TrackingLog() {}

    public TrackingLog(String id, String bookingId, double lat, double lng, double speedKmh, LocalDateTime timestamp) {
        this.id = id;
        this.bookingId = bookingId;
        this.lat = lat;
        this.lng = lng;
        this.speedKmh = speedKmh;
        this.timestamp = timestamp;
    }

    public String getId() { return id; }
    public void setId(String id) { this.id = id; }

    public String getBookingId() { return bookingId; }
    public void setBookingId(String bookingId) { this.bookingId = bookingId; }

    public double getLat() { return lat; }
    public void setLat(double lat) { this.lat = lat; }

    public double getLng() { return lng; }
    public void setLng(double lng) { this.lng = lng; }

    public double getSpeedKmh() { return speedKmh; }
    public void setSpeedKmh(double speedKmh) { this.speedKmh = speedKmh; }

    public LocalDateTime getTimestamp() { return timestamp; }
    public void setTimestamp(LocalDateTime timestamp) { this.timestamp = timestamp; }
}
