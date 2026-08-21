package com.cargonet.repository;

import com.cargonet.config.DatabaseConfig;
import com.cargonet.model.Booking;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import java.sql.*;
import java.util.ArrayList;
import java.util.List;

public class BookingRepository {
    private static final Logger logger = LoggerFactory.getLogger(BookingRepository.class);

    private Booking mapRow(ResultSet rs) throws SQLException {
        Booking b = new Booking();
        b.setId(rs.getInt("id"));
        b.setBookingCode(rs.getString("booking_code"));
        
        int busId = rs.getInt("business_id");
        if (!rs.wasNull()) b.setBusinessId(busId);

        int trkId = rs.getInt("truck_id");
        if (!rs.wasNull()) b.setTruckId(trkId);

        int crgId = rs.getInt("cargo_id");
        if (!rs.wasNull()) b.setCargoId(crgId);

        b.setPickupLocation(rs.getString("pickup_location"));
        b.setDestination(rs.getString("destination"));
        b.setWeight(rs.getDouble("weight"));
        b.setTransportCost(rs.getDouble("transport_cost"));
        b.setPlatformFee(rs.getDouble("platform_fee"));
        b.setTotalCost(rs.getDouble("total_cost"));

        Timestamp bDate = rs.getTimestamp("booking_date");
        if (bDate != null) b.setBookingDate(bDate.toLocalDateTime());

        b.setStatus(rs.getString("status"));
        b.setIsReturnLoad(rs.getBoolean("is_return_load"));

        int origBusId = rs.getInt("original_business_id");
        if (!rs.wasNull()) b.setOriginalBusinessId(origBusId);

        Timestamp ts = rs.getTimestamp("created_at");
        if (ts != null) b.setCreatedAt(ts.toLocalDateTime());

        try {
            String bName = rs.getString("business_name");
            b.setBusinessName(bName != null ? bName : "Independent Business");
        } catch (SQLException e) {
            b.setBusinessName("Independent Business");
        }

        try {
            String vNum = rs.getString("vehicle_number");
            b.setVehicleNumber(vNum != null ? vNum : "Unassigned Truck");
        } catch (SQLException e) {
            b.setVehicleNumber("Unassigned Truck");
        }

        try {
            String cName = rs.getString("cargo_name");
            b.setCargoName(cName != null ? cName : "Unassigned Cargo");
        } catch (SQLException e) {
            b.setCargoName("Unassigned Cargo");
        }

        return b;
    }

    private String selectWithRelationsSql() {
        return "SELECT b.*, u.name AS business_name, t.vehicle_number, c.cargo_name " +
               "FROM bookings b " +
               "LEFT JOIN users u ON b.business_id = u.id " +
               "LEFT JOIN trucks t ON b.truck_id = t.id " +
               "LEFT JOIN cargo c ON b.cargo_id = c.id ";
    }

    public Booking save(Booking booking) {
        String sql = "INSERT INTO bookings (booking_code, business_id, truck_id, cargo_id, pickup_location, " +
                     "destination, weight, transport_cost, platform_fee, total_cost, status, is_return_load, original_business_id) " +
                     "VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)";
        try (Connection conn = DatabaseConfig.getConnection();
             PreparedStatement ps = conn.prepareStatement(sql, Statement.RETURN_GENERATED_KEYS)) {
            ps.setString(1, booking.getBookingCode());
            if (booking.getBusinessId() != null) ps.setInt(2, booking.getBusinessId()); else ps.setNull(2, Types.INTEGER);
            if (booking.getTruckId() != null) ps.setInt(3, booking.getTruckId()); else ps.setNull(3, Types.INTEGER);
            if (booking.getCargoId() != null) ps.setInt(4, booking.getCargoId()); else ps.setNull(4, Types.INTEGER);

            ps.setString(5, booking.getPickupLocation());
            ps.setString(6, booking.getDestination());
            ps.setDouble(7, booking.getWeight());
            ps.setDouble(8, booking.getTransportCost() != null ? booking.getTransportCost() : 0.0);
            ps.setDouble(9, booking.getPlatformFee() != null ? booking.getPlatformFee() : 0.0);
            ps.setDouble(10, booking.getTotalCost() != null ? booking.getTotalCost() : 0.0);
            ps.setString(11, booking.getStatus() != null ? booking.getStatus() : "CONFIRMED");
            ps.setBoolean(12, booking.getIsReturnLoad() != null ? booking.getIsReturnLoad() : false);
            if (booking.getOriginalBusinessId() != null) ps.setInt(13, booking.getOriginalBusinessId()); else ps.setNull(13, Types.INTEGER);

            ps.executeUpdate();
            try (ResultSet keys = ps.getGeneratedKeys()) {
                if (keys.next()) {
                    booking.setId(keys.getInt(1));
                }
            }
            return booking;
        } catch (SQLException e) {
            logger.error("Error saving booking", e);
            throw new RuntimeException("Booking creation failed: " + e.getMessage());
        }
    }

    public Booking findById(Integer id) {
        if (id == null) return null;
        String sql = selectWithRelationsSql() + "WHERE b.id = ?";
        try (Connection conn = DatabaseConfig.getConnection();
             PreparedStatement ps = conn.prepareStatement(sql)) {
            ps.setInt(1, id);
            try (ResultSet rs = ps.executeQuery()) {
                if (rs.next()) {
                    return mapRow(rs);
                }
            }
        } catch (SQLException e) {
            logger.error("Error in findById booking", e);
        }
        return null;
    }

    public List<Booking> findByBusinessId(Integer businessId) {
        List<Booking> list = new ArrayList<>();
        String sql = selectWithRelationsSql() + "WHERE b.business_id = ? ORDER BY b.id DESC";
        try (Connection conn = DatabaseConfig.getConnection();
             PreparedStatement ps = conn.prepareStatement(sql)) {
            ps.setInt(1, businessId);
            try (ResultSet rs = ps.executeQuery()) {
                while (rs.next()) {
                    list.add(mapRow(rs));
                }
            }
        } catch (SQLException e) {
            logger.error("Error in findByBusinessId booking", e);
        }
        return list;
    }

    public List<Booking> findByTruckOwnerId(Integer ownerId) {
        List<Booking> list = new ArrayList<>();
        String sql = selectWithRelationsSql() + "WHERE t.owner_id = ? ORDER BY b.id DESC";
        try (Connection conn = DatabaseConfig.getConnection();
             PreparedStatement ps = conn.prepareStatement(sql)) {
            ps.setInt(1, ownerId);
            try (ResultSet rs = ps.executeQuery()) {
                while (rs.next()) {
                    list.add(mapRow(rs));
                }
            }
        } catch (SQLException e) {
            logger.error("Error in findByTruckOwnerId booking", e);
        }
        return list;
    }

    public List<Booking> findAll() {
        List<Booking> list = new ArrayList<>();
        String sql = selectWithRelationsSql() + "ORDER BY b.id DESC";
        try (Connection conn = DatabaseConfig.getConnection();
             Statement stmt = conn.createStatement();
             ResultSet rs = stmt.executeQuery(sql)) {
            while (rs.next()) {
                list.add(mapRow(rs));
            }
        } catch (SQLException e) {
            logger.error("Error in findAll bookings", e);
        }
        return list;
    }

    public boolean updateStatus(Integer id, String status) {
        String sql = "UPDATE bookings SET status = ? WHERE id = ?";
        try (Connection conn = DatabaseConfig.getConnection();
             PreparedStatement ps = conn.prepareStatement(sql)) {
            ps.setString(1, status);
            ps.setInt(2, id);
            return ps.executeUpdate() > 0;
        } catch (SQLException e) {
            logger.error("Error updating booking status", e);
            return false;
        }
    }
}
