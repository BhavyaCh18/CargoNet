const pool = require("../../lib/db");
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

        const decoded = jwt.verify(
            token,
            process.env.JWT_SECRET
        );

        const userId = Number(decoded.sub);

        // Get all bookings belonging to the logged-in business user
        const result = await pool.query(
            `
            SELECT
                id,
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
                booking_date,
                status,
                is_return_load
            FROM bookings
            WHERE business_id = $1
            ORDER BY booking_date DESC
            `,
            [userId]
        );

        const bookings = result.rows.map((booking) => ({
            id: booking.id,
            bookingCode: booking.booking_code,
            businessId: booking.business_id,
            truckId: booking.truck_id,
            cargoId: booking.cargo_id,
            pickupLocation: booking.pickup_location,
            destination: booking.destination,
            weight: Number(booking.weight),
            transportCost: Number(booking.transport_cost),
            platformFee: Number(booking.platform_fee),
            totalCost: Number(booking.total_cost),
            bookingDate: booking.booking_date,
            status: booking.status,
            isReturnLoad: booking.is_return_load
        }));

        return res.status(200).json(bookings);

    } catch (error) {
        console.error("Bookings API error:", error);

        return res.status(500).json({
            error: error.message
        });
    }
};