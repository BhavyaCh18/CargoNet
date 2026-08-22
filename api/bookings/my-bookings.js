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

        const decoded = jwt.verify(
            token,
            process.env.JWT_SECRET
        );

        const userId = Number(decoded.sub);

        // Temporary response until we connect
        // this with your actual bookings table structure
        return res.status(200).json([]);

    } catch (error) {
        console.error("Bookings API error:", error);

        return res.status(500).json({
            error: error.message
        });
    }
};