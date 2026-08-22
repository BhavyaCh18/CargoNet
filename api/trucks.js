const pool = require("../lib/db");
const jwt = require("jsonwebtoken");

module.exports = async (req, res) => {
    try {
        // =========================
        // CHECK AUTHORIZATION
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
        // GET MY TRUCKS
        // =========================

        if (req.method === "GET") {

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
                [userId]
            );

            return res.status(200).json(result.rows);
        }

        // =========================
        // REGISTER TRUCK
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
            } = req.body;

            const result = await pool.query(
                `
        INSERT INTO trucks (
          vehicle_number,
          vehicle_type,
          max_capacity,
          available_capacity,
          current_location,
          original_pickup_location,
          destination,
          status,
          owner_id,
          availability_date,
          expected_destination_date,
          created_at
        )
        VALUES (
          $1,
          $2,
          $3,
          $3,
          $4,
          $5,
          $6,
          'AVAILABLE',
          $7,
          $8,
          $9,
          NOW()
        )
        RETURNING
          id,
          vehicle_number AS "vehicleNumber",
          vehicle_type AS "vehicleType",
          max_capacity AS "maxCapacity",
          available_capacity AS "availableCapacity",
          current_location AS "currentLocation",
          original_pickup_location AS "originalPickupLocation",
          destination,
          status,
          owner_id AS "ownerId",
          availability_date AS "availabilityDate",
          expected_destination_date AS "expectedDestinationDate"
        `,
                [
                    vehicleNumber,
                    vehicleType,
                    maxCapacity,
                    currentLocation,
                    originalPickupLocation,
                    destination,
                    userId,
                    availabilityDate,
                    expectedDestinationDate
                ]
            );

            return res.status(201).json(result.rows[0]);
        }

        return res.status(405).json({
            error: "Method not allowed"
        });

    } catch (error) {

        console.error("Trucks API error:", error);

        return res.status(500).json({
            error: error.message
        });

    }
};