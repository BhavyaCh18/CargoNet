package com.cargonet.controller;

import com.cargonet.auth.AuthMiddleware;
import com.cargonet.model.Cargo;
import com.cargonet.repository.CargoRepository;
import io.javalin.http.Context;

import java.time.LocalDate;
import java.util.List;
import java.util.Map;

public class CargoController {
    private final CargoRepository cargoRepository;

    public CargoController(CargoRepository cargoRepository) {
        this.cargoRepository = cargoRepository;
    }

    public void createCargo(Context ctx) {
        AuthMiddleware.requireAuth(ctx);
        String userIdStr = ctx.attribute("userId");
        Integer businessId = userIdStr != null ? Integer.parseInt(userIdStr) : null;

        @SuppressWarnings("unchecked")
        Map<String, Object> body = ctx.bodyAsClass(Map.class);
        Cargo cargo = new Cargo();
        cargo.setCargoName((String) body.get("cargoName"));
        cargo.setPickupLocation((String) body.get("pickupLocation"));
        cargo.setDestination((String) body.get("destination"));
        
        Object weightObj = body.get("weight");
        if (weightObj != null) cargo.setWeight(Double.parseDouble(weightObj.toString()));

        cargo.setDescription((String) body.get("description"));

        String pDate = (String) body.get("pickupDate");
        if (pDate != null && !pDate.isBlank()) cargo.setPickupDate(LocalDate.parse(pDate));

        String rDate = (String) body.get("requiredDeliveryDate");
        if (rDate != null && !rDate.isBlank()) cargo.setRequiredDeliveryDate(LocalDate.parse(rDate));

        cargo.setPreferredVehicleType((String) body.get("preferredVehicleType"));
        cargo.setSpecialHandling((String) body.get("specialHandling"));
        cargo.setStatus("SEARCHING");
        cargo.setBusinessId(businessId);

        Cargo saved = cargoRepository.save(cargo);
        ctx.status(201).json(saved);
    }

    public void getAllCargo(Context ctx) {
        String businessIdStr = ctx.queryParam("businessId");
        if (businessIdStr != null) {
            List<Cargo> list = cargoRepository.findByBusinessId(Integer.parseInt(businessIdStr));
            ctx.json(list);
            return;
        }
        List<Cargo> list = cargoRepository.findAll();
        ctx.json(list);
    }

    public void getCargoById(Context ctx) {
        Integer id = Integer.parseInt(ctx.pathParam("id"));
        Cargo cargo = cargoRepository.findById(id);
        if (cargo != null) {
            ctx.json(cargo);
        } else {
            ctx.status(404).json(Map.of("error", "Cargo not found"));
        }
    }

    public void updateCargo(Context ctx) {
        AuthMiddleware.requireAuth(ctx);
        Integer id = Integer.parseInt(ctx.pathParam("id"));
        Cargo existing = cargoRepository.findById(id);
        if (existing == null) {
            ctx.status(404).json(Map.of("error", "Cargo not found"));
            return;
        }

        @SuppressWarnings("unchecked")
        Map<String, Object> body = ctx.bodyAsClass(Map.class);
        if (body.containsKey("cargoName")) existing.setCargoName((String) body.get("cargoName"));
        if (body.containsKey("pickupLocation")) existing.setPickupLocation((String) body.get("pickupLocation"));
        if (body.containsKey("destination")) existing.setDestination((String) body.get("destination"));
        if (body.containsKey("weight")) existing.setWeight(Double.parseDouble(body.get("weight").toString()));
        if (body.containsKey("status")) existing.setStatus((String) body.get("status"));

        cargoRepository.updateStatus(id, existing.getStatus());
        ctx.json(existing);
    }

    public void deleteCargo(Context ctx) {
        AuthMiddleware.requireAuth(ctx);
        Integer id = Integer.parseInt(ctx.pathParam("id"));
        boolean ok = cargoRepository.deleteById(id);
        if (ok) {
            ctx.json(Map.of("message", "Cargo deleted successfully"));
        } else {
            ctx.status(400).json(Map.of("error", "Failed to delete cargo"));
        }
    }
}
