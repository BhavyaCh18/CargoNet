const pool = require("../lib/db");
const jwt = require("jsonwebtoken");

module.exports = async (req, res) => {
    try {
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

        const userRole = (decoded.role || "").toUpperCase();

        if (userRole !== "ADMIN") {
            return res.status(403).json({ error: "Admin authorization required" });
        }

        const rawUrl = req.url ? req.url.split("?")[0] : "";

        // =========================
        // 1. GET /api/admin/statistics
        // =========================
        if (rawUrl.includes("/statistics")) {
            if (req.method !== "GET") return res.status(405).json({ error: "Method not allowed" });

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
        }

        // =========================
        // 2. PUT /api/admin/users/:userId/toggle-block
        // =========================
        if (rawUrl.includes("/toggle-block") || req.method === "PUT") {
            const matches = rawUrl.match(/\/users\/(\d+)\/toggle-block/);
            const userIdParam = matches ? matches[1] : (req.query.userId || req.query.id);
            const targetUserId = Number(userIdParam);

            if (!targetUserId || isNaN(targetUserId)) {
                return res.status(400).json({ error: "Valid user ID is required" });
            }

            const userResult = await pool.query("SELECT id, status FROM users WHERE id = $1", [targetUserId]);

            if (userResult.rows.length === 0) {
                return res.status(404).json({ error: "User not found" });
            }

            const currentStatus = userResult.rows[0].status || "ACTIVE";
            const newStatus = currentStatus === "BLOCKED" ? "ACTIVE" : "BLOCKED";

            await pool.query("UPDATE users SET status = $1 WHERE id = $2", [newStatus, targetUserId]);

            return res.status(200).json({
                message: `User status toggled to ${newStatus}`,
                status: newStatus
            });
        }

        // =========================
        // 3. GET /api/admin/users
        // =========================
        if (rawUrl.includes("/users")) {
            if (req.method !== "GET") return res.status(405).json({ error: "Method not allowed" });

            const result = await pool.query(
                `SELECT id, name, email, company_name AS "companyName", role, status, created_at AS "createdAt"
                 FROM users ORDER BY created_at DESC, id DESC`
            );

            return res.status(200).json(result.rows);
        }

        // =========================
        // 4. GET /api/admin/trucks
        // =========================
        if (rawUrl.includes("/trucks")) {
            if (req.method !== "GET") return res.status(405).json({ error: "Method not allowed" });

            const result = await pool.query(
                `SELECT t.id, t.vehicle_number AS "vehicleNumber", t.vehicle_type AS "vehicleType",
                        t.max_capacity AS "maxCapacity", t.available_capacity AS "availableCapacity",
                        t.current_location AS "currentLocation", t.destination, t.status, u.name AS "ownerName"
                 FROM trucks t LEFT JOIN users u ON t.owner_id = u.id ORDER BY t.created_at DESC`
            );

            return res.status(200).json(result.rows);
        }

        // =========================
        // 5. GET /api/admin/cargo
        // =========================
        if (rawUrl.includes("/cargo")) {
            if (req.method !== "GET") return res.status(405).json({ error: "Method not allowed" });

            const result = await pool.query(
                `SELECT c.id, c.cargo_name AS "cargoName", c.pickup_location AS "pickupLocation",
                        c.destination, c.weight, c.status, u.name AS "businessName"
                 FROM cargo c LEFT JOIN users u ON c.business_id = u.id ORDER BY c.created_at DESC`
            );

            return res.status(200).json(result.rows);
        }

        // =========================
        // 6. GET /api/admin/bookings
        // =========================
        if (rawUrl.includes("/bookings")) {
            if (req.method !== "GET") return res.status(405).json({ error: "Method not allowed" });

            const result = await pool.query(
                `SELECT b.id, b.booking_code AS "bookingCode", b.pickup_location AS "pickupLocation",
                        b.destination, b.total_cost AS "totalCost", b.status, b.is_return_load AS "isReturnLoad",
                        u.name AS "businessName", t.vehicle_number AS "vehicleNumber"
                 FROM bookings b
                 LEFT JOIN users u ON b.business_id = u.id
                 LEFT JOIN trucks t ON b.truck_id = t.id
                 ORDER BY b.booking_date DESC, b.id DESC`
            );

            return res.status(200).json(result.rows);
        }

        return res.status(404).json({ error: "Endpoint not found" });

    } catch (error) {
        console.error("Admin API error:", error);
        return res.status(500).json({ error: error.message });
    }
};
