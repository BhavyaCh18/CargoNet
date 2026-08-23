const pool = require("../../lib/db");
const jwt = require("jsonwebtoken");

module.exports = async (req, res) => {
    try {
        if (req.method !== "GET") {
            return res.status(405).json({
                error: "Method not allowed"
            });
        }

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
        // GET ALL BOOKINGS
        // FOR THE LOGGED-IN BUSINESS
        // =========================
        const result = await pool.query(
            `
            SELECT
                b.id,
                b.booking_code,
                b.business_id,
                b.truck_id,
                b.cargo_id,
                b.pickup_location,
                b.destination,
                b.weight,
                b.transport_cost,
                b.platform_fee,
                b.total_cost,
                b.booking_date,
                b.status,
                b.is_return_load
            FROM bookings b
            WHERE b.business_id = $1
            ORDER BY b.booking_date DESC, b.id DESC
            `,
            [userId]
        );

        // =========================
        // FORMAT RESPONSE
        // =========================
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

        console.error(
            "My bookings API error:",
            error
        );

        return res.status(500).json({
            error: error.message
        });
    }
};