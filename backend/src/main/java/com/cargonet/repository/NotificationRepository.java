package com.cargonet.repository;

import com.cargonet.config.DatabaseConfig;
import com.cargonet.model.Notification;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import java.sql.*;
import java.util.ArrayList;
import java.util.List;

public class NotificationRepository {
    private static final Logger logger = LoggerFactory.getLogger(NotificationRepository.class);

    private Notification mapRow(ResultSet rs) throws SQLException {
        Notification n = new Notification();
        n.setId(rs.getInt("id"));
        int uId = rs.getInt("user_id");
        if (!rs.wasNull()) n.setUserId(uId);
        n.setTitle(rs.getString("title"));
        n.setMessage(rs.getString("message"));
        n.setType(rs.getString("type"));
        n.setReadStatus(rs.getBoolean("read_status"));
        Timestamp ts = rs.getTimestamp("created_at");
        if (ts != null) n.setCreatedAt(ts.toLocalDateTime());
        return n;
    }

    public Notification save(Notification notification) {
        if (notification.getUserId() == null) {
            logger.warn("Skipping notification because recipient userId is null.");
            return notification;
        }
        String sql = "INSERT INTO notifications (user_id, title, message, type, read_status) VALUES (?, ?, ?, ?, ?)";
        try (Connection conn = DatabaseConfig.getConnection();
             PreparedStatement ps = conn.prepareStatement(sql, Statement.RETURN_GENERATED_KEYS)) {
            ps.setInt(1, notification.getUserId());
            ps.setString(2, notification.getTitle());
            ps.setString(3, notification.getMessage());
            ps.setString(4, notification.getType() != null ? notification.getType() : "INFO");
            ps.setBoolean(5, notification.getReadStatus() != null ? notification.getReadStatus() : false);

            ps.executeUpdate();
            try (ResultSet keys = ps.getGeneratedKeys()) {
                if (keys.next()) {
                    notification.setId(keys.getInt(1));
                }
            }
            return notification;
        } catch (SQLException e) {
            // Section 30: If notification recipient no longer exists, skip notification safely. Do not break matching.
            logger.warn("Skipping notification creation due to database error (recipient may no longer exist): {}", e.getMessage());
            return notification;
        }
    }

    public List<Notification> findByUserId(Integer userId) {
        List<Notification> list = new ArrayList<>();
        if (userId == null) return list;
        String sql = "SELECT * FROM notifications WHERE user_id = ? ORDER BY id DESC";
        try (Connection conn = DatabaseConfig.getConnection();
             PreparedStatement ps = conn.prepareStatement(sql)) {
            ps.setInt(1, userId);
            try (ResultSet rs = ps.executeQuery()) {
                while (rs.next()) {
                    list.add(mapRow(rs));
                }
            }
        } catch (SQLException e) {
            logger.error("Error finding notifications by userId", e);
        }
        return list;
    }

    public boolean markAsRead(Integer id) {
        String sql = "UPDATE notifications SET read_status = TRUE WHERE id = ?";
        try (Connection conn = DatabaseConfig.getConnection();
             PreparedStatement ps = conn.prepareStatement(sql)) {
            ps.setInt(1, id);
            return ps.executeUpdate() > 0;
        } catch (SQLException e) {
            logger.error("Error marking notification read", e);
            return false;
        }
    }
}
