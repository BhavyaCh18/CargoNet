package com.cargonet.controller;

import com.cargonet.auth.AuthMiddleware;
import com.cargonet.model.*;
import com.cargonet.repository.*;
import io.javalin.http.Context;

import java.util.List;
import java.util.Map;
import java.util.Random;

public class BookingController {
    private final BookingRepository bookingRepository;
    private final TruckRepository truckRepository;
    private final CargoRepository cargoRepository;
    private final TrackingRepository trackingRepository;
    private final NotificationRepository notificationRepository;

    public BookingController(BookingRepository bookingRepository, TruckRepository truckRepository, CargoRepository cargoRepository, TrackingRepository trackingRepository, NotificationRepository notificationRepository) {
        this.bookingRepository = bookingRepository;
        this.truckRepository = truckRepository;
        this.cargoRepository = cargoRepository;
        this.trackingRepository = trackingRepository;
        this.notificationRepository = notificationRepository;
    }

    private String generateBookingCode(boolean isReturn) {
        int randomNum = 10000 + new Random().nextInt(90000);
        return (isReturn ? "BK-RET-" : "BK") + randomNum;
    }

    public void createBooking(Context ctx) {
        AuthMiddleware.requireAuth(ctx);
        String userIdStr = ctx.attribute("userId");
        Integer businessId = userIdStr != null ? Integer.parseInt(userIdStr) : null;

        @SuppressWarnings("unchecked")
        Map<String, Object> body = ctx.bodyAsClass(Map.class);
        Integer truckId = Integer.parseInt(body.get("truckId").toString());
        Integer cargoId = Integer.parseInt(body.get("cargoId").toString());

        Truck truck = truckRepository.findById(truckId);
        Cargo cargo = cargoRepository.findById(cargoId);

        if (truck == null) {
            ctx.status(404).json(Map.of("error", "Truck not found"));
            return;
        }
        if (cargo == null) {
            ctx.status(404).json(Map.of("error", "Cargo not found"));
            return;
        }

        if (!"AVAILABLE".equalsIgnoreCase(truck.getStatus())) {
            ctx.status(400).json(Map.of("error", "Truck is not available for booking"));
            return;
        }

        if (cargo.getWeight() > truck.getAvailableCapacity()) {
            ctx.status(400).json(Map.of("error", "Cargo weight exceeds available truck capacity"));
            return;
        }

        double transportCost = cargo.getWeight() * 1500.0;
        if (transportCost < 5000) transportCost = 5000;
        double platformFee = Math.round(transportCost * 0.05);
        double totalCost = transportCost + platformFee;

        Booking booking = new Booking();
        booking.setBookingCode(generateBookingCode(false));
        booking.setBusinessId(businessId != null ? businessId : cargo.getBusinessId());
        booking.setTruckId(truckId);
        booking.setCargoId(cargoId);
        booking.setPickupLocation(cargo.getPickupLocation());
        booking.setDestination(cargo.getDestination());
        booking.setWeight(cargo.getWeight());
        booking.setTransportCost(transportCost);
        booking.setPlatformFee(platformFee);
        booking.setTotalCost(totalCost);
        booking.setStatus("CONFIRMED");
        booking.setIsReturnLoad(false);
        booking.setOriginalBusinessId(booking.getBusinessId()); // MANDATORY: original business ID

        Booking saved = bookingRepository.save(booking);

        // Update Truck & Cargo status
        truckRepository.updateStatus(truckId, "BOOKED");
        cargoRepository.updateStatus(cargoId, "BOOKED");

        // Initial Tracking record
        Tracking t = new Tracking();
        t.setBookingId(saved.getId());
        t.setCurrentLocation(cargo.getPickupLocation());
        t.setStatus("CONFIRMED");
        t.setLatitude(17.3850);
        t.setLongitude(78.4867);
        t.setNotes("Booking confirmed. Waiting for cargo pickup.");
        trackingRepository.save(t);

        // Notify Truck Owner
        if (truck.getOwnerId() != null) {
            Notification n = new Notification();
            n.setUserId(truck.getOwnerId());
            n.setTitle("🚚 NEW BOOKING CONFIRMED!");
            n.setMessage("Booking " + saved.getBookingCode() + " for " + cargo.getCargoName() + " (" + cargo.getPickupLocation() + " → " + cargo.getDestination() + ")");
            n.setType("BOOKING");
            notificationRepository.save(n);
        }

        ctx.status(201).json(saved);
    }

    public void createReturnBooking(Context ctx) {
        AuthMiddleware.requireAuth(ctx);
        @SuppressWarnings("unchecked")
        Map<String, Object> body = ctx.bodyAsClass(Map.class);
        Integer truckId = Integer.parseInt(body.get("truckId").toString());
        Integer cargoId = Integer.parseInt(body.get("cargoId").toString());

        Truck truck = truckRepository.findById(truckId);
        Cargo cargo = cargoRepository.findById(cargoId);

        if (truck == null) {
            ctx.status(404).json(Map.of("error", "Truck not found"));
            return;
        }
        if (cargo == null) {
            ctx.status(404).json(Map.of("error", "Cargo not found"));
            return;
        }

        if (!"RETURN_AVAILABLE".equalsIgnoreCase(truck.getStatus())) {
            ctx.status(400).json(Map.of("error", "Truck is not available for return load booking"));
            return;
        }

        if (cargo.getWeight() > truck.getAvailableCapacity()) {
            ctx.status(400).json(Map.of("error", "Cargo weight exceeds available return load capacity"));
            return;
        }

        // Find original business ID from previous booking
        Integer originalBusinessId = null;
        List<Booking> allBookings = bookingRepository.findAll();
        for (Booking b : allBookings) {
            if (truck.getId().equals(b.getTruckId())) {
                originalBusinessId = b.getOriginalBusinessId() != null ? b.getOriginalBusinessId() : b.getBusinessId();
                break;
            }
        }

        // SAME BUSINESS RULE EXCLUSION (Section 28)
        if (cargo.getBusinessId() != null && cargo.getBusinessId().equals(originalBusinessId)) {
            ctx.status(400).json(Map.of("error", "Return load matching rule violation: Same business cannot book return trip for its own original truck."));
            return;
        }

        double transportCost = cargo.getWeight() * 1200.0; // Return discount
        if (transportCost < 4000) transportCost = 4000;
        double platformFee = Math.round(transportCost * 0.05);
        double totalCost = transportCost + platformFee;

        Booking booking = new Booking();
        booking.setBookingCode(generateBookingCode(true));
        booking.setBusinessId(cargo.getBusinessId());
        booking.setTruckId(truckId);
        booking.setCargoId(cargoId);
        booking.setPickupLocation(cargo.getPickupLocation());
        booking.setDestination(cargo.getDestination());
        booking.setWeight(cargo.getWeight());
        booking.setTransportCost(transportCost);
        booking.setPlatformFee(platformFee);
        booking.setTotalCost(totalCost);
        booking.setStatus("CONFIRMED");
        booking.setIsReturnLoad(true);
        booking.setOriginalBusinessId(originalBusinessId);

        Booking saved = bookingRepository.save(booking);

        // Deduct capacity
        double remainingCapacity = truck.getAvailableCapacity() - cargo.getWeight();
        if (remainingCapacity < 0) remainingCapacity = 0.0;
        truckRepository.updateTripDetails(truckId, truck.getCurrentLocation(), truck.getReturnDestination(), remainingCapacity, "RETURN_BOOKED");
        cargoRepository.updateStatus(cargoId, "BOOKED");

        // Initial Tracking record
        Tracking t = new Tracking();
        t.setBookingId(saved.getId());
        t.setCurrentLocation(cargo.getPickupLocation());
        t.setStatus("RETURN_BOOKED");
        t.setLatitude(12.9716);
        t.setLongitude(77.5946);
        t.setNotes("Return load accepted. Waiting for pickup.");
        trackingRepository.save(t);

        // Notify Business Owner
        if (cargo.getBusinessId() != null) {
            Notification n = new Notification();
            n.setUserId(cargo.getBusinessId());
            n.setTitle("🔥 RETURN LOAD MATCHED & CONFIRMED!");
            n.setMessage("Your cargo " + cargo.getCargoName() + " has been booked on return truck " + truck.getVehicleNumber());
            n.setType("RETURN_BOOKING");
            notificationRepository.save(n);
        }

        ctx.status(201).json(saved);
    }

    public void getBookingById(Context ctx) {
        Integer id = Integer.parseInt(ctx.pathParam("id"));
        Booking booking = bookingRepository.findById(id);
        if (booking != null) {
            ctx.json(booking);
        } else {
            ctx.status(404).json(Map.of("error", "Booking not found"));
        }
    }

    public void getMyBookings(Context ctx) {
        AuthMiddleware.requireAuth(ctx);
        String userIdStr = ctx.attribute("userId");
        String role = ctx.attribute("userRole");

        if (userIdStr != null) {
            Integer userId = Integer.parseInt(userIdStr);
            if ("TRUCK_OWNER".equalsIgnoreCase(role) || "TRANSPORTER".equalsIgnoreCase(role)) {
                List<Booking> list = bookingRepository.findByTruckOwnerId(userId);
                ctx.json(list);
            } else {
                List<Booking> list = bookingRepository.findByBusinessId(userId);
                ctx.json(list);
            }
            return;
        }
        ctx.json(List.of());
    }

    public void updateBookingStatus(Context ctx) {
        AuthMiddleware.requireAuth(ctx);
        Integer id = Integer.parseInt(ctx.pathParam("id"));
        Booking booking = bookingRepository.findById(id);
        if (booking == null) {
            ctx.status(404).json(Map.of("error", "Booking not found"));
            return;
        }

        @SuppressWarnings("unchecked")
        Map<String, String> body = ctx.bodyAsClass(Map.class);
        String newStatus = body.get("status");
        bookingRepository.updateStatus(id, newStatus);

        Truck truck = booking.getTruckId() != null ? truckRepository.findById(booking.getTruckId()) : null;
        Cargo cargo = booking.getCargoId() != null ? cargoRepository.findById(booking.getCargoId()) : null;

        if (cargo != null) {
            cargoRepository.updateStatus(cargo.getId(), newStatus);
        }

        if (truck != null) {
            if ("CARGO_PICKED_UP".equalsIgnoreCase(newStatus)) {
                truckRepository.updateStatus(truck.getId(), "IN_TRANSIT");
            } else if ("IN_TRANSIT".equalsIgnoreCase(newStatus)) {
                truckRepository.updateStatus(truck.getId(), "IN_TRANSIT");
            } else if ("DELIVERED".equalsIgnoreCase(newStatus)) {
                if (Boolean.TRUE.equals(booking.getIsReturnLoad())) {
                    // Return load delivered -> Truck becomes AVAILABLE in return destination
                    String finalLocation = truck.getReturnDestination() != null ? truck.getReturnDestination() : booking.getDestination();
                    truckRepository.updateTripDetails(truck.getId(), finalLocation, null, truck.getMaxCapacity(), "AVAILABLE");
                } else {
                    // Normal trip delivered -> Automatic transition to RETURN_AVAILABLE (Sections 26, 27)
                    String newCurrentLoc = booking.getDestination();
                    String newReturnDest = truck.getOriginalPickupLocation() != null ? truck.getOriginalPickupLocation() : booking.getPickupLocation();
                    truckRepository.updateTripDetails(truck.getId(), newCurrentLoc, newReturnDest, truck.getMaxCapacity(), "RETURN_AVAILABLE");

                    // Check for matching return cargo & notify truck owner
                    List<Cargo> returnMatches = cargoRepository.findMatchingReturnCargo(
                        newCurrentLoc, newReturnDest, truck.getMaxCapacity(), booking.getOriginalBusinessId()
                    );

                    if (!returnMatches.isEmpty() && truck.getOwnerId() != null) {
                        Notification n = new Notification();
                        n.setUserId(truck.getOwnerId());
                        n.setTitle("🔥 RETURN-LOAD MATCH FOUND!");
                        n.setMessage("Found " + returnMatches.size() + " matching return load cargo(s) for your truck " + truck.getVehicleNumber() + " (" + newCurrentLoc + " → " + newReturnDest + ")");
                        n.setType("RETURN_MATCH");
                        notificationRepository.save(n);
                    }
                }
            }
        }

        // Add tracking update
        Tracking tr = new Tracking();
        tr.setBookingId(id);
        tr.setCurrentLocation(booking.getDestination());
        tr.setStatus(newStatus);
        tr.setLatitude(12.9716);
        tr.setLongitude(77.5946);
        tr.setNotes("Booking status updated to " + newStatus);
        trackingRepository.save(tr);

        ctx.json(Map.of("message", "Booking status updated to " + newStatus));
    }
}
