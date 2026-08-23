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
        const userRole = (decoded.role || "").toUpperCase();

        const truckIdParam = req.query.id || req.query[0];
        const truckId = Number(truckIdParam);

        if (!truckId || isNaN(truckId)) {
            return res.status(400).json({
                error: "Valid truck ID is required"
            });
        }

        const { status } = req.body || {};

        if (!status) {
            return res.status(400).json({
                error: "Status is required"
            });
        }

        // Get truck and verify ownership
        const truckResult = await pool.query(
            "SELECT * FROM trucks WHERE id = $1",
            [truckId]
        );

        if (truckResult.rows.length === 0) {
            return res.status(404).json({
                error: "Truck not found"
            });
        }

        const truck = truckResult.rows[0];

        const isOwner = Number(truck.owner_id) === userId;
        const isAdmin = userRole === "ADMIN";

        if (!isOwner && !isAdmin) {
            return res.status(403).json({
                error: "You are not authorized to update this truck's status"
            });
        }

        // Update truck status
        await pool.query(
            "UPDATE trucks SET status = $1 WHERE id = $2",
            [status, truckId]
        );

        return res.status(200).json({
            message: "Truck status updated successfully",
            status: status
        });

    } catch (error) {
        console.error("Update truck status API error:", error);
        return res.status(500).json({
            error: error.message
        });
    }
};
