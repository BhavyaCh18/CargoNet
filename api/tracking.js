const pool = require("../lib/db");
const jwt = require("jsonwebtoken");

module.exports = async (req, res) => {
    try {
        if (req.method !== "GET") {
            return res.status(405).json({ error: "Method not allowed" });
        }

        const authHeader = req.headers.authorization;

        if (!authHeader || !authHeader.startsWith("Bearer ")) {
            return res.status(401).json({ error: "Unauthorized" });
        }

        const token = authHeader.split(" ")[1];

        let decoded;
        try {
            decoded = jwt.verify(token, process.env.JWT_SECRET);
        } catch (err) {
            return res.status(401).json({ error: "Invalid or expired token" });
        }

        const userId = Number(decoded.sub);
        const userRole = (decoded.role || "").toUpperCase();

        const rawUrl = req.url ? req.url.split("?")[0] : "";
        const matches = rawUrl.match(/\/tracking\/(\d+)/);
        const bookingIdParam = matches ? matches[1] : (req.query.bookingId || req.query.id);
        const bookingId = Number(bookingIdParam);

        if (!bookingId || isNaN(bookingId)) {
            return res.status(400).json({ error: "Valid booking ID is required" });
        }

        // Get booking and cargo details
        const bookingResult = await pool.query(
            `
            SELECT
                b.id,
                b.booking_code,
                b.business_id,
                b.truck_id,
                b.cargo_id,
                b.pickup_location,
                b.destination,
                b.weight,
                b.status,
                b.is_return_load,
                c.cargo_name,
                t.owner_id AS truck_owner_id,
                t.current_location AS truck_current_location
            FROM bookings b
            LEFT JOIN cargo c ON b.cargo_id = c.id
            LEFT JOIN trucks t ON b.truck_id = t.id
            WHERE b.id = $1
            `,
            [bookingId]
        );

        if (bookingResult.rows.length === 0) {
            return res.status(404).json({ error: "Booking not found" });
        }

        const booking = bookingResult.rows[0];

        const isBusinessOwner = Number(booking.business_id) === userId;
        const isTruckOwner = Number(booking.truck_owner_id) === userId;
        const isAdmin = userRole === "ADMIN";

        if (!isBusinessOwner && !isTruckOwner && !isAdmin) {
            return res.status(403).json({ error: "You are not authorized to access this tracking information" });
        }

        // Get latest tracking update
        const trackingResult = await pool.query(
            `
            SELECT current_location, latitude, longitude, updated_at, notes
            FROM tracking
            WHERE booking_id = $1
            ORDER BY updated_at DESC, id DESC
            LIMIT 1
            `,
            [bookingId]
        );

        let tracking = trackingResult.rows.length > 0 ? trackingResult.rows[0] : null;

        if (!tracking) {
            tracking = {
                currentLocation: booking.truck_current_location || booking.pickup_location,
                latitude: null,
                longitude: null
            };
        } else {
            tracking = {
                currentLocation: tracking.current_location,
                latitude: tracking.latitude ? Number(tracking.latitude) : null,
                longitude: tracking.longitude ? Number(tracking.longitude) : null,
                updatedAt: tracking.updated_at,
                notes: tracking.notes
            };
        }

        return res.status(200).json({
            booking: {
                id: booking.id,
                bookingCode: booking.booking_code,
                cargoName: booking.cargo_name || "Cargo",
                pickupLocation: booking.pickup_location,
                destination: booking.destination,
                weight: Number(booking.weight),
                status: booking.status,
                isReturnLoad: Boolean(booking.is_return_load)
            },
            tracking: tracking
        });

    } catch (error) {
        console.error("Tracking API error:", error);
        return res.status(500).json({ error: error.message });
    }
};
