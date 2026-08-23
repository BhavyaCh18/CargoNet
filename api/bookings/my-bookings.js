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

        const role = (decoded.role || "").toUpperCase();

        let query = `
            SELECT
                b.id,
                b.booking_code,
                b.pickup_location,
                b.destination,
                b.weight,
                b.total_cost,
                b.status,
                b.is_return_load,
                b.booking_date,
                c.cargo_name
            FROM bookings b
            LEFT JOIN cargo c
                ON b.cargo_id = c.id
            WHERE b.business_id = $1
            ORDER BY b.booking_date DESC, b.id DESC
        `;
        let params = [userId];

        if (role === "TRUCK_OWNER" || role === "TRANSPORTER") {
            query = `
                SELECT
                    b.id,
                    b.booking_code,
                    b.pickup_location,
                    b.destination,
                    b.weight,
                    b.total_cost,
                    b.status,
                    b.is_return_load,
                    b.booking_date,
                    c.cargo_name
                FROM bookings b
                JOIN trucks t
                    ON b.truck_id = t.id
                LEFT JOIN cargo c
                    ON b.cargo_id = c.id
                WHERE t.owner_id = $1
                ORDER BY b.booking_date DESC, b.id DESC
            `;
        } else if (role === "ADMIN") {
            query = `
                SELECT
                    b.id,
                    b.booking_code,
                    b.pickup_location,
                    b.destination,
                    b.weight,
                    b.total_cost,
                    b.status,
                    b.is_return_load,
                    b.booking_date,
                    c.cargo_name
                FROM bookings b
                LEFT JOIN cargo c
                    ON b.cargo_id = c.id
                ORDER BY b.booking_date DESC, b.id DESC
            `;
            params = [];
        }

        const result = await pool.query(query, params);

        // =========================
        // FORMAT RESPONSE FOR FRONTEND
        // =========================
        const bookings = result.rows.map((booking) => ({
            id: booking.id,

            bookingCode: booking.booking_code,

            cargoName:
                booking.cargo_name || "Cargo",

            pickupLocation:
                booking.pickup_location,

            destination:
                booking.destination,

            weight:
                Number(booking.weight),

            totalCost:
                Number(booking.total_cost),

            status:
                booking.status,

            isReturnLoad:
                booking.is_return_load
        }));

        return res.status(200).json(bookings);

    } catch (error) {

        console.error(
            "My Bookings API error:",
            error
        );

        return res.status(500).json({
            error: error.message
        });
    }
};