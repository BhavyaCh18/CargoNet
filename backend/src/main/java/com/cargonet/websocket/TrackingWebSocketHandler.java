package com.cargonet.websocket;

import com.cargonet.model.Tracking;
import com.cargonet.repository.TrackingRepository;
import com.fasterxml.jackson.databind.ObjectMapper;
import io.javalin.websocket.WsConfig;
import io.javalin.websocket.WsContext;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import java.util.Map;
import java.util.Set;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.CopyOnWriteArraySet;

public class TrackingWebSocketHandler {

    private static final Logger logger = LoggerFactory.getLogger(TrackingWebSocketHandler.class);
    private static final Map<String, Set<WsContext>> sessionsMap = new ConcurrentHashMap<>();
    private static final TrackingRepository trackingRepository = new TrackingRepository();
    private static final ObjectMapper objectMapper = new ObjectMapper();

    public static void configure(WsConfig ws) {
        ws.onConnect(ctx -> {
            String bookingId = ctx.pathParam("bookingId");
            sessionsMap.computeIfAbsent(bookingId, k -> new CopyOnWriteArraySet<>()).add(ctx);
            logger.info("WebSocket connected for booking: {}", bookingId);

            ctx.send(objectMapper.writeValueAsString(Map.of(
                    "type", "CONNECTED",
                    "bookingId", bookingId,
                    "message", "Live GPS tracking channel established."
            )));
        });

        ws.onClose(ctx -> {
            String bookingId = ctx.pathParam("bookingId");
            Set<WsContext> sessions = sessionsMap.get(bookingId);
            if (sessions != null) {
                sessions.remove(ctx);
                if (sessions.isEmpty()) {
                    sessionsMap.remove(bookingId);
                }
            }
            logger.info("WebSocket disconnected for booking: {}", bookingId);
        });

        ws.onMessage(ctx -> {
            String bookingIdStr = ctx.pathParam("bookingId");
            String message = ctx.message();
            logger.info("Received WS location update for booking {}: {}", bookingIdStr, message);

            try {
                @SuppressWarnings("unchecked")
                Map<String, Object> data = objectMapper.readValue(message, Map.class);
                Integer bookingId = Integer.parseInt(bookingIdStr);
                double lat = Double.parseDouble(data.get("lat").toString());
                double lng = Double.parseDouble(data.get("lng").toString());
                String loc = data.containsKey("currentLocation") ? data.get("currentLocation").toString() : "In-Transit";
                String status = data.containsKey("status") ? data.get("status").toString() : "IN_TRANSIT";

                Tracking log = new Tracking();
                log.setBookingId(bookingId);
                log.setLatitude(lat);
                log.setLongitude(lng);
                log.setCurrentLocation(loc);
                log.setStatus(status);

                trackingRepository.save(log);

                broadcastLocation(bookingIdStr, log);
            } catch (Exception e) {
                logger.error("Failed to parse tracking message: ", e);
            }
        });

        ws.onError(ctx -> {
            logger.warn("WebSocket error on booking {}: {}", ctx.pathParam("bookingId"), ctx.error());
        });
    }

    public static void broadcastLocation(String bookingId, Tracking log) {
        Set<WsContext> sessions = sessionsMap.get(bookingId);
        if (sessions != null) {
            try {
                String payload = objectMapper.writeValueAsString(Map.of(
                        "type", "LOCATION_UPDATE",
                        "bookingId", bookingId,
                        "lat", log.getLatitude(),
                        "lng", log.getLongitude(),
                        "currentLocation", log.getCurrentLocation() != null ? log.getCurrentLocation() : "In-Transit",
                        "status", log.getStatus() != null ? log.getStatus() : "IN_TRANSIT"
                ));
                sessions.forEach(s -> {
                    if (s.session.isOpen()) {
                        s.send(payload);
                    }
                });
            } catch (Exception e) {
                logger.error("Error broadcasting location: ", e);
            }
        }
    }
}
