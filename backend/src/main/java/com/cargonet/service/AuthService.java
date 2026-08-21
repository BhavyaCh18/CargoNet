package com.cargonet.service;

import com.cargonet.auth.JwtProvider;
import com.cargonet.model.User;
import com.cargonet.repository.UserRepository;
import org.mindrot.jbcrypt.BCrypt;
import java.util.HashMap;
import java.util.Map;

public class AuthService {
    private final UserRepository userRepository;

    public AuthService(UserRepository userRepository) {
        this.userRepository = userRepository;
    }

    public Map<String, Object> register(String name, String email, String password, String phone, String companyName, String role) {
        if (email == null || email.isBlank() || password == null || password.isBlank()) {
            throw new IllegalArgumentException("Email and password are required.");
        }

        User existing = userRepository.findByEmail(email);
        if (existing != null) {
            throw new IllegalArgumentException("An account with this email already exists.");
        }

        // Map role if SHIPPER/TRANSPORTER provided to BUSINESS/TRUCK_OWNER
        String normalizedRole = role != null ? role.toUpperCase() : "BUSINESS";
        if ("SHIPPER".equalsIgnoreCase(normalizedRole)) normalizedRole = "BUSINESS";
        if ("TRANSPORTER".equalsIgnoreCase(normalizedRole)) normalizedRole = "TRUCK_OWNER";

        String hashedPassword = BCrypt.hashpw(password, BCrypt.gensalt());

        User user = new User();
        user.setName(name != null ? name : email.split("@")[0]);
        user.setEmail(email.toLowerCase().trim());
        user.setPasswordHash(hashedPassword);
        user.setPhone(phone);
        user.setCompanyName(companyName);
        user.setRole(normalizedRole);
        user.setStatus("ACTIVE");

        User saved = userRepository.save(user);

        String token = JwtProvider.generateToken(
            String.valueOf(saved.getId()),
            saved.getEmail(),
            saved.getRole(),
            saved.getName()
        );

        Map<String, Object> response = new HashMap<>();
        response.put("token", token);
        response.put("user", saved);
        return response;
    }

    public Map<String, Object> login(String email, String password) {
        if (email == null || email.isBlank() || password == null || password.isBlank()) {
            throw new IllegalArgumentException("Email and password are required.");
        }

        User user = userRepository.findByEmail(email.trim());
        if (user == null) {
            throw new IllegalArgumentException("Invalid email or password.");
        }

        if ("BLOCKED".equalsIgnoreCase(user.getStatus())) {
            throw new IllegalArgumentException("Your account has been blocked by administrator.");
        }

        if (user.getPasswordHash() == null || user.getPasswordHash().isBlank() || !user.getPasswordHash().startsWith("$2")) {
            throw new IllegalArgumentException("Invalid email or password.");
        }

        if (!BCrypt.checkpw(password, user.getPasswordHash())) {
            throw new IllegalArgumentException("Invalid email or password.");
        }

        String token = JwtProvider.generateToken(
            String.valueOf(user.getId()),
            user.getEmail(),
            user.getRole(),
            user.getName()
        );

        Map<String, Object> response = new HashMap<>();
        response.put("token", token);
        response.put("user", user);
        return response;
    }
}
