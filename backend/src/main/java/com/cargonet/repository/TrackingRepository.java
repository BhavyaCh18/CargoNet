package com.cargonet.repository;

import com.cargonet.config.DatabaseConfig;
import com.cargonet.model.Tracking;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import java.sql.*;

public class TrackingRepository {
    private static final Logger logger = LoggerFactory.getLogger(TrackingRepository.class);

    private Tracking mapRow(ResultSet rs) throws SQLException {
        Tracking t = new Tracking();
        t.setId(rs.getInt("id"));
        int bId = rs.getInt("booking_id");
        if (!rs.wasNull()) t.setBookingId(bId);
        t.setCurrentLocation(rs.getString("current_location"));
        t.setStatus(rs.getString("status"));
        t.setLatitude(rs.getDouble("latitude"));
        t.setLongitude(rs.getDouble("longitude"));
        Timestamp ts = rs.getTimestamp("updated_at");
        if (ts != null) t.setUpdatedAt(ts.toLocalDateTime());
        t.setNotes(rs.getString("notes"));
        return t;
    }

    public Tracking save(Tracking tracking) {
        String sql = "INSERT INTO tracking (booking_id, current_location, status, latitude, longitude, notes) " +
                     "VALUES (?, ?, ?, ?, ?, ?)";
        try (Connection conn = DatabaseConfig.getConnection();
             PreparedStatement ps = conn.prepareStatement(sql, Statement.RETURN_GENERATED_KEYS)) {
            if (tracking.getBookingId() != null) ps.setInt(1, tracking.getBookingId()); else ps.setNull(1, Types.INTEGER);
            ps.setString(2, tracking.getCurrentLocation());
            ps.setString(3, tracking.getStatus());
            ps.setDouble(4, tracking.getLatitude());
            ps.setDouble(5, tracking.getLongitude());
            ps.setString(6, tracking.getNotes());

            ps.executeUpdate();
            try (ResultSet keys = ps.getGeneratedKeys()) {
                if (keys.next()) {
                    tracking.setId(keys.getInt(1));
                }
            }
            return tracking;
        } catch (SQLException e) {
            logger.error("Error saving tracking log", e);
            throw new RuntimeException("Tracking update failed: " + e.getMessage());
        }
    }

    public Tracking findLatestByBookingId(Integer bookingId) {
        if (bookingId == null) return null;
        String sql = "SELECT * FROM tracking WHERE booking_id = ? ORDER BY id DESC LIMIT 1";
        try (Connection conn = DatabaseConfig.getConnection();
             PreparedStatement ps = conn.prepareStatement(sql)) {
            ps.setInt(1, bookingId);
            try (ResultSet rs = ps.executeQuery()) {
                if (rs.next()) {
                    return mapRow(rs);
                }
            }
        } catch (SQLException e) {
            logger.error("Error finding tracking log", e);
        }
        return null;
    }
}
