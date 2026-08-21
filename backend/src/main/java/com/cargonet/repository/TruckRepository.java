package com.cargonet.repository;

import com.cargonet.config.DatabaseConfig;
import com.cargonet.model.Truck;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import java.sql.*;
import java.util.ArrayList;
import java.util.List;

public class TruckRepository {
    private static final Logger logger = LoggerFactory.getLogger(TruckRepository.class);

    private Truck mapRow(ResultSet rs) throws SQLException {
        Truck t = new Truck();
        t.setId(rs.getInt("id"));
        t.setVehicleNumber(rs.getString("vehicle_number"));
        t.setVehicleType(rs.getString("vehicle_type"));
        t.setMaxCapacity(rs.getDouble("max_capacity"));
        t.setAvailableCapacity(rs.getDouble("available_capacity"));
        t.setCurrentLocation(rs.getString("current_location"));
        t.setOriginalPickupLocation(rs.getString("original_pickup_location"));
        t.setDestination(rs.getString("destination"));
        t.setReturnDestination(rs.getString("return_destination"));
        t.setStatus(rs.getString("status"));
        
        int ownerIdVal = rs.getInt("owner_id");
        if (!rs.wasNull()) {
            t.setOwnerId(ownerIdVal);
        }

        try {
            String oName = rs.getString("owner_name");
            t.setOwnerName(oName != null ? oName : "Independent Transporter");
        } catch (SQLException e) {
            t.setOwnerName("Independent Transporter");
        }

        try {
            t.setOwnerPhone(rs.getString("owner_phone"));
        } catch (SQLException ignored) {}

        Date availDate = rs.getDate("availability_date");
        if (availDate != null) t.setAvailabilityDate(availDate.toLocalDate());

        Date destDate = rs.getDate("expected_destination_date");
        if (destDate != null) t.setExpectedDestinationDate(destDate.toLocalDate());

        Timestamp ts = rs.getTimestamp("created_at");
        if (ts != null) t.setCreatedAt(ts.toLocalDateTime());

        return t;
    }

    private String selectWithOwnerSql() {
        return "SELECT t.*, u.name AS owner_name, u.phone AS owner_phone " +
               "FROM trucks t LEFT JOIN users u ON t.owner_id = u.id ";
    }

    public Truck save(Truck truck) {
        String sql = "INSERT INTO trucks (vehicle_number, vehicle_type, max_capacity, available_capacity, " +
                     "current_location, original_pickup_location, destination, return_destination, status, " +
                     "owner_id, availability_date, expected_destination_date) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)";
        try (Connection conn = DatabaseConfig.getConnection();
             PreparedStatement ps = conn.prepareStatement(sql, Statement.RETURN_GENERATED_KEYS)) {
            ps.setString(1, truck.getVehicleNumber());
            ps.setString(2, truck.getVehicleType());
            ps.setDouble(3, truck.getMaxCapacity());
            ps.setDouble(4, truck.getAvailableCapacity() != null ? truck.getAvailableCapacity() : truck.getMaxCapacity());
            ps.setString(5, truck.getCurrentLocation());
            ps.setString(6, truck.getOriginalPickupLocation() != null ? truck.getOriginalPickupLocation() : truck.getCurrentLocation());
            ps.setString(7, truck.getDestination());
            ps.setString(8, truck.getReturnDestination());
            ps.setString(9, truck.getStatus() != null ? truck.getStatus() : "AVAILABLE");
            if (truck.getOwnerId() != null) {
                ps.setInt(10, truck.getOwnerId());
            } else {
                ps.setNull(10, Types.INTEGER);
            }
            ps.setDate(11, truck.getAvailabilityDate() != null ? Date.valueOf(truck.getAvailabilityDate()) : null);
            ps.setDate(12, truck.getExpectedDestinationDate() != null ? Date.valueOf(truck.getExpectedDestinationDate()) : null);

            ps.executeUpdate();
            try (ResultSet keys = ps.getGeneratedKeys()) {
                if (keys.next()) {
                    truck.setId(keys.getInt(1));
                }
            }
            return truck;
        } catch (SQLException e) {
            logger.error("Error saving truck", e);
            throw new RuntimeException("Truck registration failed: " + e.getMessage());
        }
    }

    public Truck findById(Integer id) {
        if (id == null) return null;
        String sql = selectWithOwnerSql() + "WHERE t.id = ?";
        try (Connection conn = DatabaseConfig.getConnection();
             PreparedStatement ps = conn.prepareStatement(sql)) {
            ps.setInt(1, id);
            try (ResultSet rs = ps.executeQuery()) {
                if (rs.next()) {
                    return mapRow(rs);
                }
            }
        } catch (SQLException e) {
            logger.error("Error in findById truck", e);
        }
        return null;
    }

    public List<Truck> findByOwnerId(Integer ownerId) {
        List<Truck> list = new ArrayList<>();
        String sql = selectWithOwnerSql() + "WHERE t.owner_id = ? ORDER BY t.id DESC";
        try (Connection conn = DatabaseConfig.getConnection();
             PreparedStatement ps = conn.prepareStatement(sql)) {
            ps.setInt(1, ownerId);
            try (ResultSet rs = ps.executeQuery()) {
                while (rs.next()) {
                    list.add(mapRow(rs));
                }
            }
        } catch (SQLException e) {
            logger.error("Error in findByOwnerId truck", e);
        }
        return list;
    }

    public List<Truck> findAll() {
        List<Truck> list = new ArrayList<>();
        String sql = selectWithOwnerSql() + "ORDER BY t.id DESC";
        try (Connection conn = DatabaseConfig.getConnection();
             Statement stmt = conn.createStatement();
             ResultSet rs = stmt.executeQuery(sql)) {
            while (rs.next()) {
                list.add(mapRow(rs));
            }
        } catch (SQLException e) {
            logger.error("Error in findAll trucks", e);
        }
        return list;
    }

    public boolean updateStatus(Integer id, String status) {
        String sql = "UPDATE trucks SET status = ? WHERE id = ?";
        try (Connection conn = DatabaseConfig.getConnection();
             PreparedStatement ps = conn.prepareStatement(sql)) {
            ps.setString(1, status);
            ps.setInt(2, id);
            return ps.executeUpdate() > 0;
        } catch (SQLException e) {
            logger.error("Error updating truck status", e);
            return false;
        }
    }

    public boolean updateTripDetails(Integer id, String currentLocation, String returnDestination, Double availableCapacity, String status) {
        String sql = "UPDATE trucks SET current_location = ?, return_destination = ?, available_capacity = ?, status = ? WHERE id = ?";
        try (Connection conn = DatabaseConfig.getConnection();
             PreparedStatement ps = conn.prepareStatement(sql)) {
            ps.setString(1, currentLocation);
            ps.setString(2, returnDestination);
            ps.setDouble(3, availableCapacity);
            ps.setString(4, status);
            ps.setInt(5, id);
            return ps.executeUpdate() > 0;
        } catch (SQLException e) {
            logger.error("Error updating truck trip details", e);
            return false;
        }
    }

    public boolean updateAvailableCapacity(Integer id, Double availableCapacity) {
        String sql = "UPDATE trucks SET available_capacity = ? WHERE id = ?";
        try (Connection conn = DatabaseConfig.getConnection();
             PreparedStatement ps = conn.prepareStatement(sql)) {
            ps.setDouble(1, availableCapacity);
            ps.setInt(2, id);
            return ps.executeUpdate() > 0;
        } catch (SQLException e) {
            logger.error("Error updating truck available capacity", e);
            return false;
        }
    }

    public boolean deleteById(Integer id) {
        String sql = "DELETE FROM trucks WHERE id = ?";
        try (Connection conn = DatabaseConfig.getConnection();
             PreparedStatement ps = conn.prepareStatement(sql)) {
            ps.setInt(1, id);
            return ps.executeUpdate() > 0;
        } catch (SQLException e) {
            logger.error("Error deleting truck", e);
            return false;
        }
    }
}
