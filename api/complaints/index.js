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

        let decoded;
        try {
            decoded = jwt.verify(token, process.env.JWT_SECRET);
        } catch (err) {
            return res.status(401).json({
                error: "Invalid or expired token"
            });
        }

        const userId = Number(decoded.sub);
        const userRole = (decoded.role || "").toUpperCase();

        if (req.method === "GET") {
            let query = `
                SELECT
                    c.id,
                    c.user_id AS "userId",
                    c.booking_id AS "bookingId",
                    c.subject,
                    c.description,
                    c.status,
                    c.created_at AS "createdAt",
                    u.name AS "userName"
                FROM complaints c
                LEFT JOIN users u ON c.user_id = u.id
            `;
            let params = [];

            if (userRole !== "ADMIN") {
                query += " WHERE c.user_id = $1";
                params = [userId];
            }

            query += " ORDER BY c.created_at DESC";

            const result = await pool.query(query, params);
            return res.status(200).json(result.rows);
        }

        if (req.method === "POST") {
            const { subject, description, bookingId } = req.body || {};

            if (!subject || !description) {
                return res.status(400).json({
                    error: "Subject and description are required"
                });
            }

            const result = await pool.query(
                `
                INSERT INTO complaints (user_id, booking_id, subject, description, status)
                VALUES ($1, $2, $3, $4, 'PENDING')
                RETURNING id, subject, status
                `,
                [userId, bookingId || null, subject, description]
            );

            return res.status(201).json(result.rows[0]);
        }

        return res.status(405).json({
            error: "Method not allowed"
        });

    } catch (error) {
        console.error("Complaints API error:", error);
        return res.status(500).json({
            error: error.message
        });
    }
};
