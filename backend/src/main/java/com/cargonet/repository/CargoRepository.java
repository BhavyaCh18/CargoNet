package com.cargonet.repository;

import com.cargonet.config.DatabaseConfig;
import com.cargonet.model.Cargo;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import java.sql.*;
import java.util.ArrayList;
import java.util.List;

public class CargoRepository {
    private static final Logger logger = LoggerFactory.getLogger(CargoRepository.class);

    private Cargo mapRow(ResultSet rs) throws SQLException {
        Cargo c = new Cargo();
        c.setId(rs.getInt("id"));
        c.setCargoName(rs.getString("cargo_name"));
        c.setPickupLocation(rs.getString("pickup_location"));
        c.setDestination(rs.getString("destination"));
        c.setWeight(rs.getDouble("weight"));
        c.setDescription(rs.getString("description"));

        Date pDate = rs.getDate("pickup_date");
        if (pDate != null) c.setPickupDate(pDate.toLocalDate());

        Date rDate = rs.getDate("required_delivery_date");
        if (rDate != null) c.setRequiredDeliveryDate(rDate.toLocalDate());

        c.setPreferredVehicleType(rs.getString("preferred_vehicle_type"));
        c.setSpecialHandling(rs.getString("special_handling"));
        c.setStatus(rs.getString("status"));

        int bIdVal = rs.getInt("business_id");
        if (!rs.wasNull()) {
            c.setBusinessId(bIdVal);
        }

        try {
            String bName = rs.getString("business_name");
            c.setBusinessName(bName != null ? bName : "Independent Business");
        } catch (SQLException e) {
            c.setBusinessName("Independent Business");
        }

        Timestamp ts = rs.getTimestamp("created_at");
        if (ts != null) c.setCreatedAt(ts.toLocalDateTime());

        return c;
    }

    private String selectWithBusinessSql() {
        return "SELECT c.*, u.name AS business_name " +
               "FROM cargo c LEFT JOIN users u ON c.business_id = u.id ";
    }

    public Cargo save(Cargo cargo) {
        String sql = "INSERT INTO cargo (cargo_name, pickup_location, destination, weight, description, " +
                     "pickup_date, required_delivery_date, preferred_vehicle_type, special_handling, status, business_id) " +
                     "VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)";
        try (Connection conn = DatabaseConfig.getConnection();
             PreparedStatement ps = conn.prepareStatement(sql, Statement.RETURN_GENERATED_KEYS)) {
            ps.setString(1, cargo.getCargoName());
            ps.setString(2, cargo.getPickupLocation());
            ps.setString(3, cargo.getDestination());
            ps.setDouble(4, cargo.getWeight());
            ps.setString(5, cargo.getDescription());
            ps.setDate(6, cargo.getPickupDate() != null ? Date.valueOf(cargo.getPickupDate()) : null);
            ps.setDate(7, cargo.getRequiredDeliveryDate() != null ? Date.valueOf(cargo.getRequiredDeliveryDate()) : null);
            ps.setString(8, cargo.getPreferredVehicleType());
            ps.setString(9, cargo.getSpecialHandling());
            ps.setString(10, cargo.getStatus() != null ? cargo.getStatus() : "SEARCHING");
            if (cargo.getBusinessId() != null) {
                ps.setInt(11, cargo.getBusinessId());
            } else {
                ps.setNull(11, Types.INTEGER);
            }

            ps.executeUpdate();
            try (ResultSet keys = ps.getGeneratedKeys()) {
                if (keys.next()) {
                    cargo.setId(keys.getInt(1));
                }
            }
            return cargo;
        } catch (SQLException e) {
            logger.error("Error saving cargo", e);
            throw new RuntimeException("Cargo creation failed: " + e.getMessage());
        }
    }

    public Cargo findById(Integer id) {
        if (id == null) return null;
        String sql = selectWithBusinessSql() + "WHERE c.id = ?";
        try (Connection conn = DatabaseConfig.getConnection();
             PreparedStatement ps = conn.prepareStatement(sql)) {
            ps.setInt(1, id);
            try (ResultSet rs = ps.executeQuery()) {
                if (rs.next()) {
                    return mapRow(rs);
                }
            }
        } catch (SQLException e) {
            logger.error("Error in findById cargo", e);
        }
        return null;
    }

    public List<Cargo> findByBusinessId(Integer businessId) {
        List<Cargo> list = new ArrayList<>();
        String sql = selectWithBusinessSql() + "WHERE c.business_id = ? ORDER BY c.id DESC";
        try (Connection conn = DatabaseConfig.getConnection();
             PreparedStatement ps = conn.prepareStatement(sql)) {
            ps.setInt(1, businessId);
            try (ResultSet rs = ps.executeQuery()) {
                while (rs.next()) {
                    list.add(mapRow(rs));
                }
            }
        } catch (SQLException e) {
            logger.error("Error in findByBusinessId cargo", e);
        }
        return list;
    }

    public List<Cargo> findAll() {
        List<Cargo> list = new ArrayList<>();
        String sql = selectWithBusinessSql() + "ORDER BY c.id DESC";
        try (Connection conn = DatabaseConfig.getConnection();
             Statement stmt = conn.createStatement();
             ResultSet rs = stmt.executeQuery(sql)) {
            while (rs.next()) {
                list.add(mapRow(rs));
            }
        } catch (SQLException e) {
            logger.error("Error in findAll cargo", e);
        }
        return list;
    }

    public boolean updateStatus(Integer id, String status) {
        String sql = "UPDATE cargo SET status = ? WHERE id = ?";
        try (Connection conn = DatabaseConfig.getConnection();
             PreparedStatement ps = conn.prepareStatement(sql)) {
            ps.setString(1, status);
            ps.setInt(2, id);
            return ps.executeUpdate() > 0;
        } catch (SQLException e) {
            logger.error("Error updating cargo status", e);
            return false;
        }
    }

    public boolean deleteById(Integer id) {
        String sql = "DELETE FROM cargo WHERE id = ?";
        try (Connection conn = DatabaseConfig.getConnection();
             PreparedStatement ps = conn.prepareStatement(sql)) {
            ps.setInt(1, id);
            return ps.executeUpdate() > 0;
        } catch (SQLException e) {
            logger.error("Error deleting cargo", e);
            return false;
        }
    }

    /**
     * CRITICAL RETURN-LOAD MATCHING METHOD:
     * Excludes cargo belonging to originalBusinessId (Same Business Rule).
     */
    public List<Cargo> findMatchingReturnCargo(String pickupLocation, String returnDestination, Double availableCapacity, Integer originalBusinessId) {
        List<Cargo> list = new ArrayList<>();
        String sql = selectWithBusinessSql() +
                     "WHERE LOWER(c.pickup_location) = LOWER(?) " +
                     "AND LOWER(c.destination) = LOWER(?) " +
                     "AND c.status = 'SEARCHING' " +
                     "AND c.weight <= ? " +
                     (originalBusinessId != null ? "AND (c.business_id IS NULL OR c.business_id != ?) " : "") +
                     "ORDER BY c.id DESC";

        try (Connection conn = DatabaseConfig.getConnection();
             PreparedStatement ps = conn.prepareStatement(sql)) {
            ps.setString(1, pickupLocation);
            ps.setString(2, returnDestination);
            ps.setDouble(3, availableCapacity != null ? availableCapacity : 999999.0);
            if (originalBusinessId != null) {
                ps.setInt(4, originalBusinessId);
            }
            try (ResultSet rs = ps.executeQuery()) {
                while (rs.next()) {
                    list.add(mapRow(rs));
                }
            }
        } catch (SQLException e) {
            logger.error("Error in findMatchingReturnCargo", e);
        }
        return list;
    }
}
