package com.cargonet.controller;

import com.cargonet.auth.AuthMiddleware;
import com.cargonet.model.Trip;
import com.cargonet.repository.TripRepository;
import io.javalin.http.Context;
import io.javalin.http.HttpStatus;

import java.util.List;
import java.util.Map;

public class TripController {

    private final TripRepository tripRepository = new TripRepository();

    public void createTrip(Context ctx) {
        AuthMiddleware.requireRole(ctx, "TRANSPORTER", "ADMIN");
        try {
            Trip trip = ctx.bodyAsClass(Trip.class);
            if (trip.getOriginCity() == null || trip.getDestinationCity() == null || trip.getTruckId() == null) {
                ctx.status(HttpStatus.BAD_REQUEST).json(Map.of("error", "Truck ID, Origin, and Destination are required."));
                return;
            }

            // Standard lat/lng defaults for major Indian freight cities if not provided
            populateCityCoordinates(trip);

            Trip saved = tripRepository.save(trip);
            ctx.status(HttpStatus.CREATED).json(saved);
        } catch (Exception e) {
            ctx.status(HttpStatus.BAD_REQUEST).json(Map.of("error", "Failed to create trip: " + e.getMessage()));
        }
    }

    public void getMyTrips(Context ctx) {
        AuthMiddleware.requireAuth(ctx);
        try {
            String ownerId = ctx.attribute("userId");
            List<Trip> trips = tripRepository.findByOwnerId(ownerId);
            ctx.json(trips);
        } catch (Exception e) {
            ctx.status(HttpStatus.INTERNAL_SERVER_ERROR).json(Map.of("error", e.getMessage()));
        }
    }

    public void getAllPlannedTrips(Context ctx) {
        try {
            List<Trip> trips = tripRepository.findAllPlannedTrips();
            ctx.json(trips);
        } catch (Exception e) {
            ctx.status(HttpStatus.INTERNAL_SERVER_ERROR).json(Map.of("error", e.getMessage()));
        }
    }

    private void populateCityCoordinates(Trip trip) {
        Map<String, double[]> cityMap = Map.of(
                "HYDERABAD", new double[]{17.3850, 78.4867},
                "BENGALURU", new double[]{12.9716, 77.5946},
                "CHENNAI", new double[]{13.0827, 80.2707},
                "MUMBAI", new double[]{19.0760, 72.8777},
                "PUNE", new double[]{18.5204, 73.8567}
        );

        if (trip.getOriginLat() == 0 && trip.getOriginCity() != null) {
            double[] coords = cityMap.get(trip.getOriginCity().toUpperCase());
            if (coords != null) {
                trip.setOriginLat(coords[0]);
                trip.setOriginLng(coords[1]);
            }
        }
        if (trip.getDestinationLat() == 0 && trip.getDestinationCity() != null) {
            double[] coords = cityMap.get(trip.getDestinationCity().toUpperCase());
            if (coords != null) {
                trip.setDestinationLat(coords[0]);
                trip.setDestinationLng(coords[1]);
            }
        }
    }
}
