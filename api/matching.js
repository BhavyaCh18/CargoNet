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

        try {
            jwt.verify(token, process.env.JWT_SECRET);
        } catch (err) {
            return res.status(401).json({ error: "Invalid or expired token" });
        }

        const rawUrl = req.url ? req.url.split("?")[0] : "";

        // =========================
        // 1. GET /api/matching/return-load/:truckId
        // =========================
        if (rawUrl.includes("/return-load")) {
            const matches = rawUrl.match(/\/return-load\/(\d+)/);
            const truckId = matches ? Number(matches[1]) : (req.query.truckId ? Number(req.query.truckId) : null);

            if (!truckId || isNaN(truckId)) {
                return res.status(400).json({ error: "Valid truck ID is required" });
            }

            const truckResult = await pool.query("SELECT * FROM trucks WHERE id = $1", [truckId]);

            if (truckResult.rows.length === 0) {
                return res.status(404).json({ error: "Truck not found" });
            }

            const truck = truckResult.rows[0];
            const pickupLocation = truck.current_location || truck.destination;
            const returnDestination = truck.return_destination || truck.original_pickup_location;

            const cargoResult = await pool.query(
                `
                SELECT
                    c.id,
                    c.cargo_name AS "cargoName",
                    c.pickup_location AS "pickupLocation",
                    c.destination,
                    c.weight,
                    c.special_handling AS "specialHandling",
                    c.status,
                    u.name AS "businessName"
                FROM cargo c
                LEFT JOIN users u ON c.business_id = u.id
                WHERE c.status IN ('SEARCHING', 'ACTIVE')
                  AND LOWER(c.pickup_location) = LOWER($1)
                ORDER BY c.created_at DESC
                `,
                [pickupLocation]
            );

            return res.status(200).json({
                pickupLocation,
                returnDestination,
                availableCapacity: Number(truck.available_capacity || truck.max_capacity),
                matchingCargo: cargoResult.rows
            });
        }

        // =========================
        // 2. GET /api/matching/cargo/:cargoId
        // =========================
        const matches = rawUrl.match(/\/cargo\/(\d+)/);
        const cargoId = matches ? Number(matches[1]) : (req.query.cargoId ? Number(req.query.cargoId) : null);

        if (!cargoId || isNaN(cargoId)) {
            return res.status(400).json({ error: "Valid cargo ID is required" });
        }

        const cargoResult = await pool.query("SELECT * FROM cargo WHERE id = $1", [cargoId]);

        if (cargoResult.rows.length === 0) {
            return res.status(404).json({ error: "Cargo not found" });
        }

        const cargo = cargoResult.rows[0];

        const trucksResult = await pool.query(
            `
            SELECT
                id,
                vehicle_number AS "vehicleNumber",
                vehicle_type AS "vehicleType",
                max_capacity AS "maxCapacity",
                available_capacity AS "availableCapacity",
                current_location AS "currentLocation",
                destination,
                status
            FROM trucks
            WHERE status IN ('AVAILABLE', 'RETURN_AVAILABLE')
              AND available_capacity >= $1
            ORDER BY created_at DESC
            `,
            [cargo.weight]
        );

        return res.status(200).json({
            cargo: {
                id: cargo.id,
                cargoName: cargo.cargo_name,
                pickupLocation: cargo.pickup_location,
                destination: cargo.destination,
                weight: Number(cargo.weight)
            },
            matchingTrucks: trucksResult.rows
        });

    } catch (error) {
        console.error("Matching API error:", error);
        return res.status(500).json({ error: error.message });
    }
};
