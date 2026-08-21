package com.cargonet.service;

import com.cargonet.model.Cargo;
import com.cargonet.model.MatchResult;
import com.cargonet.model.Truck;

import java.util.ArrayList;
import java.util.List;

public class MatchingEngine {

    public MatchResult calculateMatch(Cargo cargo, Truck truck) {
        if (cargo == null || truck == null) return null;

        // 1. ROUTE SCORE (Max 40 points)
        int routeScore = 0;
        String cargoPickup = cargo.getPickupLocation() != null ? cargo.getPickupLocation().trim().toLowerCase() : "";
        String cargoDrop = cargo.getDestination() != null ? cargo.getDestination().trim().toLowerCase() : "";
        
        String truckLoc = truck.getCurrentLocation() != null ? truck.getCurrentLocation().trim().toLowerCase() : "";
        String truckDest = truck.getDestination() != null ? truck.getDestination().trim().toLowerCase() : "";
        String truckRetDest = truck.getReturnDestination() != null ? truck.getReturnDestination().trim().toLowerCase() : "";

        boolean directRoute = cargoPickup.equals(truckLoc) && (cargoDrop.equals(truckDest) || cargoDrop.equals(truckRetDest));
        boolean partialRoute = cargoPickup.contains(truckLoc) || truckLoc.contains(cargoPickup);

        if (directRoute) {
            routeScore = 40;
        } else if (partialRoute) {
            routeScore = 25;
        } else {
            routeScore = 10;
        }

        // 2. CAPACITY SCORE (Max 30 points)
        int capacityScore = 0;
        double cargoWeight = cargo.getWeight() != null ? cargo.getWeight() : 0.0;
        double availableCap = truck.getAvailableCapacity() != null ? truck.getAvailableCapacity() : 0.0;

        if (cargoWeight <= availableCap && availableCap > 0) {
            capacityScore = 30;
        } else if (cargoWeight <= truck.getMaxCapacity()) {
            capacityScore = 15;
        } else {
            return null; // Exclude if exceeds max capacity
        }

        // 3. DATE SCORE (Max 20 points)
        int dateScore = 20; // Default matches date window

        // 4. VEHICLE TYPE SCORE (Max 10 points)
        int vehicleTypeScore = 10;
        if (cargo.getPreferredVehicleType() != null && !cargo.getPreferredVehicleType().isBlank()) {
            if (cargo.getPreferredVehicleType().equalsIgnoreCase(truck.getVehicleType())) {
                vehicleTypeScore = 10;
            } else {
                vehicleTypeScore = 5;
            }
        }

        return new MatchResult(truck, cargo, routeScore, capacityScore, dateScore, vehicleTypeScore);
    }

    public List<MatchResult> findMatchesForCargo(Cargo cargo, List<Truck> trucks) {
        List<MatchResult> matches = new ArrayList<>();
        if (cargo == null || trucks == null) return matches;

        for (Truck truck : trucks) {
            // Only match available or return_available trucks
            if ("AVAILABLE".equalsIgnoreCase(truck.getStatus()) || "RETURN_AVAILABLE".equalsIgnoreCase(truck.getStatus())) {
                MatchResult result = calculateMatch(cargo, truck);
                if (result != null && result.getMatchScore() >= 40) {
                    matches.add(result);
                }
            }
        }

        // Sort descending by match score
        matches.sort((a, b) -> Integer.compare(b.getMatchScore(), a.getMatchScore()));
        return matches;
    }
}
