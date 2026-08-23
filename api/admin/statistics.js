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

        // Query KPI statistics
        const usersCount = await pool.query("SELECT COUNT(*) FROM users");
        const businessesCount = await pool.query("SELECT COUNT(*) FROM users WHERE role = 'BUSINESS'");
        const truckOwnersCount = await pool.query("SELECT COUNT(*) FROM users WHERE role = 'TRUCK_OWNER'");
        const trucksCount = await pool.query("SELECT COUNT(*) FROM trucks");
        const cargoCount = await pool.query("SELECT COUNT(*) FROM cargo");
        const activeBookingsCount = await pool.query("SELECT COUNT(*) FROM bookings WHERE status IN ('CONFIRMED', 'PAID', 'IN_TRANSIT', 'CARGO_PICKED_UP')");
        const completedDeliveriesCount = await pool.query("SELECT COUNT(*) FROM bookings WHERE status = 'DELIVERED'");
        const returnLoadsCount = await pool.query("SELECT COUNT(*) FROM bookings WHERE is_return_load = true");

        const returnCount = Number(returnLoadsCount.rows[0].count || 0);

        return res.status(200).json({
            totalUsers: Number(usersCount.rows[0].count || 0),
            totalBusinesses: Number(businessesCount.rows[0].count || 0),
            totalTruckOwners: Number(truckOwnersCount.rows[0].count || 0),
            totalTrucks: Number(trucksCount.rows[0].count || 0),
            totalCargo: Number(cargoCount.rows[0].count || 0),
            activeBookings: Number(activeBookingsCount.rows[0].count || 0),
            completedDeliveries: Number(completedDeliveriesCount.rows[0].count || 0),
            returnLoadsMatched: returnCount,
            estimatedEmptyTripsReduced: returnCount
        });

    } catch (error) {
        console.error("Admin statistics API error:", error);
        return res.status(500).json({
            error: error.message
        });
    }
};
