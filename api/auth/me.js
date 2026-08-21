const jwt = require("jsonwebtoken");
const pool = require("../../lib/db");

module.exports = async (req, res) => {
  if (req.method !== "GET") {
    return res.status(405).json({
      error: "Method not allowed"
    });
  }

  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({
        error: "Authentication required"
      });
    }

    const token = authHeader.substring(7);

    const decoded = jwt.verify(
      token,
      process.env.JWT_SECRET
    );

    const result = await pool.query(
      `SELECT id, name, email, phone, company_name,
       role, status, created_at
       FROM users
       WHERE id = $1`,
      [decoded.sub]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        error: "User not found"
      });
    }

    return res.status(200).json(result.rows[0]);

  } catch (error) {
    console.error("Auth error:", error);

    return res.status(401).json({
      error: "Invalid or expired token"
    });
  }
};