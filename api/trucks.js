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

        const userId = Number(decoded.sub);
        const userRole = (decoded.role || "").toUpperCase();

        const rawUrl = req.url ? req.url.split("?")[0] : "";
        const urlMatches = rawUrl.match(/\/trucks\/(\d+)(\/status)?/);
        const truckIdFromUrl = urlMatches ? Number(urlMatches[1]) : (req.query.id ? Number(req.query.id) : null);
        const isStatusSubpath = rawUrl.includes("/status");

        // =========================
        // 1. PUT /api/trucks/:id/status
        // =========================
        if (req.method === "PUT" || isStatusSubpath) {
            const truckId = truckIdFromUrl;

            if (!truckId || isNaN(truckId)) {
                return res.status(400).json({ error: "Valid truck ID is required" });
            }

            const { status } = req.body || {};

            if (!status) {
                return res.status(400).json({ error: "Status is required" });
            }

            const truckResult = await pool.query("SELECT * FROM trucks WHERE id = $1", [truckId]);

            if (truckResult.rows.length === 0) {
                return res.status(404).json({ error: "Truck not found" });
            }

            const truck = truckResult.rows[0];
            const isOwner = Number(truck.owner_id) === userId;
            const isAdmin = userRole === "ADMIN";

            if (!isOwner && !isAdmin) {
                return res.status(403).json({ error: "You are not authorized to update this truck's status" });
            }

            await pool.query("UPDATE trucks SET status = $1 WHERE id = $2", [status, truckId]);

            return res.status(200).json({
                message: "Truck status updated successfully",
                status: status
            });
        }

        // =========================
        // 2. GET /api/trucks
        // =========================
        if (req.method === "GET") {
            const ownerIdQuery = req.query.ownerId ? Number(req.query.ownerId) : userId;

            const result = await pool.query(
                `
                SELECT
                    id,
                    vehicle_number AS "vehicleNumber",
                    vehicle_type AS "vehicleType",
                    max_capacity AS "maxCapacity",
                    available_capacity AS "availableCapacity",
                    current_location AS "currentLocation",
                    original_pickup_location AS "originalPickupLocation",
                    destination,
                    return_destination AS "returnDestination",
                    status,
                    owner_id AS "ownerId",
                    availability_date AS "availabilityDate",
                    expected_destination_date AS "expectedDestinationDate",
                    created_at AS "createdAt"
                FROM trucks
                WHERE owner_id = $1
                ORDER BY created_at DESC
                `,
                [ownerIdQuery]
            );

            return res.status(200).json(result.rows);
        }

        // =========================
        // 3. POST /api/trucks
        // =========================
        if (req.method === "POST") {
            const {
                vehicleNumber,
                vehicleType,
                maxCapacity,
                currentLocation,
                originalPickupLocation,
                destination,
                availabilityDate,
                expectedDestinationDate
            } = req.body || {};

            const result = await pool.query(
                `
                INSERT INTO trucks (
                    vehicle_number, vehicle_type, max_capacity, available_capacity,
                    current_location, original_pickup_location, destination,
                    status, owner_id, availability_date, expected_destination_date, created_at
                )
                VALUES ($1, $2, $3, $3, $4, $5, $6, 'AVAILABLE', $7, $8, $9, NOW())
                RETURNING
                    id, vehicle_number AS "vehicleNumber", vehicle_type AS "vehicleType",
                    max_capacity AS "maxCapacity", available_capacity AS "availableCapacity",
                    current_location AS "currentLocation", original_pickup_location AS "originalPickupLocation",
                    destination, status, owner_id AS "ownerId", availability_date AS "availabilityDate",
                    expected_destination_date AS "expectedDestinationDate"
                `,
                [
                    vehicleNumber, vehicleType, maxCapacity, currentLocation,
                    originalPickupLocation || currentLocation, destination, userId,
                    availabilityDate, expectedDestinationDate
                ]
            );

            return res.status(201).json(result.rows[0]);
        }

        return res.status(405).json({ error: "Method not allowed" });

    } catch (error) {
        console.error("Trucks API error:", error);
        return res.status(500).json({ error: error.message });
    }
};