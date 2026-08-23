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

        const bookingIdParam = req.query.id || req.query[0];
        const bookingId = Number(bookingIdParam);

        if (!bookingId || isNaN(bookingId)) {
            return res.status(400).json({
                error: "Valid booking ID is required"
            });
        }

        const { status } = req.body || {};

        if (!status) {
            return res.status(400).json({
                error: "Status is required"
            });
        }

        // Get booking and truck details
        const bookingResult = await pool.query(
            `
            SELECT
                b.id,
                b.booking_code,
                b.business_id,
                b.truck_id,
                b.cargo_id,
                b.pickup_location,
                b.destination,
                b.status,
                t.owner_id AS truck_owner_id,
                t.max_capacity,
                t.original_pickup_location
            FROM bookings b
            LEFT JOIN trucks t ON b.truck_id = t.id
            WHERE b.id = $1
            `,
            [bookingId]
        );

        if (bookingResult.rows.length === 0) {
            return res.status(404).json({
                error: "Booking not found"
            });
        }

        const booking = bookingResult.rows[0];

        // Authorization check: Truck owner or Admin only
        const isTruckOwner = Number(booking.truck_owner_id) === userId;
        const isAdmin = userRole === "ADMIN";

        if (!isTruckOwner && !isAdmin) {
            return res.status(403).json({
                error: "You are not authorized to update this booking's trip status"
            });
        }

        // Update booking status
        await pool.query(
            `
            UPDATE bookings
            SET status = $1
            WHERE id = $2
            `,
            [status, bookingId]
        );

        // Side Effects based on status transition
        if (status === "CARGO_PICKED_UP") {
            if (booking.cargo_id) {
                await pool.query("UPDATE cargo SET status = 'IN_TRANSIT' WHERE id = $1", [booking.cargo_id]);
            }
            if (booking.truck_id) {
                await pool.query("UPDATE trucks SET status = 'IN_TRANSIT' WHERE id = $1", [booking.truck_id]);
            }
            await pool.query(
                `
                INSERT INTO tracking (booking_id, current_location, status, latitude, longitude, notes)
                VALUES ($1, $2, 'CARGO_PICKED_UP', 17.3850, 78.4867, 'Cargo picked up by transporter.')
                `,
                [bookingId, booking.pickup_location]
            );

        } else if (status === "IN_TRANSIT") {
            if (booking.cargo_id) {
                await pool.query("UPDATE cargo SET status = 'IN_TRANSIT' WHERE id = $1", [booking.cargo_id]);
            }
            if (booking.truck_id) {
                await pool.query("UPDATE trucks SET status = 'IN_TRANSIT' WHERE id = $1", [booking.truck_id]);
            }
            await pool.query(
                `
                INSERT INTO tracking (booking_id, current_location, status, latitude, longitude, notes)
                VALUES ($1, $2, 'IN_TRANSIT', 15.0000, 78.0000, 'Shipment in transit.')
                `,
                [bookingId, booking.pickup_location]
            );

        } else if (status === "DELIVERED") {
            // Mark cargo as DELIVERED
            if (booking.cargo_id) {
                await pool.query("UPDATE cargo SET status = 'DELIVERED' WHERE id = $1", [booking.cargo_id]);
            }

            // Update truck: RETURN_AVAILABLE, return_destination, restore capacity
            if (booking.truck_id) {
                const returnDest = booking.original_pickup_location || booking.pickup_location;
                await pool.query(
                    `
                    UPDATE trucks
                    SET status = 'RETURN_AVAILABLE',
                        current_location = $1,
                        return_destination = $2,
                        available_capacity = max_capacity
                    WHERE id = $3
                    `,
                    [booking.destination, returnDest, booking.truck_id]
                );
            }

            // Insert DELIVERED tracking entry
            await pool.query(
                `
                INSERT INTO tracking (booking_id, current_location, status, latitude, longitude, notes)
                VALUES ($1, $2, 'DELIVERED', 12.9716, 77.5946, 'Cargo delivered successfully.')
                `,
                [bookingId, booking.destination]
            );

            // Insert Notification for TRUCK OWNER
            if (booking.truck_owner_id) {
                await pool.query(
                    `
                    INSERT INTO notifications (user_id, title, message, type)
                    VALUES ($1, $2, $3, 'RETURN_LOAD')
                    `,
                    [
                        booking.truck_owner_id,
                        "Truck Available for Return Load!",
                        `Trip ${booking.booking_code} completed. Your truck is now in RETURN_AVAILABLE status from ${booking.destination} to ${booking.original_pickup_location || booking.pickup_location}.`
                    ]
                );
            }
        }

        return res.status(200).json({
            message: "Booking status updated successfully",
            status: status
        });

    } catch (error) {
        console.error("Update booking status API error:", error);
        return res.status(500).json({
            error: error.message
        });
    }
};
