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
                b.transport_cost,
                b.total_cost,
                b.status,
                b.is_return_load,
                b.booking_date,
                c.cargo_name,
                t.vehicle_number,
                u.name AS business_name
            FROM bookings b
            LEFT JOIN cargo c ON b.cargo_id = c.id
            LEFT JOIN trucks t ON b.truck_id = t.id
            LEFT JOIN users u ON b.business_id = u.id
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
                    b.transport_cost,
                    b.total_cost,
                    b.status,
                    b.is_return_load,
                    b.booking_date,
                    c.cargo_name,
                    t.vehicle_number,
                    u.name AS business_name
                FROM bookings b
                JOIN trucks t ON b.truck_id = t.id
                LEFT JOIN cargo c ON b.cargo_id = c.id
                LEFT JOIN users u ON b.business_id = u.id
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
                    b.transport_cost,
                    b.total_cost,
                    b.status,
                    b.is_return_load,
                    b.booking_date,
                    c.cargo_name,
                    t.vehicle_number,
                    u.name AS business_name
                FROM bookings b
                LEFT JOIN cargo c ON b.cargo_id = c.id
                LEFT JOIN trucks t ON b.truck_id = t.id
                LEFT JOIN users u ON b.business_id = u.id
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
            cargoName: booking.cargo_name || "Cargo",
            pickupLocation: booking.pickup_location,
            destination: booking.destination,
            weight: Number(booking.weight),
            transportCost: Number(booking.transport_cost || 0),
            totalCost: Number(booking.total_cost || 0),
            status: booking.status,
            isReturnLoad: Boolean(booking.is_return_load),
            vehicleNumber: booking.vehicle_number || "Unassigned",
            businessName: booking.business_name || "Business"
        }));

        return res.status(200).json(bookings);

    } catch (error) {
        console.error("My Bookings API error:", error);
        return res.status(500).json({
            error: error.message
        });
    }
};