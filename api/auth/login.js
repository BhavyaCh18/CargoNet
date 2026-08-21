const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const pool = require("../../lib/db");

module.exports = async (req, res) => {
  // Only allow POST
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const { email, password } = req.body || {};

    if (!email || !password) {
      return res.status(400).json({
        error: "Email and password are required."
      });
    }

    // Same logic as UserRepository.findByEmail()
    const result = await pool.query(
      "SELECT * FROM users WHERE LOWER(email) = LOWER($1)",
      [email.trim()]
    );

    if (result.rows.length === 0) {
      return res.status(400).json({
        error: "Invalid email or password."
      });
    }

    const user = result.rows[0];

    if (user.status?.toUpperCase() === "BLOCKED") {
      return res.status(400).json({
        error: "Your account has been blocked by administrator."
      });
    }

    // Verify the existing Java BCrypt password hash
    const passwordMatch = await bcrypt.compare(
      password,
      user.password_hash
    );

    if (!passwordMatch) {
      return res.status(400).json({
        error: "Invalid email or password."
      });
    }

    // Same JWT information as JwtProvider.java
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

    // Don't send password_hash to frontend
    delete user.password_hash;

    return res.status(200).json({
      token,
      user
    });

  } catch (error) {
    console.error("Login error:", error);

    return res.status(500).json({
      error: "Internal Server Error"
    });
  }
};