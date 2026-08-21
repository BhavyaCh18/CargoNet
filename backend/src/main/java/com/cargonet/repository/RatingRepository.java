package com.cargonet.repository;

import com.cargonet.config.DatabaseConfig;
import com.cargonet.model.Rating;

import java.sql.*;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

public class RatingRepository {

    public Rating save(Rating rating) throws SQLException {
        if (rating.getId() == null) {
            rating.setId(UUID.randomUUID().toString());
        }
        String sql = "INSERT INTO ratings (id, booking_id, rated_by, rated_user, score, comment, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)";
        try (Connection conn = DatabaseConfig.getConnection();
             PreparedStatement stmt = conn.prepareStatement(sql)) {
            stmt.setString(1, rating.getId());
            stmt.setString(2, rating.getBookingId());
            stmt.setString(3, rating.getRatedBy());
            stmt.setString(4, rating.getRatedUser());
            stmt.setInt(5, rating.getScore());
            stmt.setString(6, rating.getComment());
            stmt.setTimestamp(7, Timestamp.valueOf(LocalDateTime.now()));
            stmt.executeUpdate();
        }
        return rating;
    }

    public List<Rating> findByRatedUser(String userId) throws SQLException {
        List<Rating> list = new ArrayList<>();
        String sql = "SELECT * FROM ratings WHERE rated_user = ? ORDER BY created_at DESC";
        try (Connection conn = DatabaseConfig.getConnection();
             PreparedStatement stmt = conn.prepareStatement(sql)) {
            stmt.setString(1, userId);
            try (ResultSet rs = stmt.executeQuery()) {
                while (rs.next()) {
                    Rating r = new Rating();
                    r.setId(rs.getString("id"));
                    r.setBookingId(rs.getString("booking_id"));
                    r.setRatedBy(rs.getString("rated_by"));
                    r.setRatedUser(rs.getString("rated_user"));
                    r.setScore(rs.getInt("score"));
                    r.setComment(rs.getString("comment"));
                    Timestamp ts = rs.getTimestamp("created_at");
                    if (ts != null) r.setCreatedAt(ts.toLocalDateTime());
                    list.add(r);
                }
            }
        }
        return list;
    }
}
