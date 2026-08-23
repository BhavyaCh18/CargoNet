const pool = require("../../lib/db");
const jwt = require("jsonwebtoken");

module.exports = async (req, res) => {
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

        const { id } = req.query;
        const bookingId = Number(id);

        if (!bookingId) {
            return res.status(400).json({
                error: "Valid booking ID is required"
            });
        }

        // GET /api/bookings/:id
        if (req.method === "GET") {

            const result = await pool.query(
                `
                SELECT *
                FROM bookings
                WHERE id = $1
                AND business_id = $2
                `,
                [bookingId, userId]
            );

            if (result.rows.length === 0) {
                return res.status(404).json({
                    error: "Booking not found"
                });
            }

            const booking = result.rows[0];

            return res.status(200).json({
                id: booking.id,
                bookingCode: booking.booking_code,
                businessId: booking.business_id,
                truckId: booking.truck_id,
                cargoId: booking.cargo_id,
                pickupLocation: booking.pickup_location,
                destination: booking.destination,
                weight: booking.weight,
                transportCost: Number(booking.transport_cost),
                platformFee: Number(booking.platform_fee),
                totalCost: Number(booking.total_cost),
                status: booking.status
            });
        }

        return res.status(405).json({
            error: "Method not allowed"
        });

    } catch (error) {

        console.error(
            "Booking details API error:",
            error
        );

        return res.status(500).json({
            error: error.message
        });
    }
};