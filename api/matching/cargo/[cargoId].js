const pool = require("../../../lib/db");
const jwt = require("jsonwebtoken");

module.exports = async (req, res) => {
    try {
        // Only allow GET
        if (req.method !== "GET") {
            return res.status(405).json({
                error: "Method not allowed"
            });
        }

        // Check JWT
        const authHeader = req.headers.authorization;

        if (!authHeader || !authHeader.startsWith("Bearer ")) {
            return res.status(401).json({
                error: "Unauthorized"
            });
        }

        const token = authHeader.split(" ")[1];

        jwt.verify(
            token,
            process.env.JWT_SECRET
        );

        // Get cargo ID from Vercel dynamic route
        const { cargoId } = req.query;

        if (!cargoId) {
            return res.status(400).json({
                error: "Cargo ID is required"
            });
        }

        // Get cargo
        const cargoResult = await pool.query(
            `
            SELECT
                id,
                cargo_name AS "cargoName",
                pickup_location AS "pickupLocation",
                destination,
                weight,
                pickup_date AS "pickupDate",
                required_delivery_date AS "requiredDeliveryDate",
                preferred_vehicle_type AS "preferredVehicleType",
                special_handling AS "specialHandling",
                status,
                business_id AS "businessId"
            FROM cargo
            WHERE id = $1
            `,
            [cargoId]
        );

        if (cargoResult.rows.length === 0) {
            return res.status(404).json({
                error: "Cargo not found"
            });
        }

        const cargo = cargoResult.rows[0];

        // Get available trucks
        const truckResult = await pool.query(
            `
            SELECT
                t.id,
                t.vehicle_number AS "vehicleNumber",
                t.vehicle_type AS "vehicleType",
                t.max_capacity AS "maxCapacity",
                t.available_capacity AS "availableCapacity",
                t.current_location AS "currentLocation",
                t.destination,
                t.original_pickup_location AS "originalPickupLocation",
                t.return_destination AS "returnDestination",
                t.status,
                t.owner_id AS "ownerId",
                u.name AS "ownerName"
            FROM trucks t
            LEFT JOIN users u
                ON t.owner_id = u.id
            WHERE t.status = 'AVAILABLE'
              AND t.available_capacity >= $1
            ORDER BY t.id DESC
            `,
            [cargo.weight]
        );

        // Calculate matching scores
        const matches = truckResult.rows.map((truck) => {
            let routeScore = 0;
            let capacityScore = 0;
            let dateScore = 20;

            // Route matching
            if (
                truck.currentLocation &&
                cargo.pickupLocation &&
                truck.currentLocation
                    .toLowerCase()
                    .trim() ===
                cargo.pickupLocation
                    .toLowerCase()
                    .trim()
            ) {
                routeScore = 40;
            } else {
                routeScore = 20;
            }

            // Capacity matching
            if (
                Number(truck.availableCapacity) >=
                Number(cargo.weight)
            ) {
                capacityScore = 30;
            }

            const matchScore =
                routeScore +
                capacityScore +
                dateScore;

            return {
                truck,
                routeScore,
                capacityScore,
                dateScore,
                matchScore,
                bestMatch: matchScore >= 90
            };
        });

        // Highest score first
        matches.sort(
            (a, b) =>
                b.matchScore - a.matchScore
        );

        return res.status(200).json({
            cargo,
            matches
        });

    } catch (error) {
        console.error(
            "Matching API error:",
            error
        );

        return res.status(500).json({
            error: error.message
        });
    }
};