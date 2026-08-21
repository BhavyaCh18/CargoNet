package com.cargonet.repository;

import com.cargonet.config.DatabaseConfig;
import com.cargonet.model.Complaint;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import java.sql.*;
import java.util.ArrayList;
import java.util.List;

public class ComplaintRepository {
    private static final Logger logger = LoggerFactory.getLogger(ComplaintRepository.class);

    private Complaint mapRow(ResultSet rs) throws SQLException {
        Complaint c = new Complaint();
        c.setId(rs.getInt("id"));
        int uId = rs.getInt("user_id");
        if (!rs.wasNull()) c.setUserId(uId);

        int bId = rs.getInt("booking_id");
        if (!rs.wasNull()) c.setBookingId(bId);

        c.setSubject(rs.getString("subject"));
        c.setDescription(rs.getString("description"));
        c.setStatus(rs.getString("status"));
        Timestamp ts = rs.getTimestamp("created_at");
        if (ts != null) c.setCreatedAt(ts.toLocalDateTime());

        try {
            String uName = rs.getString("user_name");
            c.setUserName(uName != null ? uName : "Unknown User");
        } catch (SQLException e) {
            c.setUserName("Unknown User");
        }

        return c;
    }

    public Complaint save(Complaint complaint) {
        String sql = "INSERT INTO complaints (user_id, booking_id, subject, description, status) VALUES (?, ?, ?, ?, ?)";
        try (Connection conn = DatabaseConfig.getConnection();
             PreparedStatement ps = conn.prepareStatement(sql, Statement.RETURN_GENERATED_KEYS)) {
            if (complaint.getUserId() != null) ps.setInt(1, complaint.getUserId()); else ps.setNull(1, Types.INTEGER);
            if (complaint.getBookingId() != null) ps.setInt(2, complaint.getBookingId()); else ps.setNull(2, Types.INTEGER);
            ps.setString(3, complaint.getSubject());
            ps.setString(4, complaint.getDescription());
            ps.setString(5, complaint.getStatus() != null ? complaint.getStatus() : "PENDING");

            ps.executeUpdate();
            try (ResultSet keys = ps.getGeneratedKeys()) {
                if (keys.next()) {
                    complaint.setId(keys.getInt(1));
                }
            }
            return complaint;
        } catch (SQLException e) {
            logger.error("Error saving complaint", e);
            throw new RuntimeException("Complaint submission failed: " + e.getMessage());
        }
    }

    public List<Complaint> findAll() {
        List<Complaint> list = new ArrayList<>();
        String sql = "SELECT c.*, u.name AS user_name " +
                     "FROM complaints c LEFT JOIN users u ON c.user_id = u.id " +
                     "ORDER BY c.id DESC";
        try (Connection conn = DatabaseConfig.getConnection();
             Statement stmt = conn.createStatement();
             ResultSet rs = stmt.executeQuery(sql)) {
            while (rs.next()) {
                list.add(mapRow(rs));
            }
        } catch (SQLException e) {
            logger.error("Error finding all complaints", e);
        }
        return list;
    }

    public boolean resolve(Integer id) {
        String sql = "UPDATE complaints SET status = 'RESOLVED' WHERE id = ?";
        try (Connection conn = DatabaseConfig.getConnection();
             PreparedStatement ps = conn.prepareStatement(sql)) {
            ps.setInt(1, id);
            return ps.executeUpdate() > 0;
        } catch (SQLException e) {
            logger.error("Error resolving complaint", e);
            return false;
        }
    }
}
