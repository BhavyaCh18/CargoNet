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

        // =========================
        // CHECK JWT
        // =========================
        const authHeader = req.headers.authorization;

        if (!authHeader || !authHeader.startsWith("Bearer ")) {
            return res.status(401).json({
                error: "Unauthorized"
            });
        }

        const token = authHeader.split(" ")[1];

        const decoded = jwt.verify(
            token,
            process.env.JWT_SECRET
        );

        const userId = Number(decoded.sub);

        // =========================
        // GET CARGO ID FROM URL
        // =========================
        const { cargoId } = req.query;

        if (!cargoId) {
            return res.status(400).json({
                error: "Cargo ID is required"
            });
        }

        // =========================
        // GET CARGO
        // =========================
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
        status,
        business_id AS "businessId"
      FROM cargo
      WHERE id = $1
        AND business_id = $2
      `,
            [cargoId, userId]
        );

        if (cargoResult.rows.length === 0) {
            return res.status(404).json({
                error: "Cargo not found or access denied"
            });
        }

        const cargo = cargoResult.rows[0];

        // =========================
        // GET AVAILABLE TRUCKS
        // =========================
        const trucksResult = await pool.query(
            `
      SELECT
        t.id,
        t.vehicle_number AS "vehicleNumber",
        t.vehicle_type AS "vehicleType",
        t.max_capacity AS "maxCapacity",
        t.available_capacity AS "availableCapacity",
        t.current_location AS "currentLocation",
        t.original_pickup_location AS "originalPickupLocation",
        t.destination,
        t.return_destination AS "returnDestination",
        t.status,
        t.owner_id AS "ownerId",
        t.availability_date AS "availabilityDate",
        t.expected_destination_date AS "expectedDestinationDate",
        u.name AS "ownerName"
      FROM trucks t
      LEFT JOIN users u
        ON t.owner_id = u.id
      WHERE UPPER(t.status) IN (
        'AVAILABLE',
        'ACTIVE',
        'RETURN_AVAILABLE'
      )
      AND t.available_capacity >= $1
      ORDER BY t.created_at DESC
      `,
            [cargo.weight]
        );

        // =========================
        // MATCH TRUCKS
        // =========================
        const matches = trucksResult.rows.map((truck) => {

            let routeScore = 0;
            let capacityScore = 0;
            let dateScore = 0;
            let vehicleScore = 0;

            // =========================
            // ROUTE MATCH - 40 POINTS
            // =========================

            const cargoPickup =
                (cargo.pickupLocation || "").toLowerCase().trim();

            const cargoDestination =
                (cargo.destination || "").toLowerCase().trim();

            const truckLocation =
                (truck.currentLocation || "").toLowerCase().trim();

            const truckDestination =
                (truck.destination || "").toLowerCase().trim();

            const truckReturnDestination =
                (truck.returnDestination || "").toLowerCase().trim();

            // Pickup location match
            if (
                truckLocation === cargoPickup ||
                truckLocation.includes(cargoPickup) ||
                cargoPickup.includes(truckLocation)
            ) {
                routeScore += 20;
            }

            // Destination match
            if (
                truckDestination === cargoDestination ||
                truckDestination.includes(cargoDestination) ||
                cargoDestination.includes(truckDestination)
            ) {
                routeScore += 20;
            } else if (
                truckReturnDestination === cargoDestination ||
                truckReturnDestination.includes(cargoDestination) ||
                cargoDestination.includes(truckReturnDestination)
            ) {
                routeScore += 20;
            }

            // =========================
            // CAPACITY MATCH - 30 POINTS
            // =========================

            if (Number(truck.availableCapacity) >= Number(cargo.weight)) {
                capacityScore = 30;
            }

            // =========================
            // DATE MATCH - 20 POINTS
            // =========================

            if (
                cargo.pickupDate &&
                truck.availabilityDate
            ) {
                const cargoDate =
                    new Date(cargo.pickupDate);

                const truckDate =
                    new Date(truck.availabilityDate);

                if (truckDate <= cargoDate) {
                    dateScore = 20;
                }
            } else {
                // If no dates are available, give a neutral score
                dateScore = 10;
            }

            // =========================
            // VEHICLE TYPE MATCH - 10 POINTS
            // =========================

            if (
                !cargo.preferredVehicleType ||
                cargo.preferredVehicleType
                    .toLowerCase()
                    .trim() ===
                truck.vehicleType
                    ?.toLowerCase()
                    .trim()
            ) {
                vehicleScore = 10;
            }

            // =========================
            // TOTAL SCORE
            // =========================

            const matchScore =
                routeScore +
                capacityScore +
                dateScore +
                vehicleScore;

            return {
                truck,
                matchScore,
                routeScore,
                capacityScore,
                dateScore,
                vehicleScore,
                bestMatch: matchScore >= 90
            };
        })

            // Show only reasonable matches
            .filter(match => match.matchScore >= 30)

            // Highest score first
            .sort((a, b) =>
                b.matchScore - a.matchScore
            );

        // =========================
        // RETURN RESULT
        // =========================
        return res.status(200).json({
            cargo,
            matches
        });

    } catch (error) {
        console.error("Matching API error:", error);

        return res.status(500).json({
            error: error.message || "Internal Server Error"
        });
    }
};