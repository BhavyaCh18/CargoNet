const pool = require("../lib/db");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

module.exports = async (req, res) => {
    try {
        const url = req.url ? req.url.split("?")[0] : "";

        // =========================
        // POST /api/auth/register
        // =========================
        if (url.endsWith("/register") || url.includes("/register")) {
            if (req.method !== "POST") {
                return res.status(405).json({ error: "Method not allowed" });
            }

            const { name, email, password, phone, companyName, role } = req.body || {};

            if (!name || !email || !password || !role) {
                return res.status(400).json({
                    error: "Name, email, password, and role are required"
                });
            }

            const existingUser = await pool.query(
                "SELECT * FROM users WHERE email = $1",
                [email]
            );

            if (existingUser.rows.length > 0) {
                return res.status(400).json({
                    error: "User with this email already exists"
                });
            }

            const hashedPassword = await bcrypt.hash(password, 10);

            const result = await pool.query(
                `
                INSERT INTO users (name, email, password_hash, phone, company_name, role, status, created_at)
                VALUES ($1, $2, $3, $4, $5, $6, 'ACTIVE', NOW())
                RETURNING id, name, email, phone, company_name, role, status, created_at
                `,
                [name, email, hashedPassword, phone || null, companyName || null, role]
            );

            const newUser = result.rows[0];

            const token = jwt.sign(
                { email: newUser.email, role: newUser.role, name: newUser.name },
                process.env.JWT_SECRET,
                { subject: String(newUser.id), expiresIn: "7d" }
            );

            return res.status(201).json({
                token,
                user: {
                    id: newUser.id,
                    name: newUser.name,
                    email: newUser.email,
                    phone: newUser.phone,
                    company_name: newUser.company_name,
                    role: newUser.role,
                    status: newUser.status,
                    created_at: newUser.created_at
                }
            });
        }

        // =========================
        // POST /api/auth/login
        // =========================
        if (url.endsWith("/login") || url.includes("/login")) {
            if (req.method !== "POST") {
                return res.status(405).json({ error: "Method not allowed" });
            }

            const { email, password } = req.body || {};

            if (!email || !password) {
                return res.status(400).json({
                    error: "Email and password are required"
                });
            }

            const result = await pool.query(
                "SELECT * FROM users WHERE email = $1",
                [email]
            );

            if (result.rows.length === 0) {
                return res.status(400).json({
                    error: "Invalid email or password"
                });
            }

            const user = result.rows[0];

            if (user.status === "BLOCKED") {
                return res.status(403).json({
                    error: "Account is blocked. Please contact support."
                });
            }

            const isMatch = await bcrypt.compare(password, user.password_hash);

            if (!isMatch) {
                return res.status(400).json({
                    error: "Invalid email or password"
                });
            }

            const token = jwt.sign(
                { email: user.email, role: user.role, name: user.name },
                process.env.JWT_SECRET,
                { subject: String(user.id), expiresIn: "7d" }
            );

            return res.status(200).json({
                token,
                user: {
                    id: user.id,
                    name: user.name,
                    email: user.email,
                    phone: user.phone,
                    company_name: user.company_name,
                    role: user.role,
                    status: user.status
                }
            });
        }

        // =========================
        // GET /api/auth/me
        // =========================
        if (url.endsWith("/me") || url.includes("/me") || req.method === "GET") {
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

            const result = await pool.query(
                "SELECT id, name, email, phone, company_name, role, status FROM users WHERE id = $1",
                [userId]
            );

            if (result.rows.length === 0) {
                return res.status(404).json({ error: "User not found" });
            }

            return res.status(200).json({ user: result.rows[0] });
        }

        return res.status(404).json({ error: "Endpoint not found" });

    } catch (error) {
        console.error("Auth API error:", error);
        return res.status(500).json({ error: error.message });
    }
};
