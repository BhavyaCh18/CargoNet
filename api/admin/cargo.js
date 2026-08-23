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

        let decoded;
        try {
            decoded = jwt.verify(token, process.env.JWT_SECRET);
        } catch (err) {
            return res.status(401).json({
                error: "Invalid or expired token"
            });
        }

        const userRole = (decoded.role || "").toUpperCase();

        if (userRole !== "ADMIN") {
            return res.status(403).json({
                error: "Admin authorization required"
            });
        }

        const result = await pool.query(
            `
            SELECT
                c.id,
                c.cargo_name AS "cargoName",
                c.pickup_location AS "pickupLocation",
                c.destination,
                c.weight,
                c.status,
                u.name AS "businessName"
            FROM cargo c
            LEFT JOIN users u ON c.business_id = u.id
            ORDER BY c.created_at DESC
            `
        );

        return res.status(200).json(result.rows);

    } catch (error) {
        console.error("Admin cargo API error:", error);
        return res.status(500).json({
            error: error.message
        });
    }
};
