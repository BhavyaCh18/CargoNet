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
        const rawUrl = req.url ? req.url.split("?")[0] : "";

        // =========================
        // 1. PUT /api/notifications/:id/read
        // =========================
        if (rawUrl.includes("/read") || req.method === "PUT") {
            const matches = rawUrl.match(/\/notifications\/(\d+)\/read/);
            const idParam = matches ? matches[1] : (req.query.id || req.query[0]);
            const notificationId = Number(idParam);

            if (!notificationId || isNaN(notificationId)) {
                return res.status(400).json({ error: "Valid notification ID is required" });
            }

            await pool.query(
                "UPDATE notifications SET read_status = true WHERE id = $1 AND user_id = $2",
                [notificationId, userId]
            );

            return res.status(200).json({
                message: "Notification marked as read",
                readStatus: true
            });
        }

        // =========================
        // 2. GET /api/notifications
        // =========================
        if (req.method === "GET") {
            const result = await pool.query(
                `SELECT id, user_id AS "userId", title, message, type, read_status AS "readStatus", created_at AS "createdAt"
                 FROM notifications
                 WHERE user_id = $1
                 ORDER BY created_at DESC`,
                [userId]
            );

            return res.status(200).json(result.rows);
        }

        return res.status(405).json({ error: "Method not allowed" });

    } catch (error) {
        console.error("Notifications API error:", error);
        return res.status(500).json({ error: error.message });
    }
};
