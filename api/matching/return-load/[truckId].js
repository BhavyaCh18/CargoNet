const pool = require("../../../lib/db");
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

        try {
            jwt.verify(token, process.env.JWT_SECRET);
        } catch (err) {
            return res.status(401).json({
                error: "Invalid or expired token"
            });
        }

        const truckIdParam = req.query.truckId || req.query.id || req.query[0];
        const truckId = Number(truckIdParam);

        if (!truckId || isNaN(truckId)) {
            return res.status(400).json({
                error: "Valid truck ID is required"
            });
        }

        // Get truck details
        const truckResult = await pool.query(
            "SELECT * FROM trucks WHERE id = $1",
            [truckId]
        );

        if (truckResult.rows.length === 0) {
            return res.status(404).json({
                error: "Truck not found"
            });
        }

        const truck = truckResult.rows[0];

        const pickupLocation = truck.current_location || truck.destination;
        const returnDestination = truck.return_destination || truck.original_pickup_location;

        // Query cargo matching return leg
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

    } catch (error) {
        console.error("Return load matching API error:", error);
        return res.status(500).json({
            error: error.message
        });
    }
};
