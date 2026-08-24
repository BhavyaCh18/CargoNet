const pool = require("../lib/db");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const crypto = require("crypto");

module.exports = async (req, res) => {
    try {
        const url = req.url ? req.url.split("?")[0] : "";

        // =========================
        // POST /api/auth/send-otp
        // =========================
        if (url.endsWith("/send-otp") || url.includes("/send-otp")) {
            if (req.method !== "POST") {
                return res.status(405).json({ error: "Method not allowed" });
            }

            const { email, purpose } = req.body || {};

            if (!email || !purpose) {
                return res.status(400).json({ error: "Email and purpose are required" });
            }

            const normalizedPurpose = purpose.toUpperCase();
            if (!["REGISTRATION", "PASSWORD_RESET"].includes(normalizedPurpose)) {
                return res.status(400).json({ error: "Invalid purpose. Must be REGISTRATION or PASSWORD_RESET" });
            }

            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            if (!emailRegex.test(email)) {
                return res.status(400).json({ error: "Invalid email format" });
            }

            // Registration: check if email already exists
            const existingUser = await pool.query("SELECT id FROM users WHERE email = $1", [email]);
            if (normalizedPurpose === "REGISTRATION" && existingUser.rows.length > 0) {
                return res.status(400).json({ error: "User with this email already exists" });
            }

            // Password Reset: check if user exists (don't expose details unnecessarily)
            if (normalizedPurpose === "PASSWORD_RESET" && existingUser.rows.length === 0) {
                // Return success message without creating OTP to prevent email enumeration
                return res.status(200).json({ success: true, message: "Verification code sent" });
            }

            // Check 60-second resend cooldown
            const cooldownCheck = await pool.query(
                "SELECT created_at FROM otp_verifications WHERE email = $1 AND purpose = $2 ORDER BY created_at DESC LIMIT 1",
                [email, normalizedPurpose]
            );

            if (cooldownCheck.rows.length > 0) {
                const lastCreated = new Date(cooldownCheck.rows[0].created_at).getTime();
                const secondsSince = (Date.now() - lastCreated) / 1000;
                if (secondsSince < 60) {
                    const waitSec = Math.ceil(60 - secondsSince);
                    return res.status(429).json({
                        error: `Please wait ${waitSec} seconds before requesting a new verification code`
                    });
                }
            }

            // Generate secure 6-digit OTP (use controlled test code in test mode)
            const isTestMode = process.env.NODE_ENV === "test" || process.env.OTP_TEST_MODE === "true";
            const otp = isTestMode ? "123456" : String(crypto.randomInt(100000, 1000000));
            const otpHash = crypto.createHash("sha256").update(otp).digest("hex");

            // Save OTP hash with 5-minute expiration
            await pool.query(
                `
                INSERT INTO otp_verifications (email, otp_hash, purpose, expires_at)
                VALUES ($1, $2, $3, NOW() + INTERVAL '5 minutes')
                `,
                [email, otpHash, normalizedPurpose]
            );

            // Send via Resend if API key is provided
            if (process.env.RESEND_API_KEY) {
                try {
                    const { Resend } = require("resend");
                    const resend = new Resend(process.env.RESEND_API_KEY);
                    const fromEmail = process.env.RESEND_FROM_EMAIL || "CargoNet <onboarding@resend.dev>";
                    const subject = normalizedPurpose === "REGISTRATION"
                        ? "Verify your CargoNet account"
                        : "Reset your CargoNet password";

                    const htmlContent = `
                        <div style="font-family: 'Inter', Arial, sans-serif; padding: 24px; color: #0B1220; max-width: 500px; margin: 0 auto; border: 1px solid #E2E8F0; border-radius: 8px; background: #FFFFFF;">
                            <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 16px;">
                                <h2 style="color: #0B1220; margin: 0; font-size: 20px; font-weight: 800; border-bottom: 3px solid #F97316; padding-bottom: 8px; width: 100%;">CargoNet</h2>
                            </div>
                            <p style="font-size: 15px; color: #334155; margin-top: 16px;">Your verification code is:</p>
                            <div style="font-size: 32px; font-weight: 800; letter-spacing: 8px; color: #F97316; background: #F8FAFC; padding: 16px; text-align: center; border-radius: 6px; margin: 20px 0; border: 1px dashed #CBD5E1;">
                                ${otp}
                            </div>
                            <p style="font-size: 14px; color: #64748B;">This code expires in 5 minutes.</p>
                            <p style="font-size: 14px; color: #64748B;">Do not share this code with anyone.</p>
                            <p style="font-size: 12px; color: #94A3B8; margin-top: 28px; border-top: 1px solid #E2E8F0; padding-top: 12px;">If you did not request this code, you can safely ignore this email.</p>
                        </div>
                    `;

                    await resend.emails.send({
                        from: fromEmail,
                        to: [email],
                        subject: subject,
                        html: htmlContent
                    });
                } catch (sendErr) {
                    console.error("Resend API delivery error:", sendErr.message);
                }
            }

            return res.status(200).json({
                success: true,
                message: "Verification code sent"
            });
        }

        // =========================
        // POST /api/auth/verify-otp
        // =========================
        if (url.endsWith("/verify-otp") || url.includes("/verify-otp")) {
            if (req.method !== "POST") {
                return res.status(405).json({ error: "Method not allowed" });
            }

            const { email, otp, purpose } = req.body || {};

            if (!email || !otp || !purpose) {
                return res.status(400).json({ error: "Email, OTP, and purpose are required" });
            }

            const normalizedPurpose = purpose.toUpperCase();

            // Find latest unverified OTP for email & purpose
            const otpResult = await pool.query(
                `
                SELECT *, (expires_at < NOW()) AS is_expired FROM otp_verifications
                WHERE email = $1 AND purpose = $2 AND verified_at IS NULL
                ORDER BY created_at DESC LIMIT 1
                `,
                [email, normalizedPurpose]
            );

            if (otpResult.rows.length === 0) {
                return res.status(400).json({ error: "Invalid or expired verification code" });
            }

            const record = otpResult.rows[0];

            if (record.attempts >= 5) {
                return res.status(400).json({ error: "Too many failed attempts. Please request a new verification code." });
            }

            if (record.is_expired) {
                return res.status(400).json({ error: "Verification code has expired. Please request a new code." });
            }

            // Increment attempts
            await pool.query("UPDATE otp_verifications SET attempts = attempts + 1 WHERE id = $1", [record.id]);

            const inputHash = crypto.createHash("sha256").update(String(otp).trim()).digest("hex");

            if (inputHash !== record.otp_hash) {
                return res.status(400).json({ error: "Invalid verification code" });
            }

            // OTP verified! Generate cryptographically secure verification token
            const rawToken = crypto.randomBytes(32).toString("hex");
            const tokenHash = crypto.createHash("sha256").update(rawToken).digest("hex");

            await pool.query(
                `
                UPDATE otp_verifications
                SET verified_at = NOW(),
                    verification_token_hash = $1,
                    token_expires_at = NOW() + INTERVAL '15 minutes'
                WHERE id = $2
                `,
                [tokenHash, record.id]
            );

            return res.status(200).json({
                success: true,
                verificationToken: rawToken
            });
        }

        // =========================
        // POST /api/auth/reset-password
        // =========================
        if (url.endsWith("/reset-password") || url.includes("/reset-password")) {
            if (req.method !== "POST") {
                return res.status(405).json({ error: "Method not allowed" });
            }

            const { email, verificationToken, newPassword } = req.body || {};

            if (!email || !verificationToken || !newPassword) {
                return res.status(400).json({ error: "Email, verification token, and new password are required" });
            }

            if (newPassword.length < 6) {
                return res.status(400).json({ error: "Password must be at least 6 characters long" });
            }

            const tokenHash = crypto.createHash("sha256").update(verificationToken).digest("hex");

            // Validate verification token
            const tokenResult = await pool.query(
                `
                SELECT * FROM otp_verifications
                WHERE verification_token_hash = $1
                  AND email = $2
                  AND purpose = 'PASSWORD_RESET'
                  AND token_expires_at > NOW()
                  AND token_used_at IS NULL
                  AND verified_at IS NOT NULL
                `,
                [tokenHash, email]
            );

            if (tokenResult.rows.length === 0) {
                return res.status(400).json({
                    error: "Invalid, expired, or already used verification token. Please request a new password reset."
                });
            }

            const tokenRecord = tokenResult.rows[0];

            // Verify user exists
            const userCheck = await pool.query("SELECT id FROM users WHERE email = $1", [email]);
            if (userCheck.rows.length === 0) {
                return res.status(400).json({ error: "User not found" });
            }

            const hashedPassword = await bcrypt.hash(newPassword, 10);

            // Update user password
            await pool.query("UPDATE users SET password_hash = $1 WHERE email = $2", [hashedPassword, email]);

            // Mark token as used (SINGLE-USE GUARANTEE)
            await pool.query("UPDATE otp_verifications SET token_used_at = NOW() WHERE id = $1", [tokenRecord.id]);

            return res.status(200).json({
                success: true,
                message: "Password updated successfully"
            });
        }

        // =========================
        // POST /api/auth/register
        // =========================
        if (url.endsWith("/register") || url.includes("/register")) {
            if (req.method !== "POST") {
                return res.status(405).json({ error: "Method not allowed" });
            }

            const { name, email, password, phone, companyName, role, verificationToken } = req.body || {};

            if (!name || !email || !password || !role) {
                return res.status(400).json({
                    error: "Name, email, password, and role are required"
                });
            }

            // Validate single-use verification token
            if (!verificationToken) {
                return res.status(400).json({
                    error: "Email verification is required. Please verify your email with OTP first."
                });
            }

            const tokenHash = crypto.createHash("sha256").update(verificationToken).digest("hex");

            const tokenResult = await pool.query(
                `
                SELECT * FROM otp_verifications
                WHERE verification_token_hash = $1
                  AND email = $2
                  AND purpose = 'REGISTRATION'
                  AND token_expires_at > NOW()
                  AND token_used_at IS NULL
                  AND verified_at IS NOT NULL
                `,
                [tokenHash, email]
            );

            if (tokenResult.rows.length === 0) {
                return res.status(400).json({
                    error: "Invalid, expired, or already used verification token. Please verify your email again."
                });
            }

            const tokenRecord = tokenResult.rows[0];

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

            // Mark verification token as used (SINGLE-USE GUARANTEE)
            await pool.query("UPDATE otp_verifications SET token_used_at = NOW() WHERE id = $1", [tokenRecord.id]);

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
