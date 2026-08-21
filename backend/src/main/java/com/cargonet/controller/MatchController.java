package com.cargonet.controller;

import com.cargonet.model.Booking;
import com.cargonet.model.Cargo;
import com.cargonet.model.MatchResult;
import com.cargonet.model.Truck;
import com.cargonet.repository.BookingRepository;
import com.cargonet.repository.CargoRepository;
import com.cargonet.repository.TruckRepository;
import com.cargonet.service.MatchingEngine;
import io.javalin.http.Context;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

public class MatchController {
    private final CargoRepository cargoRepository;
    private final TruckRepository truckRepository;
    private final BookingRepository bookingRepository;
    private final MatchingEngine matchingEngine;

    public MatchController(CargoRepository cargoRepository, TruckRepository truckRepository, BookingRepository bookingRepository, MatchingEngine matchingEngine) {
        this.cargoRepository = cargoRepository;
        this.truckRepository = truckRepository;
        this.bookingRepository = bookingRepository;
        this.matchingEngine = matchingEngine;
    }

    public void matchTrucksForCargo(Context ctx) {
        Integer cargoId = Integer.parseInt(ctx.pathParam("cargoId"));
        Cargo cargo = cargoRepository.findById(cargoId);
        if (cargo == null) {
            ctx.status(404).json(Map.of("error", "Cargo not found"));
            return;
        }

        List<Truck> allTrucks = truckRepository.findAll();
        List<MatchResult> matches = matchingEngine.findMatchesForCargo(cargo, allTrucks);

        ctx.json(Map.of(
            "cargo", cargo,
            "matches", matches,
            "totalMatches", matches.size()
        ));
    }

    public void matchReturnLoadsForTruck(Context ctx) {
        Integer truckId = Integer.parseInt(ctx.pathParam("truckId"));
        Truck truck = truckRepository.findById(truckId);
        if (truck == null) {
            ctx.status(404).json(Map.of("error", "Truck not found"));
            return;
        }

        // Find the original booking for this truck to get original_business_id
        Integer originalBusinessId = null;
        List<Booking> truckBookings = bookingRepository.findAll();
        for (Booking b : truckBookings) {
            if (truck.getId().equals(b.getTruckId())) {
                originalBusinessId = b.getOriginalBusinessId() != null ? b.getOriginalBusinessId() : b.getBusinessId();
                break;
            }
        }

        String pickupLocation = truck.getCurrentLocation();
        String returnDestination = truck.getReturnDestination() != null ? truck.getReturnDestination() : truck.getOriginalPickupLocation();
        Double availableCapacity = truck.getAvailableCapacity();

        List<Cargo> matchingCargo = cargoRepository.findMatchingReturnCargo(
            pickupLocation, returnDestination, availableCapacity, originalBusinessId
        );

        Map<String, Object> response = new HashMap<>();
        response.put("truck", truck);
        response.put("pickupLocation", pickupLocation);
        response.put("returnDestination", returnDestination);
        response.put("availableCapacity", availableCapacity);
        response.put("originalBusinessId", originalBusinessId);
        response.put("matchingCargo", matchingCargo);

        ctx.json(response);
    }
}
