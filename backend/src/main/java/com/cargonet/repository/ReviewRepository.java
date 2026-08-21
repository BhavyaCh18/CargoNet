package com.cargonet.repository;

import com.cargonet.config.DatabaseConfig;
import com.cargonet.model.Review;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import java.sql.*;
import java.util.ArrayList;
import java.util.List;

public class ReviewRepository {
    private static final Logger logger = LoggerFactory.getLogger(ReviewRepository.class);

    private Review mapRow(ResultSet rs) throws SQLException {
        Review r = new Review();
        r.setId(rs.getInt("id"));
        int bId = rs.getInt("booking_id");
        if (!rs.wasNull()) r.setBookingId(bId);
        int busId = rs.getInt("business_id");
        if (!rs.wasNull()) r.setBusinessId(busId);
        int trkId = rs.getInt("truck_id");
        if (!rs.wasNull()) r.setTruckId(trkId);
        r.setRating(rs.getInt("rating"));
        r.setComment(rs.getString("comment"));
        Timestamp ts = rs.getTimestamp("created_at");
        if (ts != null) r.setCreatedAt(ts.toLocalDateTime());
        return r;
    }

    public Review save(Review review) {
        String sql = "INSERT INTO reviews (booking_id, business_id, truck_id, rating, comment) VALUES (?, ?, ?, ?, ?)";
        try (Connection conn = DatabaseConfig.getConnection();
             PreparedStatement ps = conn.prepareStatement(sql, Statement.RETURN_GENERATED_KEYS)) {
            if (review.getBookingId() != null) ps.setInt(1, review.getBookingId()); else ps.setNull(1, Types.INTEGER);
            if (review.getBusinessId() != null) ps.setInt(2, review.getBusinessId()); else ps.setNull(2, Types.INTEGER);
            if (review.getTruckId() != null) ps.setInt(3, review.getTruckId()); else ps.setNull(3, Types.INTEGER);
            ps.setInt(4, review.getRating());
            ps.setString(5, review.getComment());

            ps.executeUpdate();
            try (ResultSet keys = ps.getGeneratedKeys()) {
                if (keys.next()) {
                    review.setId(keys.getInt(1));
                }
            }
            return review;
        } catch (SQLException e) {
            logger.error("Error saving review", e);
            throw new RuntimeException("Review submission failed: " + e.getMessage());
        }
    }

    public List<Review> findByTruckId(Integer truckId) {
        List<Review> list = new ArrayList<>();
        if (truckId == null) return list;
        String sql = "SELECT * FROM reviews WHERE truck_id = ? ORDER BY id DESC";
        try (Connection conn = DatabaseConfig.getConnection();
             PreparedStatement ps = conn.prepareStatement(sql)) {
            ps.setInt(1, truckId);
            try (ResultSet rs = ps.executeQuery()) {
                while (rs.next()) {
                    list.add(mapRow(rs));
                }
            }
        } catch (SQLException e) {
            logger.error("Error finding reviews by truckId", e);
        }
        return list;
    }
}
