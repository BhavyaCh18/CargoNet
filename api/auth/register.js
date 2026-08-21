const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const pool = require("../../lib/db");

module.exports = async (req, res) => {
  if (req.method !== "POST") {
    return res.status(405).json({
      error: "Method not allowed"
    });
  }

  try {
    const {
      name,
      email,
      password,
      phone,
      companyName,
      role
    } = req.body || {};

    if (!email || !email.trim() || !password) {
      return res.status(400).json({
        error: "Email and password are required."
      });
    }

    // Check whether email already exists
    const existingUser = await pool.query(
      "SELECT id FROM users WHERE LOWER(email) = LOWER($1)",
      [email.trim()]
    );

    if (existingUser.rows.length > 0) {
      return res.status(400).json({
        error: "An account with this email already exists."
      });
    }

    // Same role mapping as Java backend
    let normalizedRole = role
      ? role.toUpperCase()
      : "BUSINESS";

    if (normalizedRole === "SHIPPER") {
      normalizedRole = "BUSINESS";
    }

    if (normalizedRole === "TRANSPORTER") {
      normalizedRole = "TRUCK_OWNER";
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Save user
    const result = await pool.query(
      `INSERT INTO users
      (name, email, password_hash, phone, company_name, role, status)
      VALUES ($1, $2, $3, $4, $5, $6, 'ACTIVE')
      RETURNING *`,
      [
        name || email.split("@")[0],
        email.toLowerCase().trim(),
        hashedPassword,
        phone || null,
        companyName || null,
        normalizedRole
      ]
    );

    const user = result.rows[0];

    // Create JWT
    const token = jwt.sign(
      {
        email: user.email,
        role: user.role,
        name: user.name
      },
      process.env.JWT_SECRET,
      {
        subject: String(user.id),
        expiresIn: "7d"
      }
    );

    // Never send password hash
    delete user.password_hash;

    return res.status(201).json({
      token,
      user
    });

  } catch (error) {
    console.error("Registration error:", error);

    return res.status(500).json({
      error: "Internal Server Error"
    });
  }
};