package com.cargonet.repository;

import com.cargonet.config.DatabaseConfig;
import com.cargonet.model.Payment;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import java.sql.*;

public class PaymentRepository {
    private static final Logger logger = LoggerFactory.getLogger(PaymentRepository.class);

    private Payment mapRow(ResultSet rs) throws SQLException {
        Payment p = new Payment();
        p.setId(rs.getInt("id"));
        int bId = rs.getInt("booking_id");
        if (!rs.wasNull()) p.setBookingId(bId);
        p.setTransactionId(rs.getString("transaction_id"));
        p.setAmount(rs.getDouble("amount"));
        p.setPlatformFee(rs.getDouble("platform_fee"));
        p.setTotalAmount(rs.getDouble("total_amount"));
        p.setPaymentMethod(rs.getString("payment_method"));
        p.setPaymentStatus(rs.getString("payment_status"));
        Timestamp ts = rs.getTimestamp("paid_at");
        if (ts != null) p.setPaidAt(ts.toLocalDateTime());
        return p;
    }

    public Payment save(Payment payment) {
        String sql = "INSERT INTO payments (booking_id, transaction_id, amount, platform_fee, total_amount, payment_method, payment_status, paid_at) " +
                     "VALUES (?, ?, ?, ?, ?, ?, ?, NOW())";
        try (Connection conn = DatabaseConfig.getConnection();
             PreparedStatement ps = conn.prepareStatement(sql, Statement.RETURN_GENERATED_KEYS)) {
            if (payment.getBookingId() != null) ps.setInt(1, payment.getBookingId()); else ps.setNull(1, Types.INTEGER);
            ps.setString(2, payment.getTransactionId());
            ps.setDouble(3, payment.getAmount());
            ps.setDouble(4, payment.getPlatformFee());
            ps.setDouble(5, payment.getTotalAmount());
            ps.setString(6, payment.getPaymentMethod() != null ? payment.getPaymentMethod() : "CARD");
            ps.setString(7, payment.getPaymentStatus() != null ? payment.getPaymentStatus() : "PAID");

            ps.executeUpdate();
            try (ResultSet keys = ps.getGeneratedKeys()) {
                if (keys.next()) {
                    payment.setId(keys.getInt(1));
                }
            }
            return payment;
        } catch (SQLException e) {
            logger.error("Error saving payment", e);
            throw new RuntimeException("Payment processing failed: " + e.getMessage());
        }
    }

    public Payment findByBookingId(Integer bookingId) {
        if (bookingId == null) return null;
        String sql = "SELECT * FROM payments WHERE booking_id = ? ORDER BY id DESC LIMIT 1";
        try (Connection conn = DatabaseConfig.getConnection();
             PreparedStatement ps = conn.prepareStatement(sql)) {
            ps.setInt(1, bookingId);
            try (ResultSet rs = ps.executeQuery()) {
                if (rs.next()) {
                    return mapRow(rs);
                }
            }
        } catch (SQLException e) {
            logger.error("Error finding payment by bookingId", e);
        }
        return null;
    }
}
