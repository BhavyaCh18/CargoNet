package com.cargonet.controller;

import com.cargonet.auth.AuthMiddleware;
import com.cargonet.model.*;
import com.cargonet.repository.*;
import io.javalin.http.Context;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

public class AdminController {
    private final UserRepository userRepository;
    private final TruckRepository truckRepository;
    private final CargoRepository cargoRepository;
    private final BookingRepository bookingRepository;

    public AdminController(UserRepository userRepository, TruckRepository truckRepository, CargoRepository cargoRepository, BookingRepository bookingRepository) {
        this.userRepository = userRepository;
        this.truckRepository = truckRepository;
        this.cargoRepository = cargoRepository;
        this.bookingRepository = bookingRepository;
    }

    public void getDashboard(Context ctx) {
        AuthMiddleware.requireRole(ctx, "ADMIN");
        Map<String, Object> stats = getStatisticsInternal();
        ctx.json(stats);
    }

    public void getStatistics(Context ctx) {
        ctx.json(getStatisticsInternal());
    }

    private Map<String, Object> getStatisticsInternal() {
        List<User> users = userRepository.findAll();
        List<Truck> trucks = truckRepository.findAll();
        List<Cargo> cargoList = cargoRepository.findAll();
        List<Booking> bookings = bookingRepository.findAll();

        long totalBusinesses = users.stream().filter(u -> "BUSINESS".equalsIgnoreCase(u.getRole()) || "SHIPPER".equalsIgnoreCase(u.getRole())).count();
        long totalTruckOwners = users.stream().filter(u -> "TRUCK_OWNER".equalsIgnoreCase(u.getRole()) || "TRANSPORTER".equalsIgnoreCase(u.getRole())).count();
        
        long activeBookings = bookings.stream().filter(b -> !"DELIVERED".equalsIgnoreCase(b.getStatus()) && !"CANCELLED".equalsIgnoreCase(b.getStatus())).count();
        long completedDeliveries = bookings.stream().filter(b -> "DELIVERED".equalsIgnoreCase(b.getStatus())).count();
        long returnLoadsMatched = bookings.stream().filter(b -> Boolean.TRUE.equals(b.getIsReturnLoad())).count();
        
        // Estimated empty trips reduced: Each return load matched reduces 1 empty return trip leg
        long emptyTripsReduced = returnLoadsMatched;

        Map<String, Object> stats = new HashMap<>();
        stats.put("totalUsers", users.size());
        stats.put("totalBusinesses", totalBusinesses);
        stats.put("totalTruckOwners", totalTruckOwners);
        stats.put("totalTrucks", trucks.size());
        stats.put("totalCargo", cargoList.size());
        stats.put("totalBookings", bookings.size());
        stats.put("activeBookings", activeBookings);
        stats.put("completedDeliveries", completedDeliveries);
        stats.put("returnLoadsMatched", returnLoadsMatched);
        stats.put("estimatedEmptyTripsReduced", emptyTripsReduced);

        return stats;
    }

    public void getUsers(Context ctx) {
        AuthMiddleware.requireRole(ctx, "ADMIN");
        ctx.json(userRepository.findAll());
    }

    public void toggleBlockUser(Context ctx) {
        AuthMiddleware.requireRole(ctx, "ADMIN");
        Integer id = Integer.parseInt(ctx.pathParam("id"));
        boolean ok = userRepository.toggleBlock(id);
        if (ok) {
            ctx.json(Map.of("message", "User block status updated successfully"));
        } else {
            ctx.status(400).json(Map.of("error", "Failed to update user status"));
        }
    }

    public void getTrucks(Context ctx) {
        AuthMiddleware.requireRole(ctx, "ADMIN");
        ctx.json(truckRepository.findAll());
    }

    public void getCargo(Context ctx) {
        AuthMiddleware.requireRole(ctx, "ADMIN");
        ctx.json(cargoRepository.findAll());
    }

    public void getBookings(Context ctx) {
        AuthMiddleware.requireRole(ctx, "ADMIN");
        ctx.json(bookingRepository.findAll());
    }
}
