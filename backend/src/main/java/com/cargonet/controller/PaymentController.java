package com.cargonet.controller;

import com.cargonet.auth.AuthMiddleware;
import com.cargonet.model.Booking;
import com.cargonet.model.Payment;
import com.cargonet.repository.BookingRepository;
import com.cargonet.repository.PaymentRepository;
import io.javalin.http.Context;

import java.util.Map;
import java.util.UUID;

public class PaymentController {
    private final PaymentRepository paymentRepository;
    private final BookingRepository bookingRepository;

    public PaymentController(PaymentRepository paymentRepository, BookingRepository bookingRepository) {
        this.paymentRepository = paymentRepository;
        this.bookingRepository = bookingRepository;
    }

    public void processPayment(Context ctx) {
        AuthMiddleware.requireAuth(ctx);
        @SuppressWarnings("unchecked")
        Map<String, Object> body = ctx.bodyAsClass(Map.class);
        Integer bookingId = Integer.parseInt(body.get("bookingId").toString());

        Booking booking = bookingRepository.findById(bookingId);
        if (booking == null) {
            ctx.status(404).json(Map.of("error", "Booking not found"));
            return;
        }

        double amount = booking.getTransportCost();
        double platformFee = booking.getPlatformFee();
        double totalAmount = booking.getTotalCost();

        Payment payment = new Payment();
        payment.setBookingId(bookingId);
        payment.setTransactionId("TXN-" + UUID.randomUUID().toString().substring(0, 8).toUpperCase());
        payment.setAmount(amount);
        payment.setPlatformFee(platformFee);
        payment.setTotalAmount(totalAmount);
        payment.setPaymentMethod((String) body.getOrDefault("paymentMethod", "SIMULATED_CARD"));
        payment.setPaymentStatus("PAID");

        Payment saved = paymentRepository.save(payment);
        ctx.status(201).json(saved);
    }

    public void getPaymentByBookingId(Context ctx) {
        Integer bookingId = Integer.parseInt(ctx.pathParam("bookingId"));
        Payment payment = paymentRepository.findByBookingId(bookingId);
        if (payment != null) {
            ctx.json(payment);
        } else {
            ctx.status(404).json(Map.of("error", "Payment record not found"));
        }
    }
}
