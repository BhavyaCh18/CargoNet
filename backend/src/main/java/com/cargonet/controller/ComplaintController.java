package com.cargonet.controller;

import com.cargonet.auth.AuthMiddleware;
import com.cargonet.model.Complaint;
import com.cargonet.repository.ComplaintRepository;
import io.javalin.http.Context;

import java.util.List;
import java.util.Map;

public class ComplaintController {
    private final ComplaintRepository complaintRepository;

    public ComplaintController(ComplaintRepository complaintRepository) {
        this.complaintRepository = complaintRepository;
    }

    public void createComplaint(Context ctx) {
        AuthMiddleware.requireAuth(ctx);
        String userIdStr = ctx.attribute("userId");
        Integer userId = userIdStr != null ? Integer.parseInt(userIdStr) : null;

        @SuppressWarnings("unchecked")
        Map<String, Object> body = ctx.bodyAsClass(Map.class);
        Complaint complaint = new Complaint();
        complaint.setUserId(userId);
        if (body.get("bookingId") != null) complaint.setBookingId(Integer.parseInt(body.get("bookingId").toString()));
        complaint.setSubject((String) body.get("subject"));
        complaint.setDescription((String) body.get("description"));
        complaint.setStatus("PENDING");

        Complaint saved = complaintRepository.save(complaint);
        ctx.status(201).json(saved);
    }

    public void getAllComplaints(Context ctx) {
        AuthMiddleware.requireRole(ctx, "ADMIN");
        List<Complaint> list = complaintRepository.findAll();
        ctx.json(list);
    }

    public void resolveComplaint(Context ctx) {
        AuthMiddleware.requireRole(ctx, "ADMIN");
        Integer id = Integer.parseInt(ctx.pathParam("id"));
        boolean ok = complaintRepository.resolve(id);
        if (ok) {
            ctx.json(Map.of("message", "Complaint marked as resolved"));
        } else {
            ctx.status(400).json(Map.of("error", "Failed to resolve complaint"));
        }
    }
}
