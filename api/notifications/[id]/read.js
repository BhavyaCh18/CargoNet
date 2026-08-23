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

        const userId = Number(decoded.sub);

        const idParam = req.query.id || req.query[0];
        const notificationId = Number(idParam);

        if (!notificationId || isNaN(notificationId)) {
            return res.status(400).json({
                error: "Valid notification ID is required"
            });
        }

        await pool.query(
            "UPDATE notifications SET read_status = true WHERE id = $1 AND user_id = $2",
            [notificationId, userId]
        );

        return res.status(200).json({
            message: "Notification marked as read",
            readStatus: true
        });

    } catch (error) {
        console.error("Mark notification read API error:", error);
        return res.status(500).json({
            error: error.message
        });
    }
};
