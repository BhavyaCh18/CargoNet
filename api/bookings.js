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
        const userRole = (decoded.role || "").toUpperCase();

        const rawUrl = req.url ? req.url.split("?")[0] : "";

        // =========================
        // 1. GET /api/bookings/my-bookings
        // =========================
        if (rawUrl.includes("/my-bookings") || req.query.id === "my-bookings") {
            if (req.method !== "GET") {
                return res.status(405).json({ error: "Method not allowed" });
            }

            let query = `
                SELECT
                    b.id,
                    b.booking_code,
                    b.pickup_location,
                    b.destination,
                    b.weight,
                    b.transport_cost,
                    b.total_cost,
                    b.status,
                    b.is_return_load,
                    b.booking_date,
                    c.cargo_name,
                    t.vehicle_number,
                    u.name AS business_name
                FROM bookings b
                LEFT JOIN cargo c ON b.cargo_id = c.id
                LEFT JOIN trucks t ON b.truck_id = t.id
                LEFT JOIN users u ON b.business_id = u.id
                WHERE b.business_id = $1
                ORDER BY b.booking_date DESC, b.id DESC
            `;
            let params = [userId];

            if (userRole === "TRUCK_OWNER" || userRole === "TRANSPORTER") {
                query = `
                    SELECT
                        b.id,
                        b.booking_code,
                        b.pickup_location,
                        b.destination,
                        b.weight,
                        b.transport_cost,
                        b.total_cost,
                        b.status,
                        b.is_return_load,
                        b.booking_date,
                        c.cargo_name,
                        t.vehicle_number,
                        u.name AS business_name
                    FROM bookings b
                    JOIN trucks t ON b.truck_id = t.id
                    LEFT JOIN cargo c ON b.cargo_id = c.id
                    LEFT JOIN users u ON b.business_id = u.id
                    WHERE t.owner_id = $1
                    ORDER BY b.booking_date DESC, b.id DESC
                `;
            } else if (userRole === "ADMIN") {
                query = `
                    SELECT
                        b.id,
                        b.booking_code,
                        b.pickup_location,
                        b.destination,
                        b.weight,
                        b.transport_cost,
                        b.total_cost,
                        b.status,
                        b.is_return_load,
                        b.booking_date,
                        c.cargo_name,
                        t.vehicle_number,
                        u.name AS business_name
                    FROM bookings b
                    LEFT JOIN cargo c ON b.cargo_id = c.id
                    LEFT JOIN trucks t ON b.truck_id = t.id
                    LEFT JOIN users u ON b.business_id = u.id
                    ORDER BY b.booking_date DESC, b.id DESC
                `;
                params = [];
            }

            const result = await pool.query(query, params);

            const bookings = result.rows.map((booking) => ({
                id: booking.id,
                bookingCode: booking.booking_code,
                cargoName: booking.cargo_name || "Cargo",
                pickupLocation: booking.pickup_location,
                destination: booking.destination,
                weight: Number(booking.weight),
                transportCost: Number(booking.transport_cost || 0),
                totalCost: Number(booking.total_cost || 0),
                status: booking.status,
                isReturnLoad: Boolean(booking.is_return_load),
                vehicleNumber: booking.vehicle_number || "Unassigned",
                businessName: booking.business_name || "Business"
            }));

            return res.status(200).json(bookings);
        }

        // =========================
        // 2. POST /api/bookings/return-load
        // =========================
        if (rawUrl.includes("/return-load")) {
            if (req.method !== "POST") {
                return res.status(405).json({ error: "Method not allowed" });
            }

            const { truckId, cargoId } = req.body || {};

            if (!truckId || !cargoId) {
                return res.status(400).json({ error: "truckId and cargoId are required" });
            }

            const truckResult = await pool.query("SELECT * FROM trucks WHERE id = $1", [Number(truckId)]);

            if (truckResult.rows.length === 0) {
                return res.status(404).json({ error: "Truck not found" });
            }

            const truck = truckResult.rows[0];

            if (Number(truck.owner_id) !== userId && userRole !== "ADMIN") {
                return res.status(403).json({ error: "You are not authorized to accept return cargo for this truck" });
            }

            const cargoResult = await pool.query("SELECT * FROM cargo WHERE id = $1", [Number(cargoId)]);

            if (cargoResult.rows.length === 0) {
                return res.status(404).json({ error: "Cargo not found" });
            }

            const cargo = cargoResult.rows[0];

            const bookingCode = "BK-RET-" + Date.now().toString().slice(-6) + Math.floor(Math.random() * 100);
            const transportCost = Number(cargo.weight) * 1200;
            const platformFee = transportCost * 0.05;
            const totalCost = transportCost + platformFee;

            const bookingResult = await pool.query(
                `
                INSERT INTO bookings (
                    booking_code, business_id, truck_id, cargo_id,
                    pickup_location, destination, weight, transport_cost,
                    platform_fee, total_cost, status, is_return_load, original_business_id
                )
                VALUES (
                    $1, $2, $3, $4, $5, $6, $7, $8, $9, $10,
                    'CONFIRMED', true, $11
                )
                RETURNING *
                `,
                [
                    bookingCode, cargo.business_id, truck.id, cargo.id,
                    cargo.pickup_location, cargo.destination, cargo.weight,
                    transportCost, platformFee, totalCost, cargo.business_id
                ]
            );

            await pool.query("UPDATE cargo SET status = 'BOOKED' WHERE id = $1", [cargo.id]);
            await pool.query("UPDATE trucks SET status = 'RETURN_BOOKED' WHERE id = $1", [truck.id]);

            const booking = bookingResult.rows[0];

            return res.status(201).json({
                id: booking.id,
                bookingCode: booking.booking_code,
                status: booking.status,
                isReturnLoad: true,
                totalCost: Number(booking.total_cost)
            });
        }

        // Extract potential ID parameter from URL or query
        const urlMatches = rawUrl.match(/\/bookings\/(\d+)(\/status)?/);
        const bookingIdFromUrl = urlMatches ? Number(urlMatches[1]) : (req.query.id ? Number(req.query.id) : null);
        const isStatusSubpath = rawUrl.includes("/status");

        // =========================
        // 3. PUT /api/bookings/:id/status
        // =========================
        if (req.method === "PUT" || isStatusSubpath) {
            const bookingId = bookingIdFromUrl;

            if (!bookingId || isNaN(bookingId)) {
                return res.status(400).json({ error: "Valid booking ID is required" });
            }

            const { status } = req.body || {};

            if (!status) {
                return res.status(400).json({ error: "Status is required" });
            }

            const bookingResult = await pool.query(
                `
                SELECT b.*, t.owner_id AS truck_owner_id, t.max_capacity, t.original_pickup_location
                FROM bookings b
                LEFT JOIN trucks t ON b.truck_id = t.id
                WHERE b.id = $1
                `,
                [bookingId]
            );

            if (bookingResult.rows.length === 0) {
                return res.status(404).json({ error: "Booking not found" });
            }

            const booking = bookingResult.rows[0];
            const isTruckOwner = Number(booking.truck_owner_id) === userId;
            const isAdmin = userRole === "ADMIN";

            if (!isTruckOwner && !isAdmin) {
                return res.status(403).json({ error: "You are not authorized to update this booking's trip status" });
            }

            await pool.query("UPDATE bookings SET status = $1 WHERE id = $2", [status, bookingId]);

            if (status === "CARGO_PICKED_UP") {
                if (booking.cargo_id) await pool.query("UPDATE cargo SET status = 'IN_TRANSIT' WHERE id = $1", [booking.cargo_id]);
                if (booking.truck_id) await pool.query("UPDATE trucks SET status = 'IN_TRANSIT' WHERE id = $1", [booking.truck_id]);
                await pool.query(
                    `INSERT INTO tracking (booking_id, current_location, status, latitude, longitude, notes)
                     VALUES ($1, $2, 'CARGO_PICKED_UP', 17.3850, 78.4867, 'Cargo picked up by transporter.')`,
                    [bookingId, booking.pickup_location]
                );

            } else if (status === "IN_TRANSIT") {
                if (booking.cargo_id) await pool.query("UPDATE cargo SET status = 'IN_TRANSIT' WHERE id = $1", [booking.cargo_id]);
                if (booking.truck_id) await pool.query("UPDATE trucks SET status = 'IN_TRANSIT' WHERE id = $1", [booking.truck_id]);
                await pool.query(
                    `INSERT INTO tracking (booking_id, current_location, status, latitude, longitude, notes)
                     VALUES ($1, $2, 'IN_TRANSIT', 15.0000, 78.0000, 'Shipment in transit.')`,
                    [bookingId, booking.pickup_location]
                );

            } else if (status === "DELIVERED") {
                if (booking.cargo_id) await pool.query("UPDATE cargo SET status = 'DELIVERED' WHERE id = $1", [booking.cargo_id]);

                if (booking.truck_id) {
                    const returnDest = booking.original_pickup_location || booking.pickup_location;
                    await pool.query(
                        `UPDATE trucks
                         SET status = 'RETURN_AVAILABLE', current_location = $1, return_destination = $2, available_capacity = max_capacity
                         WHERE id = $3`,
                        [booking.destination, returnDest, booking.truck_id]
                    );
                }

                await pool.query(
                    `INSERT INTO tracking (booking_id, current_location, status, latitude, longitude, notes)
                     VALUES ($1, $2, 'DELIVERED', 12.9716, 77.5946, 'Cargo delivered successfully.')`,
                    [bookingId, booking.destination]
                );

                if (booking.truck_owner_id) {
                    await pool.query(
                        `INSERT INTO notifications (user_id, title, message, type)
                         VALUES ($1, $2, $3, 'RETURN_LOAD')`,
                        [
                            booking.truck_owner_id,
                            "Truck Available for Return Load!",
                            `Trip ${booking.booking_code} completed. Your truck is now in RETURN_AVAILABLE status from ${booking.destination} to ${booking.original_pickup_location || booking.pickup_location}.`
                        ]
                    );
                }
            }

            return res.status(200).json({ message: "Booking status updated successfully", status });
        }

        // =========================
        // 4. GET /api/bookings/:id
        // =========================
        if (req.method === "GET" && bookingIdFromUrl) {
            const bookingResult = await pool.query(
                "SELECT * FROM bookings WHERE id = $1",
                [bookingIdFromUrl]
            );

            if (bookingResult.rows.length === 0) {
                return res.status(404).json({ error: "Booking not found" });
            }

            const booking = bookingResult.rows[0];

            const isOwner = Number(booking.business_id) === userId;
            const isTransporter = Number(booking.truck_id) === userId; // or truck owner check
            const isAdmin = userRole === "ADMIN";

            return res.status(200).json({
                id: booking.id,
                bookingCode: booking.booking_code,
                businessId: booking.business_id,
                truckId: booking.truck_id,
                cargoId: booking.cargo_id,
                pickupLocation: booking.pickup_location,
                destination: booking.destination,
                weight: Number(booking.weight),
                transportCost: Number(booking.transport_cost),
                platformFee: Number(booking.platform_fee),
                totalCost: Number(booking.total_cost),
                status: booking.status
            });
        }

        // =========================
        // 5. POST /api/bookings
        // =========================
        if (req.method === "POST") {
            const { cargoId, truckId } = req.body || {};

            if (!cargoId || !truckId) {
                return res.status(400).json({ error: "cargoId and truckId are required" });
            }

            const cargoResult = await pool.query("SELECT * FROM cargo WHERE id = $1 AND business_id = $2", [cargoId, userId]);

            if (cargoResult.rows.length === 0) {
                return res.status(404).json({ error: "Cargo not found" });
            }

            const cargo = cargoResult.rows[0];

            const truckResult = await pool.query("SELECT * FROM trucks WHERE id = $1", [truckId]);

            if (truckResult.rows.length === 0) {
                return res.status(404).json({ error: "Truck not found" });
            }

            const truck = truckResult.rows[0];

            if (Number(truck.available_capacity) < Number(cargo.weight)) {
                return res.status(400).json({ error: "Truck does not have enough available capacity" });
            }

            const bookingCode = "BK" + Date.now().toString().slice(-8) + Math.floor(Math.random() * 1000);
            const transportCost = Number(cargo.weight) * 1500;
            const platformFee = transportCost * 0.05;
            const totalCost = transportCost + platformFee;

            const bookingResult = await pool.query(
                `
                INSERT INTO bookings (
                    booking_code, business_id, truck_id, cargo_id,
                    pickup_location, destination, weight, transport_cost,
                    platform_fee, total_cost, status, is_return_load
                )
                VALUES (
                    $1, $2, $3, $4, $5, $6, $7, $8, $9, $10,
                    'CONFIRMED', false
                )
                RETURNING *
                `,
                [
                    bookingCode, userId, truckId, cargoId,
                    cargo.pickup_location, cargo.destination, cargo.weight,
                    transportCost, platformFee, totalCost
                ]
            );

            await pool.query("UPDATE trucks SET available_capacity = available_capacity - $1 WHERE id = $2", [cargo.weight, truckId]);
            await pool.query("UPDATE trucks SET status = 'BOOKED' WHERE id = $1", [truckId]);
            await pool.query("UPDATE cargo SET status = 'BOOKED' WHERE id = $1", [cargoId]);

            const booking = bookingResult.rows[0];

            return res.status(201).json({
                id: booking.id,
                bookingCode: booking.booking_code,
                status: booking.status,
                transportCost: booking.transport_cost,
                platformFee: booking.platform_fee,
                totalCost: booking.total_cost
            });
        }

        return res.status(405).json({ error: "Method not allowed" });

    } catch (error) {
        console.error("Bookings API error:", error);
        return res.status(500).json({ error: error.message });
    }
};
