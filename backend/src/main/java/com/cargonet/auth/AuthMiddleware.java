package com.cargonet.auth;

import com.auth0.jwt.interfaces.DecodedJWT;
import io.javalin.http.Context;
import io.javalin.http.UnauthorizedResponse;
import io.javalin.http.ForbiddenResponse;

public class AuthMiddleware {

    public static void authenticate(Context ctx) {
        String authHeader = ctx.header("Authorization");
        String token = null;

        if (authHeader != null && authHeader.startsWith("Bearer ")) {
            token = authHeader.substring(7);
        } else if (authHeader != null && !authHeader.isBlank()) {
            token = authHeader.trim();
        } else if (ctx.queryParam("token") != null) {
            token = ctx.queryParam("token");
        }

        if (token != null && !token.isBlank()) {
            DecodedJWT jwt = JwtProvider.verifyToken(token);
            if (jwt != null) {
                ctx.attribute("userId", jwt.getSubject());
                ctx.attribute("userEmail", jwt.getClaim("email").asString());
                ctx.attribute("userRole", jwt.getClaim("role").asString());
                ctx.attribute("userName", jwt.getClaim("name").asString());
            }
        }
    }

    public static void requireAuth(Context ctx) {
        authenticate(ctx);
        if (ctx.attribute("userId") == null) {
            throw new UnauthorizedResponse("Authentication token is missing or invalid");
        }
    }

    public static void requireRole(Context ctx, String... allowedRoles) {
        requireAuth(ctx);
        String currentRole = ctx.attribute("userRole");
        boolean allowed = false;
        for (String role : allowedRoles) {
            if (role.equalsIgnoreCase(currentRole) || 
               ("BUSINESS".equalsIgnoreCase(role) && "SHIPPER".equalsIgnoreCase(currentRole)) ||
               ("TRUCK_OWNER".equalsIgnoreCase(role) && "TRANSPORTER".equalsIgnoreCase(currentRole))) {
                allowed = true;
                break;
            }
        }
        if (!allowed) {
            throw new ForbiddenResponse("Access denied for role: " + currentRole);
        }
    }
}
