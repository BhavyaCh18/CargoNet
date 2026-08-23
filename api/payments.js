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

        // POST /api/payments
        if (req.method === "POST") {
            const { bookingId, paymentMethod } = req.body || {};

            if (!bookingId || !paymentMethod) {
                return res.status(400).json({ error: "bookingId and paymentMethod are required" });
            }

            const bookingResult = await pool.query(
                "SELECT * FROM bookings WHERE id = $1 AND business_id = $2",
                [Number(bookingId), userId]
            );

            if (bookingResult.rows.length === 0) {
                return res.status(404).json({ error: "Booking not found" });
            }

            const booking = bookingResult.rows[0];

            const existingPayment = await pool.query(
                "SELECT * FROM payments WHERE booking_id = $1",
                [Number(bookingId)]
            );

            if (existingPayment.rows.length > 0) {
                return res.status(400).json({ error: "Payment already completed for this booking" });
            }

            const transactionId = "TXN" + Date.now().toString() + Math.floor(Math.random() * 1000);

            const paymentResult = await pool.query(
                `
                INSERT INTO payments (
                    booking_id, transaction_id, amount, platform_fee,
                    total_amount, payment_method, payment_status, paid_at
                )
                VALUES ($1, $2, $3, $4, $5, $6, 'PAID', CURRENT_TIMESTAMP)
                RETURNING *
                `,
                [
                    Number(bookingId),
                    transactionId,
                    Number(booking.transport_cost),
                    Number(booking.platform_fee),
                    Number(booking.total_cost),
                    paymentMethod
                ]
            );

            await pool.query("UPDATE bookings SET status = 'PAID' WHERE id = $1", [Number(bookingId)]);

            const payment = paymentResult.rows[0];

            return res.status(201).json({
                message: "Payment successful",
                transactionId: payment.transaction_id,
                paymentStatus: payment.payment_status,
                bookingId: payment.booking_id,
                totalAmount: Number(payment.total_amount)
            });
        }

        return res.status(405).json({ error: "Method not allowed" });

    } catch (error) {
        console.error("Payment API error:", error);
        return res.status(500).json({ error: error.message });
    }
};
