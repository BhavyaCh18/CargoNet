package com.cargonet.repository;

import com.cargonet.config.DatabaseConfig;
import com.cargonet.model.Trip;

import java.sql.*;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

public class TripRepository {

    public Trip save(Trip trip) throws SQLException {
        if (trip.getId() == null) {
            trip.setId(UUID.randomUUID().toString());
        }
        String sql = """
            INSERT INTO trips (id, truck_id, origin_city, destination_city, origin_lat, origin_lng,
                               destination_lat, destination_lng, departure_time, available_capacity_kg,
                               is_empty_return, status, price_per_kg, created_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """;
        try (Connection conn = DatabaseConfig.getConnection();
             PreparedStatement stmt = conn.prepareStatement(sql)) {
            stmt.setString(1, trip.getId());
            stmt.setString(2, trip.getTruckId());
            stmt.setString(3, trip.getOriginCity());
            stmt.setString(4, trip.getDestinationCity());
            stmt.setDouble(5, trip.getOriginLat());
            stmt.setDouble(6, trip.getOriginLng());
            stmt.setDouble(7, trip.getDestinationLat());
            stmt.setDouble(8, trip.getDestinationLng());
            stmt.setTimestamp(9, Timestamp.valueOf(trip.getDepartureTime() != null ? trip.getDepartureTime() : LocalDateTime.now()));
            stmt.setDouble(10, trip.getAvailableCapacityKg());
            stmt.setBoolean(11, trip.getIsEmptyReturn());
            stmt.setString(12, trip.getStatus() != null ? trip.getStatus() : "PLANNED");
            stmt.setDouble(13, trip.getPricePerKg());
            stmt.setTimestamp(14, Timestamp.valueOf(LocalDateTime.now()));
            stmt.executeUpdate();
        }
        return trip;
    }

    public List<Trip> findAllPlannedTrips() throws SQLException {
        List<Trip> list = new ArrayList<>();
        String sql = """
            SELECT t.*, tr.registration_number, tr.truck_type
            FROM trips t
            JOIN trucks tr ON t.truck_id = tr.id
            WHERE t.status = 'PLANNED'
            ORDER BY t.departure_time ASC
        """;
        try (Connection conn = DatabaseConfig.getConnection();
             PreparedStatement stmt = conn.prepareStatement(sql);
             ResultSet rs = stmt.executeQuery()) {
            while (rs.next()) {
                list.add(mapTrip(rs));
            }
        }
        return list;
    }

    public List<Trip> findByOwnerId(String ownerId) throws SQLException {
        List<Trip> list = new ArrayList<>();
        String sql = """
            SELECT t.*, tr.registration_number, tr.truck_type
            FROM trips t
            JOIN trucks tr ON t.truck_id = tr.id
            WHERE tr.owner_id = ?
            ORDER BY t.created_at DESC
        """;
        try (Connection conn = DatabaseConfig.getConnection();
             PreparedStatement stmt = conn.prepareStatement(sql)) {
            stmt.setString(1, ownerId);
            try (ResultSet rs = stmt.executeQuery()) {
                while (rs.next()) {
                    list.add(mapTrip(rs));
                }
            }
        }
        return list;
    }

    public Optional<Trip> findById(String id) throws SQLException {
        String sql = """
            SELECT t.*, tr.registration_number, tr.truck_type
            FROM trips t
            JOIN trucks tr ON t.truck_id = tr.id
            WHERE t.id = ?
        """;
        try (Connection conn = DatabaseConfig.getConnection();
             PreparedStatement stmt = conn.prepareStatement(sql)) {
            stmt.setString(1, id);
            try (ResultSet rs = stmt.executeQuery()) {
                if (rs.next()) {
                    return Optional.of(mapTrip(rs));
                }
            }
        }
        return Optional.empty();
    }

    public boolean updateStatus(String tripId, String status) throws SQLException {
        String sql = "UPDATE trips SET status = ? WHERE id = ?";
        try (Connection conn = DatabaseConfig.getConnection();
             PreparedStatement stmt = conn.prepareStatement(sql)) {
            stmt.setString(1, status);
            stmt.setString(2, tripId);
            return stmt.executeUpdate() > 0;
        }
    }

    private Trip mapTrip(ResultSet rs) throws SQLException {
        Trip trip = new Trip();
        trip.setId(rs.getString("id"));
        trip.setTruckId(rs.getString("truck_id"));
        trip.setOriginCity(rs.getString("origin_city"));
        trip.setDestinationCity(rs.getString("destination_city"));
        trip.setOriginLat(rs.getDouble("origin_lat"));
        trip.setOriginLng(rs.getDouble("origin_lng"));
        trip.setDestinationLat(rs.getDouble("destination_lat"));
        trip.setDestinationLng(rs.getDouble("destination_lng"));
        
        Timestamp depTs = rs.getTimestamp("departure_time");
        if (depTs != null) trip.setDepartureTime(depTs.toLocalDateTime());

        trip.setAvailableCapacityKg(rs.getDouble("available_capacity_kg"));
        trip.setIsEmptyReturn(rs.getBoolean("is_empty_return"));
        trip.setStatus(rs.getString("status"));
        trip.setPricePerKg(rs.getDouble("price_per_kg"));
        
        Timestamp createdTs = rs.getTimestamp("created_at");
        if (createdTs != null) trip.setCreatedAt(createdTs.toLocalDateTime());

        try {
            trip.setTruckRegistrationNumber(rs.getString("registration_number"));
            trip.setTruckType(rs.getString("truck_type"));
        } catch (SQLException ignored) {}

        return trip;
    }
}
