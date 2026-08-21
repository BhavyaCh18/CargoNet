package com.cargonet.controller;

import com.cargonet.auth.AuthMiddleware;
import com.cargonet.model.Truck;
import com.cargonet.repository.TruckRepository;
import io.javalin.http.Context;

import java.time.LocalDate;
import java.util.List;
import java.util.Map;

public class TruckController {
    private final TruckRepository truckRepository;

    public TruckController(TruckRepository truckRepository) {
        this.truckRepository = truckRepository;
    }

    public void createTruck(Context ctx) {
        AuthMiddleware.requireAuth(ctx);
        String userIdStr = ctx.attribute("userId");
        Integer ownerId = userIdStr != null ? Integer.parseInt(userIdStr) : null;

        @SuppressWarnings("unchecked")
        Map<String, Object> body = ctx.bodyAsClass(Map.class);
        Truck truck = new Truck();
        truck.setVehicleNumber((String) body.get("vehicleNumber"));
        truck.setVehicleType((String) body.get("vehicleType"));
        
        Object maxCap = body.get("maxCapacity");
        if (maxCap != null) truck.setMaxCapacity(Double.parseDouble(maxCap.toString()));

        Object availCap = body.get("availableCapacity");
        if (availCap != null) truck.setAvailableCapacity(Double.parseDouble(availCap.toString()));
        else truck.setAvailableCapacity(truck.getMaxCapacity());

        truck.setCurrentLocation((String) body.get("currentLocation"));
        truck.setOriginalPickupLocation((String) body.get("originalPickupLocation"));
        if (truck.getOriginalPickupLocation() == null) {
            truck.setOriginalPickupLocation(truck.getCurrentLocation());
        }

        truck.setDestination((String) body.get("destination"));
        truck.setReturnDestination((String) body.get("returnDestination"));
        truck.setStatus("AVAILABLE");
        truck.setOwnerId(ownerId);

        String availDateStr = (String) body.get("availabilityDate");
        if (availDateStr != null && !availDateStr.isBlank()) {
            truck.setAvailabilityDate(LocalDate.parse(availDateStr));
        }

        String destDateStr = (String) body.get("expectedDestinationDate");
        if (destDateStr != null && !destDateStr.isBlank()) {
            truck.setExpectedDestinationDate(LocalDate.parse(destDateStr));
        }

        Truck saved = truckRepository.save(truck);
        ctx.status(201).json(saved);
    }

    public void getAllTrucks(Context ctx) {
        String ownerIdStr = ctx.queryParam("ownerId");
        if (ownerIdStr != null) {
            List<Truck> trucks = truckRepository.findByOwnerId(Integer.parseInt(ownerIdStr));
            ctx.json(trucks);
            return;
        }
        List<Truck> trucks = truckRepository.findAll();
        ctx.json(trucks);
    }

    public void getTruckById(Context ctx) {
        Integer id = Integer.parseInt(ctx.pathParam("id"));
        Truck truck = truckRepository.findById(id);
        if (truck != null) {
            ctx.json(truck);
        } else {
            ctx.status(404).json(Map.of("error", "Truck not found"));
        }
    }

    public void updateTruck(Context ctx) {
        AuthMiddleware.requireAuth(ctx);
        Integer id = Integer.parseInt(ctx.pathParam("id"));
        Truck existing = truckRepository.findById(id);
        if (existing == null) {
            ctx.status(404).json(Map.of("error", "Truck not found"));
            return;
        }

        @SuppressWarnings("unchecked")
        Map<String, Object> body = ctx.bodyAsClass(Map.class);
        if (body.containsKey("vehicleNumber")) existing.setVehicleNumber((String) body.get("vehicleNumber"));
        if (body.containsKey("vehicleType")) existing.setVehicleType((String) body.get("vehicleType"));
        if (body.containsKey("maxCapacity")) existing.setMaxCapacity(Double.parseDouble(body.get("maxCapacity").toString()));
        if (body.containsKey("availableCapacity")) existing.setAvailableCapacity(Double.parseDouble(body.get("availableCapacity").toString()));
        if (body.containsKey("currentLocation")) existing.setCurrentLocation((String) body.get("currentLocation"));
        if (body.containsKey("destination")) existing.setDestination((String) body.get("destination"));
        if (body.containsKey("returnDestination")) existing.setReturnDestination((String) body.get("returnDestination"));
        if (body.containsKey("status")) existing.setStatus((String) body.get("status"));

        truckRepository.updateTripDetails(id, existing.getCurrentLocation(), existing.getReturnDestination(), existing.getAvailableCapacity(), existing.getStatus());
        ctx.json(existing);
    }

    public void updateTruckStatus(Context ctx) {
        AuthMiddleware.requireAuth(ctx);
        Integer id = Integer.parseInt(ctx.pathParam("id"));
        @SuppressWarnings("unchecked")
        Map<String, String> body = ctx.bodyAsClass(Map.class);
        String newStatus = body.get("status");

        boolean ok = truckRepository.updateStatus(id, newStatus);
        if (ok) {
            ctx.json(Map.of("message", "Status updated successfully", "status", newStatus));
        } else {
            ctx.status(400).json(Map.of("error", "Failed to update status"));
        }
    }

    public void deleteTruck(Context ctx) {
        AuthMiddleware.requireAuth(ctx);
        Integer id = Integer.parseInt(ctx.pathParam("id"));
        boolean ok = truckRepository.deleteById(id);
        if (ok) {
            ctx.json(Map.of("message", "Truck deleted successfully"));
        } else {
            ctx.status(400).json(Map.of("error", "Failed to delete truck"));
        }
    }
}
