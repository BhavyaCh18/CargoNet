package com.cargonet.controller;

import com.cargonet.auth.AuthMiddleware;
import com.cargonet.model.Shipment;
import com.cargonet.repository.ShipmentRepository;
import io.javalin.http.Context;
import io.javalin.http.HttpStatus;

import java.util.List;
import java.util.Map;

public class ShipmentController {

    private final ShipmentRepository shipmentRepository = new ShipmentRepository();

    public void createShipment(Context ctx) {
        AuthMiddleware.requireRole(ctx, "SHIPPER", "ADMIN");
        try {
            Shipment shipment = ctx.bodyAsClass(Shipment.class);
            shipment.setBusinessId(ctx.attribute("userId"));

            populateCityCoordinates(shipment);

            Shipment saved = shipmentRepository.save(shipment);
            ctx.status(HttpStatus.CREATED).json(saved);
        } catch (Exception e) {
            ctx.status(HttpStatus.BAD_REQUEST).json(Map.of("error", "Failed to post shipment: " + e.getMessage()));
        }
    }

    public void getMyShipments(Context ctx) {
        AuthMiddleware.requireAuth(ctx);
        try {
            String userId = ctx.attribute("userId");
            List<Shipment> shipments = shipmentRepository.findByBusinessUserId(userId);
            ctx.json(shipments);
        } catch (Exception e) {
            ctx.status(HttpStatus.INTERNAL_SERVER_ERROR).json(Map.of("error", e.getMessage()));
        }
    }

    public void getPendingShipments(Context ctx) {
        try {
            List<Shipment> shipments = shipmentRepository.findAllPending();
            ctx.json(shipments);
        } catch (Exception e) {
            ctx.status(HttpStatus.INTERNAL_SERVER_ERROR).json(Map.of("error", e.getMessage()));
        }
    }

    private void populateCityCoordinates(Shipment shipment) {
        Map<String, double[]> cityMap = Map.of(
                "HYDERABAD", new double[]{17.3850, 78.4867},
                "BENGALURU", new double[]{12.9716, 77.5946},
                "CHENNAI", new double[]{13.0827, 80.2707},
                "MUMBAI", new double[]{19.0760, 72.8777},
                "PUNE", new double[]{18.5204, 73.8567}
        );

        if (shipment.getPickupLat() == 0 && shipment.getPickupCity() != null) {
            double[] coords = cityMap.get(shipment.getPickupCity().toUpperCase());
            if (coords != null) {
                shipment.setPickupLat(coords[0]);
                shipment.setPickupLng(coords[1]);
            }
        }
        if (shipment.getDropLat() == 0 && shipment.getDropCity() != null) {
            double[] coords = cityMap.get(shipment.getDropCity().toUpperCase());
            if (coords != null) {
                shipment.setDropLat(coords[0]);
                shipment.setDropLng(coords[1]);
            }
        }
    }
}
