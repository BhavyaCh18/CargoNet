package com.cargonet.controller;

import com.cargonet.auth.AuthMiddleware;
import com.cargonet.model.Booking;
import com.cargonet.model.Tracking;
import com.cargonet.repository.BookingRepository;
import com.cargonet.repository.TrackingRepository;
import io.javalin.http.Context;

import java.util.Map;

public class TrackingController {
    private final TrackingRepository trackingRepository;
    private final BookingRepository bookingRepository;

    public TrackingController(TrackingRepository trackingRepository, BookingRepository bookingRepository) {
        this.trackingRepository = trackingRepository;
        this.bookingRepository = bookingRepository;
    }

    public void getTrackingByBookingId(Context ctx) {
        Integer bookingId = Integer.parseInt(ctx.pathParam("bookingId"));
        Booking booking = bookingRepository.findById(bookingId);
        if (booking == null) {
            ctx.status(404).json(Map.of("error", "Booking not found"));
            return;
        }

        Tracking tracking = trackingRepository.findLatestByBookingId(bookingId);
        if (tracking == null) {
            tracking = new Tracking();
            tracking.setBookingId(bookingId);
            tracking.setCurrentLocation(booking.getPickupLocation());
            tracking.setStatus(booking.getStatus());
            tracking.setLatitude(17.3850);
            tracking.setLongitude(78.4867);
            tracking.setNotes("Shipment initialized");
        }

        ctx.json(Map.of(
            "booking", booking,
            "tracking", tracking
        ));
    }

    public void updateTrackingStatus(Context ctx) {
        AuthMiddleware.requireAuth(ctx);
        Integer bookingId = Integer.parseInt(ctx.pathParam("bookingId"));
        @SuppressWarnings("unchecked")
        Map<String, Object> body = ctx.bodyAsClass(Map.class);

        Tracking t = new Tracking();
        t.setBookingId(bookingId);
        t.setCurrentLocation((String) body.get("currentLocation"));
        t.setStatus((String) body.get("status"));
        
        Object latObj = body.get("latitude");
        if (latObj != null) t.setLatitude(Double.parseDouble(latObj.toString())); else t.setLatitude(17.3850);

        Object lngObj = body.get("longitude");
        if (lngObj != null) t.setLongitude(Double.parseDouble(lngObj.toString())); else t.setLongitude(78.4867);

        t.setNotes((String) body.get("notes"));

        Tracking saved = trackingRepository.save(t);
        ctx.json(saved);
    }
}
