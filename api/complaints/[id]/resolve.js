const pool = require("../../../lib/db");
const jwt = require("jsonwebtoken");

module.exports = async (req, res) => {
    try {
        if (req.method !== "PUT") {
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

        const complaintIdParam = req.query.id || req.query[0];
        const complaintId = Number(complaintIdParam);

        if (!complaintId || isNaN(complaintId)) {
            return res.status(400).json({
                error: "Valid complaint ID is required"
            });
        }

        await pool.query(
            "UPDATE complaints SET status = 'RESOLVED' WHERE id = $1",
            [complaintId]
        );

        return res.status(200).json({
            message: "Complaint resolved successfully",
            status: "RESOLVED"
        });

    } catch (error) {
        console.error("Resolve complaint API error:", error);
        return res.status(500).json({
            error: error.message
        });
    }
};
