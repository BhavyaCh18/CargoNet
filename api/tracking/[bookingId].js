const pool = require("../../lib/db");
const jwt = require("jsonwebtoken");

module.exports = async (req, res) => {
  try {
    // Only allow GET method
    if (req.method !== "GET") {
      return res.status(405).json({
        error: "Method not allowed"
      });
    }

    // Check authorization header
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

    // Extract booking ID
    const { bookingId } = req.query;
    const id = Number(bookingId);

    if (!id || isNaN(id)) {
      return res.status(400).json({
        error: "Valid booking ID is required"
      });
    }

    // Query booking details from DB
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
        b.weight,
        b.status,
        b.is_return_load,
        c.cargo_name,
        t.current_location AS truck_location,
        t.owner_id AS truck_owner_id
      FROM bookings b
      LEFT JOIN cargo c ON b.cargo_id = c.id
      LEFT JOIN trucks t ON b.truck_id = t.id
      WHERE b.id = $1
      `,
      [id]
    );

    if (bookingResult.rows.length === 0) {
      return res.status(404).json({
        error: "Booking not found"
      });
    }

    const booking = bookingResult.rows[0];

    // Authorization checks
    let isAuthorized = false;

    if (userRole === "ADMIN") {
      isAuthorized = true;
    } else if (userRole === "BUSINESS" || userRole === "SHIPPER") {
      isAuthorized = Number(booking.business_id) === userId;
    } else if (userRole === "TRUCK_OWNER" || userRole === "TRANSPORTER") {
      isAuthorized = Number(booking.truck_owner_id) === userId;
    }

    if (!isAuthorized) {
      return res.status(403).json({
        error: "You are not authorized to access this tracking information"
      });
    }

    // Query latest tracking record from tracking table
    const trackingResult = await pool.query(
      `
      SELECT current_location, latitude, longitude, updated_at
      FROM tracking
      WHERE booking_id = $1
      ORDER BY updated_at DESC, id DESC
      LIMIT 1
      `,
      [id]
    );

    let currentLocation = booking.truck_location || booking.pickup_location || "In Transit";
    let latitude = null;
    let longitude = null;

    if (trackingResult.rows.length > 0) {
      const trackRow = trackingResult.rows[0];
      if (trackRow.current_location) {
        currentLocation = trackRow.current_location;
      }
      if (trackRow.latitude !== null && trackRow.latitude !== undefined) {
        latitude = Number(trackRow.latitude);
      }
      if (trackRow.longitude !== null && trackRow.longitude !== undefined) {
        longitude = Number(trackRow.longitude);
      }
    }

    return res.status(200).json({
      booking: {
        id: booking.id,
        bookingCode: booking.booking_code,
        cargoName: booking.cargo_name || "Cargo",
        pickupLocation: booking.pickup_location,
        destination: booking.destination,
        weight: Number(booking.weight),
        status: booking.status,
        isReturnLoad: Boolean(booking.is_return_load)
      },
      tracking: {
        currentLocation,
        latitude,
        longitude
      }
    });

  } catch (error) {
    console.error("Tracking API error:", error);
    return res.status(500).json({
      error: error.message
    });
  }
};
