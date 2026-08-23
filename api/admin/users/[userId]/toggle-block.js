const pool = require("../../../../lib/db");
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

        const userIdParam = req.query.userId || req.query.id || req.query[0];
        const targetUserId = Number(userIdParam);

        if (!targetUserId || isNaN(targetUserId)) {
            return res.status(400).json({
                error: "Valid user ID is required"
            });
        }

        // Get target user
        const userResult = await pool.query(
            "SELECT id, status FROM users WHERE id = $1",
            [targetUserId]
        );

        if (userResult.rows.length === 0) {
            return res.status(404).json({
                error: "User not found"
            });
        }

        const currentStatus = userResult.rows[0].status || "ACTIVE";
        const newStatus = currentStatus === "BLOCKED" ? "ACTIVE" : "BLOCKED";

        await pool.query(
            "UPDATE users SET status = $1 WHERE id = $2",
            [newStatus, targetUserId]
        );

        return res.status(200).json({
            message: `User status toggled to ${newStatus}`,
            status: newStatus
        });

    } catch (error) {
        console.error("Admin toggle block API error:", error);
        return res.status(500).json({
            error: error.message
        });
    }
};
