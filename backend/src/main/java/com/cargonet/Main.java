package com.cargonet;

import com.cargonet.config.DatabaseConfig;
import com.cargonet.controller.*;
import com.cargonet.repository.*;
import com.cargonet.service.*;
import io.javalin.Javalin;
import io.javalin.http.staticfiles.Location;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import java.io.File;
import java.util.Map;

public class Main {

    private static final Logger logger = LoggerFactory.getLogger(Main.class);

    public static void main(String[] args) {
        int port = Integer.parseInt(DatabaseConfig.getEnv("PORT", "8080"));

        logger.info("Initializing Repositories & Services...");

        UserRepository userRepository = new UserRepository();
        TruckRepository truckRepository = new TruckRepository();
        CargoRepository cargoRepository = new CargoRepository();
        BookingRepository bookingRepository = new BookingRepository();
        PaymentRepository paymentRepository = new PaymentRepository();
        TrackingRepository trackingRepository = new TrackingRepository();
        NotificationRepository notificationRepository = new NotificationRepository();
        ReviewRepository reviewRepository = new ReviewRepository();
        ComplaintRepository complaintRepository = new ComplaintRepository();

        AuthService authService = new AuthService(userRepository);
        MatchingEngine matchingEngine = new MatchingEngine();

        AuthController authController = new AuthController(authService, userRepository);
        TruckController truckController = new TruckController(truckRepository);
        CargoController cargoController = new CargoController(cargoRepository);
        MatchController matchController = new MatchController(cargoRepository, truckRepository, bookingRepository, matchingEngine);
        BookingController bookingController = new BookingController(bookingRepository, truckRepository, cargoRepository, trackingRepository, notificationRepository);
        TrackingController trackingController = new TrackingController(trackingRepository, bookingRepository);
        PaymentController paymentController = new PaymentController(paymentRepository, bookingRepository);
        NotificationController notificationController = new NotificationController(notificationRepository);
        ReviewController reviewController = new ReviewController(reviewRepository);
        ComplaintController complaintController = new ComplaintController(complaintRepository);
        AdminController adminController = new AdminController(userRepository, truckRepository, cargoRepository, bookingRepository);

        Javalin app = Javalin.create(config -> {
            config.bundledPlugins.enableCors(cors -> {
                cors.addRule(it -> it.anyHost());
            });

            // Serve static frontend files
            File frontendDir = new File("frontend");
            if (frontendDir.exists()) {
                config.staticFiles.add(staticFiles -> {
                    staticFiles.hostedPath = "/";
                    staticFiles.directory = "frontend";
                    staticFiles.location = Location.EXTERNAL;
                });
                logger.info("Serving static frontend files from {}", frontendDir.getAbsolutePath());
            } else {
                File parentFrontend = new File("../frontend");
                if (parentFrontend.exists()) {
                    config.staticFiles.add(staticFiles -> {
                        staticFiles.hostedPath = "/";
                        staticFiles.directory = "../frontend";
                        staticFiles.location = Location.EXTERNAL;
                    });
                }
            }
        });

        // Health
        app.get("/api/v1/health", ctx -> ctx.result("UP"));

        // Authentication
        app.post("/api/v1/auth/register", authController::register);
        app.post("/api/v1/auth/login", authController::login);
        app.get("/api/v1/auth/me", authController::me);

        // Trucks
        app.post("/api/v1/trucks", truckController::createTruck);
        app.get("/api/v1/trucks", truckController::getAllTrucks);
        app.get("/api/v1/trucks/{id}", truckController::getTruckById);
        app.put("/api/v1/trucks/{id}", truckController::updateTruck);
        app.delete("/api/v1/trucks/{id}", truckController::deleteTruck);
        app.put("/api/v1/trucks/{id}/status", truckController::updateTruckStatus);

        // Cargo
        app.post("/api/v1/cargo", cargoController::createCargo);
        app.get("/api/v1/cargo", cargoController::getAllCargo);
        app.get("/api/v1/cargo/{id}", cargoController::getCargoById);
        app.put("/api/v1/cargo/{id}", cargoController::updateCargo);
        app.delete("/api/v1/cargo/{id}", cargoController::deleteCargo);

        // Matching
        app.get("/api/v1/matching/cargo/{cargoId}", matchController::matchTrucksForCargo);
        app.get("/api/v1/matching/return-load/{truckId}", matchController::matchReturnLoadsForTruck);

        // Bookings (SPECIFIC PATHS FIRST BEFORE /{id})
        app.post("/api/v1/bookings/return-load", bookingController::createReturnBooking);
        app.post("/api/v1/bookings", bookingController::createBooking);
        app.get("/api/v1/bookings/my-bookings", bookingController::getMyBookings);
        app.get("/api/v1/bookings/{id}", bookingController::getBookingById);
        app.put("/api/v1/bookings/{id}/accept", bookingController::updateBookingStatus);
        app.put("/api/v1/bookings/{id}/reject", bookingController::updateBookingStatus);
        app.put("/api/v1/bookings/{id}/cancel", bookingController::updateBookingStatus);
        app.put("/api/v1/bookings/{id}/status", bookingController::updateBookingStatus);

        // Tracking
        app.get("/api/v1/tracking/{bookingId}", trackingController::getTrackingByBookingId);
        app.put("/api/v1/tracking/{bookingId}/status", trackingController::updateTrackingStatus);

        // Payments
        app.post("/api/v1/payments", paymentController::processPayment);
        app.get("/api/v1/payments/{bookingId}", paymentController::getPaymentByBookingId);

        // Notifications
        app.get("/api/v1/notifications", notificationController::getMyNotifications);
        app.put("/api/v1/notifications/{id}/read", notificationController::markAsRead);

        // Reviews
        app.post("/api/v1/reviews", reviewController::createReview);
        app.get("/api/v1/reviews/{truckId}", reviewController::getReviewsByTruckId);

        // Complaints
        app.post("/api/v1/complaints", complaintController::createComplaint);
        app.get("/api/v1/complaints", complaintController::getAllComplaints);
        app.put("/api/v1/complaints/{id}/resolve", complaintController::resolveComplaint);

        // Admin (SPECIFIC PATHS FIRST BEFORE /{id})
        app.get("/api/v1/admin/dashboard", adminController::getDashboard);
        app.get("/api/v1/admin/statistics", adminController::getStatistics);
        app.get("/api/v1/admin/users", adminController::getUsers);
        app.put("/api/v1/admin/users/{id}/toggle-block", adminController::toggleBlockUser);
        app.get("/api/v1/admin/trucks", adminController::getTrucks);
        app.get("/api/v1/admin/cargo", adminController::getCargo);
        app.get("/api/v1/admin/bookings", adminController::getBookings);

        // Exception handlers
        app.exception(IllegalArgumentException.class, (e, ctx) -> {
            ctx.status(400).json(Map.of("error", e.getMessage()));
        });
        app.exception(Exception.class, (e, ctx) -> {
            logger.error("Unhandled Exception: ", e);
            ctx.status(500).json(Map.of("error", "Internal Server Error: " + e.getMessage()));
        });

        app.start(port);
        logger.info("🚚 India Shared Transport Network Server started on http://localhost:{}", port);
    }
}
