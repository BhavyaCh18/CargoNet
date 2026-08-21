package com.cargonet.repository;

import com.cargonet.config.DatabaseConfig;
import com.cargonet.model.Shipment;

import java.sql.*;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

public class ShipmentRepository {

    public Shipment save(Shipment shipment) throws SQLException {
        if (shipment.getId() == null) {
            shipment.setId(UUID.randomUUID().toString());
        }
        String sql = """
            INSERT INTO shipments (id, business_id, pickup_city, drop_city, pickup_lat, pickup_lng,
                                  drop_lat, drop_lng, cargo_type, weight_kg, preferred_date, budget, status, created_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """;
        try (Connection conn = DatabaseConfig.getConnection();
             PreparedStatement stmt = conn.prepareStatement(sql)) {
            stmt.setString(1, shipment.getId());
            stmt.setString(2, shipment.getBusinessId());
            stmt.setString(3, shipment.getPickupCity());
            stmt.setString(4, shipment.getDropCity());
            stmt.setDouble(5, shipment.getPickupLat());
            stmt.setDouble(6, shipment.getPickupLng());
            stmt.setDouble(7, shipment.getDropLat());
            stmt.setDouble(8, shipment.getDropLng());
            stmt.setString(9, shipment.getCargoType());
            stmt.setDouble(10, shipment.getWeightKg());
            stmt.setTimestamp(11, Timestamp.valueOf(shipment.getPreferredDate() != null ? shipment.getPreferredDate() : LocalDateTime.now()));
            stmt.setDouble(12, shipment.getBudget());
            stmt.setString(13, shipment.getStatus() != null ? shipment.getStatus() : "PENDING");
            stmt.setTimestamp(14, Timestamp.valueOf(LocalDateTime.now()));
            stmt.executeUpdate();
        }
        return shipment;
    }

    public List<Shipment> findByBusinessUserId(String userId) throws SQLException {
        List<Shipment> list = new ArrayList<>();
        String sql = """
            SELECT s.*, b.company_name
            FROM shipments s
            LEFT JOIN businesses b ON s.business_id = b.user_id
            WHERE s.business_id = ?
            ORDER BY s.created_at DESC
        """;
        try (Connection conn = DatabaseConfig.getConnection();
             PreparedStatement stmt = conn.prepareStatement(sql)) {
            stmt.setString(1, userId);
            try (ResultSet rs = stmt.executeQuery()) {
                while (rs.next()) {
                    list.add(mapShipment(rs));
                }
            }
        }
        return list;
    }

    public Optional<Shipment> findById(String id) throws SQLException {
        String sql = """
            SELECT s.*, b.company_name
            FROM shipments s
            LEFT JOIN businesses b ON s.business_id = b.user_id
            WHERE s.id = ?
        """;
        try (Connection conn = DatabaseConfig.getConnection();
             PreparedStatement stmt = conn.prepareStatement(sql)) {
            stmt.setString(1, id);
            try (ResultSet rs = stmt.executeQuery()) {
                if (rs.next()) {
                    return Optional.of(mapShipment(rs));
                }
            }
        }
        return Optional.empty();
    }

    public List<Shipment> findAllPending() throws SQLException {
        List<Shipment> list = new ArrayList<>();
        String sql = """
            SELECT s.*, b.company_name
            FROM shipments s
            LEFT JOIN businesses b ON s.business_id = b.user_id
            WHERE s.status = 'PENDING'
            ORDER BY s.created_at DESC
        """;
        try (Connection conn = DatabaseConfig.getConnection();
             PreparedStatement stmt = conn.prepareStatement(sql);
             ResultSet rs = stmt.executeQuery()) {
            while (rs.next()) {
                list.add(mapShipment(rs));
            }
        }
        return list;
    }

    public boolean updateStatus(String shipmentId, String status) throws SQLException {
        String sql = "UPDATE shipments SET status = ? WHERE id = ?";
        try (Connection conn = DatabaseConfig.getConnection();
             PreparedStatement stmt = conn.prepareStatement(sql)) {
            stmt.setString(1, status);
            stmt.setString(2, shipmentId);
            return stmt.executeUpdate() > 0;
        }
    }

    private Shipment mapShipment(ResultSet rs) throws SQLException {
        Shipment s = new Shipment();
        s.setId(rs.getString("id"));
        s.setBusinessId(rs.getString("business_id"));
        s.setPickupCity(rs.getString("pickup_city"));
        s.setDropCity(rs.getString("drop_city"));
        s.setPickupLat(rs.getDouble("pickup_lat"));
        s.setPickupLng(rs.getDouble("pickup_lng"));
        s.setDropLat(rs.getDouble("drop_lat"));
        s.setDropLng(rs.getDouble("drop_lng"));
        s.setCargoType(rs.getString("cargo_type"));
        s.setWeightKg(rs.getDouble("weight_kg"));
        
        Timestamp prefTs = rs.getTimestamp("preferred_date");
        if (prefTs != null) s.setPreferredDate(prefTs.toLocalDateTime());

        s.setBudget(rs.getDouble("budget"));
        s.setStatus(rs.getString("status"));
        
        Timestamp createdTs = rs.getTimestamp("created_at");
        if (createdTs != null) s.setCreatedAt(createdTs.toLocalDateTime());

        try {
            s.setCompanyName(rs.getString("company_name"));
        } catch (SQLException ignored) {}

        return s;
    }
}
