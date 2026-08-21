package com.cargonet.controller;

import com.cargonet.auth.AuthMiddleware;
import com.cargonet.model.Notification;
import com.cargonet.repository.NotificationRepository;
import io.javalin.http.Context;

import java.util.List;
import java.util.Map;

public class NotificationController {
    private final NotificationRepository notificationRepository;

    public NotificationController(NotificationRepository notificationRepository) {
        this.notificationRepository = notificationRepository;
    }

    public void getMyNotifications(Context ctx) {
        AuthMiddleware.requireAuth(ctx);
        String userIdStr = ctx.attribute("userId");
        if (userIdStr != null) {
            Integer userId = Integer.parseInt(userIdStr);
            List<Notification> list = notificationRepository.findByUserId(userId);
            ctx.json(list);
            return;
        }
        ctx.json(List.of());
    }

    public void markAsRead(Context ctx) {
        AuthMiddleware.requireAuth(ctx);
        Integer id = Integer.parseInt(ctx.pathParam("id"));
        boolean ok = notificationRepository.markAsRead(id);
        if (ok) {
            ctx.json(Map.of("message", "Notification marked as read"));
        } else {
            ctx.status(400).json(Map.of("error", "Failed to update notification"));
        }
    }
}
