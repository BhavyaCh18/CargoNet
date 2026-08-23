const pool = require("../../lib/db");
const jwt = require("jsonwebtoken");

module.exports = async (req, res) => {
    try {
        if (req.method !== "POST") {
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

        const userId = Number(decoded.sub);

        const { truckId, cargoId } = req.body || {};

        if (!truckId || !cargoId) {
            return res.status(400).json({
                error: "truckId and cargoId are required"
            });
        }

        // Get truck and verify ownership
        const truckResult = await pool.query(
            "SELECT * FROM trucks WHERE id = $1",
            [Number(truckId)]
        );

        if (truckResult.rows.length === 0) {
            return res.status(404).json({
                error: "Truck not found"
            });
        }

        const truck = truckResult.rows[0];

        if (Number(truck.owner_id) !== userId) {
            return res.status(403).json({
                error: "You are not authorized to accept return cargo for this truck"
            });
        }

        // Get cargo
        const cargoResult = await pool.query(
            "SELECT * FROM cargo WHERE id = $1",
            [Number(cargoId)]
        );

        if (cargoResult.rows.length === 0) {
            return res.status(404).json({
                error: "Cargo not found"
            });
        }

        const cargo = cargoResult.rows[0];

        // Generate booking code
        const bookingCode =
            "BK-RET-" +
            Date.now().toString().slice(-6) +
            Math.floor(Math.random() * 100);

        const transportCost = Number(cargo.weight) * 1200;
        const platformFee = transportCost * 0.05;
        const totalCost = transportCost + platformFee;

        // Insert return booking
        const bookingResult = await pool.query(
            `
            INSERT INTO bookings (
                booking_code,
                business_id,
                truck_id,
                cargo_id,
                pickup_location,
                destination,
                weight,
                transport_cost,
                platform_fee,
                total_cost,
                status,
                is_return_load,
                original_business_id
            )
            VALUES (
                $1, $2, $3, $4, $5, $6,
                $7, $8, $9, $10,
                'CONFIRMED',
                true,
                $11
            )
            RETURNING *
            `,
            [
                bookingCode,
                cargo.business_id,
                truck.id,
                cargo.id,
                cargo.pickup_location,
                cargo.destination,
                cargo.weight,
                transportCost,
                platformFee,
                totalCost,
                cargo.business_id
            ]
        );

        // Update cargo status to BOOKED
        await pool.query("UPDATE cargo SET status = 'BOOKED' WHERE id = $1", [cargo.id]);

        // Update truck status to RETURN_BOOKED
        await pool.query("UPDATE trucks SET status = 'RETURN_BOOKED' WHERE id = $1", [truck.id]);

        const booking = bookingResult.rows[0];

        return res.status(201).json({
            id: booking.id,
            bookingCode: booking.booking_code,
            status: booking.status,
            isReturnLoad: true,
            totalCost: Number(booking.total_cost)
        });

    } catch (error) {
        console.error("Return load booking API error:", error);
        return res.status(500).json({
            error: error.message
        });
    }
};
