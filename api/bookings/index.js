const pool = require("../../lib/db");
const jwt = require("jsonwebtoken");

export default async function handler(req, res) {
    try {
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
        // CREATE BOOKING
        // POST /api/bookings
        // =========================
        if (req.method === "POST") {
            const { cargoId, truckId } = req.body;

            if (!cargoId || !truckId) {
                return res.status(400).json({
                    error: "cargoId and truckId are required"
                });
            }

            // Get cargo
            const cargoResult = await pool.query(
                `
        SELECT *
        FROM cargo
        WHERE id = $1
        AND business_id = $2
        `,
                [cargoId, userId]
            );

            if (cargoResult.rows.length === 0) {
                return res.status(404).json({
                    error: "Cargo not found"
                });
            }

            const cargo = cargoResult.rows[0];

            // Get truck
            const truckResult = await pool.query(
                `
        SELECT *
        FROM trucks
        WHERE id = $1
        `,
                [truckId]
            );

            if (truckResult.rows.length === 0) {
                return res.status(404).json({
                    error: "Truck not found"
                });
            }

            const truck = truckResult.rows[0];

            // Check capacity
            if (Number(truck.available_capacity) < Number(cargo.weight)) {
                return res.status(400).json({
                    error: "Truck does not have enough available capacity"
                });
            }

            // Generate booking code
            const bookingCode =
                "BK" +
                Date.now().toString().slice(-8) +
                Math.floor(Math.random() * 1000);

            const transportCost =
                Number(cargo.weight) * 1500;

            // Create booking
            const bookingResult = await pool.query(
                `
        INSERT INTO bookings (
          booking_code,
          cargo_id,
          truck_id,
          business_id,
          transporter_id,
          weight,
          pickup_location,
          destination,
          transport_cost,
          status,
          created_at
        )
        VALUES (
          $1, $2, $3, $4, $5,
          $6, $7, $8, $9,
          'BOOKED',
          NOW()
        )
        RETURNING *
        `,
                [
                    bookingCode,
                    cargoId,
                    truckId,
                    userId,
                    truck.owner_id,
                    cargo.weight,
                    cargo.pickup_location,
                    cargo.destination,
                    transportCost
                ]
            );

            // Reduce available truck capacity
            await pool.query(
                `
        UPDATE trucks
        SET available_capacity =
          available_capacity - $1
        WHERE id = $2
        `,
                [
                    cargo.weight,
                    truckId
                ]
            );

            // Update truck status
            await pool.query(
                `
        UPDATE trucks
        SET status = 'BOOKED'
        WHERE id = $1
        `,
                [truckId]
            );

            const booking = bookingResult.rows[0];

            return res.status(201).json({
                id: booking.id,
                bookingCode: booking.booking_code,
                status: booking.status,
                transportCost: booking.transport_cost
            });
        }

        return res.status(405).json({
            error: "Method not allowed"
        });

    } catch (error) {
        console.error("Booking API error:", error);

        return res.status(500).json({
            error: error.message
        });
    }
}