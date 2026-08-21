package com.cargonet.controller;

import com.cargonet.auth.AuthMiddleware;
import com.cargonet.model.User;
import com.cargonet.repository.UserRepository;
import com.cargonet.service.AuthService;
import io.javalin.http.Context;

import java.util.Map;

public class AuthController {
    private final AuthService authService;
    private final UserRepository userRepository;

    public AuthController(AuthService authService, UserRepository userRepository) {
        this.authService = authService;
        this.userRepository = userRepository;
    }

    public void register(Context ctx) {
        @SuppressWarnings("unchecked")
        Map<String, String> body = ctx.bodyAsClass(Map.class);
        String name = body.get("name");
        String email = body.get("email");
        String password = body.get("password");
        String phone = body.get("phone");
        String companyName = body.get("companyName");
        String role = body.get("role");

        Map<String, Object> result = authService.register(name, email, password, phone, companyName, role);
        ctx.status(201).json(result);
    }

    public void login(Context ctx) {
        @SuppressWarnings("unchecked")
        Map<String, String> body = ctx.bodyAsClass(Map.class);
        String email = body.get("email");
        String password = body.get("password");

        Map<String, Object> result = authService.login(email, password);
        ctx.json(result);
    }

    public void me(Context ctx) {
        AuthMiddleware.requireAuth(ctx);
        String userIdStr = ctx.attribute("userId");
        if (userIdStr != null) {
            Integer userId = Integer.parseInt(userIdStr);
            User user = userRepository.findById(userId);
            if (user != null) {
                ctx.json(user);
                return;
            }
        }
        ctx.status(404).json(Map.of("error", "User not found"));
    }
}
