const pool = require("../../lib/db");
const jwt = require("jsonwebtoken");

module.exports = async (req, res) => {
    try {
        if (req.method !== "GET") {
            return res.status(405).json({
                error: "Method not allowed"
            });
        }

        const authHeader = req.headers.authorization;

        if (!authHeader || !authHeader.startsWith("Bearer ")) {
            return res.status(401).json({
                error: "Unauthorized"
            });
        }

        const token = authHeader.split(" ")[1];

        let decoded;
        try {
            decoded = jwt.verify(token, process.env.JWT_SECRET);
        } catch (err) {
            return res.status(401).json({
                error: "Invalid or expired token"
            });
        }

        const userRole = (decoded.role || "").toUpperCase();

        if (userRole !== "ADMIN") {
            return res.status(403).json({
                error: "Admin authorization required"
            });
        }

        const result = await pool.query(
            `
            SELECT
                b.id,
                b.booking_code AS "bookingCode",
                b.pickup_location AS "pickupLocation",
                b.destination,
                b.total_cost AS "totalCost",
                b.status,
                b.is_return_load AS "isReturnLoad",
                u.name AS "businessName",
                t.vehicle_number AS "vehicleNumber"
            FROM bookings b
            LEFT JOIN users u ON b.business_id = u.id
            LEFT JOIN trucks t ON b.truck_id = t.id
            ORDER BY b.booking_date DESC, b.id DESC
            `
        );

        return res.status(200).json(result.rows);

    } catch (error) {
        console.error("Admin bookings API error:", error);
        return res.status(500).json({
            error: error.message
        });
    }
};
