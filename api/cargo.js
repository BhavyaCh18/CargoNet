const pool = require("../lib/db");
const jwt = require("jsonwebtoken");

module.exports = async (req, res) => {
    try {
        // Get logged-in user from JWT
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
        // GET MY CARGO
        // =========================
        if (req.method === "GET") {

            const result = await pool.query(
                `
        SELECT
          id,
          cargo_name AS "cargoName",
          pickup_location AS "pickupLocation",
          destination,
          weight,
          description,
          pickup_date AS "pickupDate",
          required_delivery_date AS "requiredDeliveryDate",
          preferred_vehicle_type AS "preferredVehicleType",
          special_handling AS "specialHandling",
          status,
          business_id AS "businessId",
          created_at AS "createdAt"
        FROM cargo
        WHERE business_id = $1
        ORDER BY created_at DESC
        `,
                [userId]
            );

            return res.status(200).json(result.rows);
        }

        // =========================
        // CREATE CARGO
        // =========================
        if (req.method === "POST") {

            const {
                cargoName,
                pickupLocation,
                destination,
                weight,
                description,
                pickupDate,
                requiredDeliveryDate,
                preferredVehicleType,
                specialHandling
            } = req.body;

            const result = await pool.query(
                `
        INSERT INTO cargo (
          cargo_name,
          pickup_location,
          destination,
          weight,
          description,
          pickup_date,
          required_delivery_date,
          preferred_vehicle_type,
          special_handling,
          status,
          business_id,
          created_at
        )
        VALUES (
          $1, $2, $3, $4, $5,
          $6, $7, $8, $9,
          'ACTIVE',
          $10,
          NOW()
        )
        RETURNING
          id,
          cargo_name AS "cargoName",
          pickup_location AS "pickupLocation",
          destination,
          weight,
          status
        `,
                [
                    cargoName,
                    pickupLocation,
                    destination,
                    weight,
                    description,
                    pickupDate,
                    requiredDeliveryDate,
                    preferredVehicleType,
                    specialHandling,
                    userId
                ]
            );

            return res.status(201).json(result.rows[0]);
        }

        return res.status(405).json({
            error: "Method not allowed"
        });

    } catch (error) {
        console.error("Cargo API error:", error);

        return res.status(500).json({
            error: error.message
        });
    }
};