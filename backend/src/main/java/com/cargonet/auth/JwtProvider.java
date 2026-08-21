package com.cargonet.auth;

import com.auth0.jwt.JWT;
import com.auth0.jwt.algorithms.Algorithm;
import com.auth0.jwt.interfaces.DecodedJWT;
import com.cargonet.config.DatabaseConfig;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import java.util.Date;

public class JwtProvider {

    private static final Logger logger = LoggerFactory.getLogger(JwtProvider.class);
    private static final long EXPIRATION_TIME_MS = 7 * 24 * 60 * 60 * 1000L; // 7 days

    private static Algorithm getAlgorithm() {
        String secret = DatabaseConfig.getEnv("JWT_SECRET", "india_shared_transport_network_jwt_secret_key_2026_safe");
        return Algorithm.HMAC256(secret);
    }

    public static String generateToken(String userId, String email, String role, String name) {
        return JWT.create()
                .withSubject(userId)
                .withClaim("email", email)
                .withClaim("role", role)
                .withClaim("name", name)
                .withIssuedAt(new Date())
                .withExpiresAt(new Date(System.currentTimeMillis() + EXPIRATION_TIME_MS))
                .sign(getAlgorithm());
    }

    public static DecodedJWT verifyToken(String token) {
        try {
            return JWT.require(getAlgorithm())
                    .build()
                    .verify(token);
        } catch (Exception e) {
            logger.warn("JWT verification failed: {}", e.getMessage());
            return null;
        }
    }
}
