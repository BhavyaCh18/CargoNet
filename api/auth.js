const pool = require("../lib/db");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const crypto = require("crypto");
const https = require("https");

// ========================================
// HELPER: NORMALIZE EMAIL
// ========================================
function normalizeEmail(email) {
    return String(email || "").trim().toLowerCase();
}

// ========================================
// GOOGLE TOKEN VERIFICATION
// ========================================
async function verifyGoogleToken(idToken) {
    if (
        (process.env.NODE_ENV === "test" ||
            process.env.OTP_TEST_MODE === "true") &&
        idToken &&
        idToken.startsWith("test_google_")
    ) {
        const email = idToken.replace("test_google_", "");

        return {
            email,
            name: "Google Test User",
            sub: "google_test_sub_123"
        };
    }

    return new Promise((resolve, reject) => {
        const url = `https://oauth2.googleapis.com/tokeninfo?id_token=${encodeURIComponent(
            idToken
        )}`;

        https
            .get(url, (res) => {
                let data = "";

                res.on("data", (chunk) => {
                    data += chunk;
                });

                res.on("end", () => {
                    try {
                        const parsed = JSON.parse(data);

                        if (parsed.error_description || parsed.error) {
                            return reject(
                                new Error(
                                    parsed.error_description ||
                                    "Invalid Google token"
                                )
                            );
                        }

                        if (
                            !parsed.email ||
                            parsed.email_verified === false ||
                            parsed.email_verified === "false"
                        ) {
                            return reject(
                                new Error(
                                    "Google account email is not verified"
                                )
                            );
                        }

                        if (
                            process.env.GOOGLE_CLIENT_ID &&
                            parsed.aud !== process.env.GOOGLE_CLIENT_ID
                        ) {
                            return reject(
                                new Error("Google Client ID mismatch")
                            );
                        }

                        resolve({
                            email: normalizeEmail(parsed.email),
                            name:
                                parsed.name ||
                                parsed.email.split("@")[0],
                            sub: parsed.sub
                        });
                    } catch (error) {
                        reject(
                            new Error(
                                "Failed to parse Google verification response"
                            )
                        );
                    }
                });
            })
            .on("error", (err) => reject(err));
    });
}

// ========================================
// SEND OTP EMAIL THROUGH BREVO
// ========================================
async function sendBrevoOTPEmail(email, otp, purpose) {
    const apiKey = process.env.BREVO_API_KEY;
    const fromEmail = process.env.BREVO_FROM_EMAIL;
    const fromName =
        process.env.BREVO_FROM_NAME || "CargoNet";

    if (!apiKey || !fromEmail) {
        throw new Error(
            "Brevo email configuration missing (BREVO_API_KEY or BREVO_FROM_EMAIL)"
        );
    }

    const recipientEmail = normalizeEmail(email);

    console.log("========================================");
    console.log("BREVO OTP EMAIL");
    console.log("Recipient:", recipientEmail);
    console.log("Purpose:", purpose);
    console.log("========================================");

    const isRegistration = purpose === "REGISTRATION";

    const subject = isRegistration
        ? "CargoNet Email Verification"
        : "CargoNet Password Reset";

    const codeLabel = isRegistration
        ? "verification"
        : "password reset";

    const textContent =
        `Your CargoNet ${codeLabel} code is: ${otp}\n\n` +
        `This code expires in 5 minutes.\n\n` +
        `Do not share this code with anyone.`;

    const htmlContent = `
        <div style="font-family: Arial, sans-serif; padding: 24px; color: #0B1220; max-width: 500px; margin: 0 auto; border: 1px solid #E2E8F0; border-radius: 8px; background: #FFFFFF;">

            <h2 style="color: #0B1220; margin: 0 0 20px 0; font-size: 24px; border-bottom: 3px solid #F97316; padding-bottom: 10px;">
                CargoNet
            </h2>

            <p style="font-size: 16px; color: #334155;">
                Your CargoNet ${codeLabel} code is:
            </p>

            <div style="
                font-size: 32px;
                font-weight: bold;
                letter-spacing: 8px;
                color: #F97316;
                background: #F8FAFC;
                padding: 18px;
                text-align: center;
                border-radius: 6px;
                margin: 20px 0;
                border: 1px dashed #CBD5E1;
            ">
                ${otp}
            </div>

            <p style="font-size: 14px; color: #64748B;">
                This code expires in 5 minutes.
            </p>

            <p style="font-size: 14px; color: #64748B;">
                Do not share this code with anyone.
            </p>

            <p style="
                font-size: 12px;
                color: #94A3B8;
                margin-top: 28px;
                border-top: 1px solid #E2E8F0;
                padding-top: 12px;
            ">
                If you did not request this code, you can safely ignore this email.
            </p>

        </div>
    `;

    const postData = JSON.stringify({
        sender: {
            name: fromName,
            email: fromEmail
        },

        to: [
            {
                email: recipientEmail
            }
        ],

        subject: subject,
        textContent: textContent,
        htmlContent: htmlContent
    });

    return new Promise((resolve, reject) => {
        const options = {
            hostname: "api.brevo.com",
            port: 443,
            path: "/v3/smtp/email",
            method: "POST",

            headers: {
                accept: "application/json",
                "api-key": apiKey,
                "content-type": "application/json",
                "content-length": Buffer.byteLength(postData)
            }
        };

        const brevoRequest = https.request(
            options,
            (brevoResponse) => {
                let data = "";

                brevoResponse.on("data", (chunk) => {
                    data += chunk;
                });

                brevoResponse.on("end", () => {
                    console.log(
                        "Brevo response status:",
                        brevoResponse.statusCode
                    );

                    console.log(
                        "Brevo response:",
                        data
                    );

                    if (
                        brevoResponse.statusCode >= 200 &&
                        brevoResponse.statusCode < 300
                    ) {
                        resolve({
                            success: true,
                            statusCode: brevoResponse.statusCode,
                            response: data
                        });
                    } else {
                        reject(
                            new Error(
                                `Brevo API returned status ${brevoResponse.statusCode}: ${data}`
                            )
                        );
                    }
                });
            }
        );

        brevoRequest.on("error", (err) => {
            reject(err);
        });

        brevoRequest.write(postData);
        brevoRequest.end();
    });
}

// ========================================
// MAIN AUTH API
// ========================================
module.exports = async (req, res) => {
    try {
        const url = req.url
            ? req.url.split("?")[0]
            : "";

        // ========================================
        // POST /api/auth/send-otp
        // ========================================
        if (
            url.endsWith("/send-otp") ||
            url.includes("/send-otp")
        ) {
            if (req.method !== "POST") {
                return res
                    .status(405)
                    .json({
                        error: "Method not allowed"
                    });
            }

            const body = req.body || {};

            const email = normalizeEmail(body.email);
            const purpose = body.purpose;

            console.log("========================================");
            console.log("OTP REQUEST RECEIVED");
            console.log("Raw body:", req.body);
            console.log("EMAIL FROM FRONTEND:", email);
            console.log("PURPOSE:", purpose);
            console.log("========================================");

            if (!email || !purpose) {
                return res.status(400).json({
                    error:
                        "Email and purpose are required"
                });
            }

            const normalizedPurpose =
                String(purpose).toUpperCase();

            if (
                ![
                    "REGISTRATION",
                    "PASSWORD_RESET"
                ].includes(normalizedPurpose)
            ) {
                return res.status(400).json({
                    error:
                        "Invalid purpose. Must be REGISTRATION or PASSWORD_RESET"
                });
            }

            const emailRegex =
                /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

            if (!emailRegex.test(email)) {
                return res.status(400).json({
                    error:
                        "Invalid email format"
                });
            }

            // Check existing user
            const existingUser = await pool.query(
                "SELECT id FROM users WHERE LOWER(email) = $1",
                [email]
            );

            // Registration: email should not already exist
            if (
                normalizedPurpose === "REGISTRATION" &&
                existingUser.rows.length > 0
            ) {
                return res.status(400).json({
                    error:
                        "User with this email already exists"
                });
            }

            // Password reset
            if (
                normalizedPurpose === "PASSWORD_RESET" &&
                existingUser.rows.length === 0
            ) {
                return res.status(200).json({
                    success: true,
                    message:
                        "Verification code sent"
                });
            }

            // ========================================
            // 60 SECOND COOLDOWN
            // ========================================
            const cooldownCheck =
                await pool.query(
                    `
                    SELECT created_at
                    FROM otp_verifications
                    WHERE LOWER(email) = $1
                    AND purpose = $2
                    ORDER BY created_at DESC
                    LIMIT 1
                    `,
                    [
                        email,
                        normalizedPurpose
                    ]
                );

            if (
                cooldownCheck.rows.length > 0
            ) {
                const lastCreated = new Date(
                    cooldownCheck.rows[0].created_at
                ).getTime();

                const secondsSince =
                    (Date.now() - lastCreated) / 1000;

                if (secondsSince < 60) {
                    const waitSec = Math.ceil(
                        60 - secondsSince
                    );

                    return res.status(429).json({
                        error:
                            `Please wait ${waitSec} seconds before requesting a new verification code`
                    });
                }
            }

            // ========================================
            // GENERATE OTP
            // ========================================
            const isTestMode =
                process.env.NODE_ENV === "test" ||
                process.env.OTP_TEST_MODE === "true";

            const otp = isTestMode
                ? "123456"
                : String(
                    crypto.randomInt(
                        100000,
                        1000000
                    )
                );

            const otpHash = crypto
                .createHash("sha256")
                .update(otp)
                .digest("hex");

            // Save OTP
            const inserted =
                await pool.query(
                    `
                    INSERT INTO otp_verifications
                    (
                        email,
                        otp_hash,
                        purpose,
                        expires_at
                    )
                    VALUES
                    (
                        $1,
                        $2,
                        $3,
                        NOW() + INTERVAL '5 minutes'
                    )
                    RETURNING id
                    `,
                    [
                        email,
                        otpHash,
                        normalizedPurpose
                    ]
                );

            const otpRecordId =
                inserted.rows[0]?.id;

            // ========================================
            // SEND OTP
            // ========================================
            try {
                console.log(
                    "ABOUT TO SEND OTP TO:",
                    email
                );

                await sendBrevoOTPEmail(
                    email,
                    otp,
                    normalizedPurpose
                );

                console.log(
                    "OTP SENT SUCCESSFULLY TO:",
                    email
                );
            } catch (sendErr) {
                console.error(
                    "Brevo API delivery error:",
                    sendErr.message
                );

                if (otpRecordId) {
                    await pool.query(
                        `
                        DELETE FROM otp_verifications
                        WHERE id = $1
                        `,
                        [otpRecordId]
                    );
                }

                return res.status(500).json({
                    error:
                        "Failed to send verification email. Please try again later."
                });
            }

            return res.status(200).json({
                success: true,
                message:
                    "Verification code sent"
            });
        }

        // ========================================
        // POST /api/auth/verify-otp
        // ========================================
        if (
            url.endsWith("/verify-otp") ||
            url.includes("/verify-otp")
        ) {
            if (req.method !== "POST") {
                return res
                    .status(405)
                    .json({
                        error:
                            "Method not allowed"
                    });
            }

            const {
                otp,
                purpose
            } = req.body || {};

            const email = normalizeEmail(
                req.body?.email
            );

            if (
                !email ||
                !otp ||
                !purpose
            ) {
                return res.status(400).json({
                    error:
                        "Email, OTP, and purpose are required"
                });
            }

            const normalizedPurpose =
                String(purpose).toUpperCase();

            const otpResult =
                await pool.query(
                    `
                    SELECT *,
                    (expires_at < NOW()) AS is_expired
                    FROM otp_verifications
                    WHERE LOWER(email) = $1
                    AND purpose = $2
                    AND verified_at IS NULL
                    ORDER BY created_at DESC
                    LIMIT 1
                    `,
                    [
                        email,
                        normalizedPurpose
                    ]
                );

            if (
                otpResult.rows.length === 0
            ) {
                return res.status(400).json({
                    error:
                        "Invalid or expired verification code"
                });
            }

            const record =
                otpResult.rows[0];

            if (record.attempts >= 5) {
                return res.status(400).json({
                    error:
                        "Too many failed attempts. Please request a new verification code."
                });
            }

            if (record.is_expired) {
                return res.status(400).json({
                    error:
                        "Verification code has expired. Please request a new code."
                });
            }

            await pool.query(
                `
                UPDATE otp_verifications
                SET attempts = attempts + 1
                WHERE id = $1
                `,
                [record.id]
            );

            const inputHash = crypto
                .createHash("sha256")
                .update(
                    String(otp).trim()
                )
                .digest("hex");

            if (
                inputHash !== record.otp_hash
            ) {
                return res.status(400).json({
                    error:
                        "Invalid verification code"
                });
            }

            const rawToken = crypto
                .randomBytes(32)
                .toString("hex");

            const tokenHash = crypto
                .createHash("sha256")
                .update(rawToken)
                .digest("hex");

            await pool.query(
                `
                UPDATE otp_verifications
                SET
                    verified_at = NOW(),
                    verification_token_hash = $1,
                    token_expires_at =
                        NOW() + INTERVAL '15 minutes'
                WHERE id = $2
                `,
                [
                    tokenHash,
                    record.id
                ]
            );

            return res.status(200).json({
                success: true,
                verificationToken:
                    rawToken
            });
        }

        // ========================================
        // POST /api/auth/reset-password
        // ========================================
        if (
            url.endsWith("/reset-password") ||
            url.includes("/reset-password")
        ) {
            if (req.method !== "POST") {
                return res
                    .status(405)
                    .json({
                        error:
                            "Method not allowed"
                    });
            }

            const {
                verificationToken,
                newPassword
            } = req.body || {};

            const email = normalizeEmail(
                req.body?.email
            );

            if (
                !email ||
                !verificationToken ||
                !newPassword
            ) {
                return res.status(400).json({
                    error:
                        "Email, verification token, and new password are required"
                });
            }

            if (
                newPassword.length < 6
            ) {
                return res.status(400).json({
                    error:
                        "Password must be at least 6 characters long"
                });
            }

            const tokenHash = crypto
                .createHash("sha256")
                .update(verificationToken)
                .digest("hex");

            const tokenResult =
                await pool.query(
                    `
                    SELECT *
                    FROM otp_verifications
                    WHERE verification_token_hash = $1
                    AND LOWER(email) = $2
                    AND purpose = 'PASSWORD_RESET'
                    AND token_expires_at > NOW()
                    AND token_used_at IS NULL
                    AND verified_at IS NOT NULL
                    `,
                    [
                        tokenHash,
                        email
                    ]
                );

            if (
                tokenResult.rows.length === 0
            ) {
                return res.status(400).json({
                    error:
                        "Invalid, expired, or already used verification token."
                });
            }

            const tokenRecord =
                tokenResult.rows[0];

            const userCheck =
                await pool.query(
                    `
                    SELECT id
                    FROM users
                    WHERE LOWER(email) = $1
                    `,
                    [email]
                );

            if (
                userCheck.rows.length === 0
            ) {
                return res.status(400).json({
                    error:
                        "User not found"
                });
            }

            const hashedPassword =
                await bcrypt.hash(
                    newPassword,
                    10
                );

            await pool.query(
                `
                UPDATE users
                SET password_hash = $1
                WHERE LOWER(email) = $2
                `,
                [
                    hashedPassword,
                    email
                ]
            );

            await pool.query(
                `
                UPDATE otp_verifications
                SET token_used_at = NOW()
                WHERE id = $1
                `,
                [tokenRecord.id]
            );

            return res.status(200).json({
                success: true,
                message:
                    "Password updated successfully"
            });
        }

        // ========================================
        // POST /api/auth/register
        // ========================================
        if (
            url.endsWith("/register") ||
            url.includes("/register")
        ) {
            if (req.method !== "POST") {
                return res
                    .status(405)
                    .json({
                        error:
                            "Method not allowed"
                    });
            }

            const {
                name,
                password,
                phone,
                companyName,
                role,
                verificationToken
            } = req.body || {};

            const email = normalizeEmail(
                req.body?.email
            );

            if (
                !name ||
                !email ||
                !password ||
                !role
            ) {
                return res.status(400).json({
                    error:
                        "Name, email, password, and role are required"
                });
            }

            if (!verificationToken) {
                return res.status(400).json({
                    error:
                        "Email verification is required. Please verify your email with OTP first."
                });
            }

            const tokenHash = crypto
                .createHash("sha256")
                .update(verificationToken)
                .digest("hex");

            const tokenResult =
                await pool.query(
                    `
                    SELECT *
                    FROM otp_verifications
                    WHERE verification_token_hash = $1
                    AND LOWER(email) = $2
                    AND purpose = 'REGISTRATION'
                    AND token_expires_at > NOW()
                    AND token_used_at IS NULL
                    AND verified_at IS NOT NULL
                    `,
                    [
                        tokenHash,
                        email
                    ]
                );

            if (
                tokenResult.rows.length === 0
            ) {
                return res.status(400).json({
                    error:
                        "Invalid, expired, or already used verification token. Please verify your email again."
                });
            }

            const tokenRecord =
                tokenResult.rows[0];

            const existingUser =
                await pool.query(
                    `
                    SELECT *
                    FROM users
                    WHERE LOWER(email) = $1
                    `,
                    [email]
                );

            if (
                existingUser.rows.length > 0
            ) {
                return res.status(400).json({
                    error:
                        "User with this email already exists"
                });
            }

            const hashedPassword =
                await bcrypt.hash(
                    password,
                    10
                );

            const result =
                await pool.query(
                    `
                    INSERT INTO users
                    (
                        name,
                        email,
                        password_hash,
                        phone,
                        company_name,
                        role,
                        status,
                        created_at
                    )
                    VALUES
                    (
                        $1,
                        $2,
                        $3,
                        $4,
                        $5,
                        $6,
                        'ACTIVE',
                        NOW()
                    )
                    RETURNING
                        id,
                        name,
                        email,
                        phone,
                        company_name,
                        role,
                        status,
                        created_at
                    `,
                    [
                        name,
                        email,
                        hashedPassword,
                        phone || null,
                        companyName || null,
                        role
                    ]
                );

            const newUser =
                result.rows[0];

            await pool.query(
                `
                UPDATE otp_verifications
                SET token_used_at = NOW()
                WHERE id = $1
                `,
                [tokenRecord.id]
            );

            const token = jwt.sign(
                {
                    email:
                        newUser.email,
                    role:
                        newUser.role,
                    name:
                        newUser.name
                },
                process.env.JWT_SECRET,
                {
                    subject:
                        String(newUser.id),
                    expiresIn: "7d"
                }
            );

            return res.status(201).json({
                token,

                user: {
                    id:
                        newUser.id,

                    name:
                        newUser.name,

                    email:
                        newUser.email,

                    phone:
                        newUser.phone,

                    company_name:
                        newUser.company_name,

                    role:
                        newUser.role,

                    status:
                        newUser.status,

                    created_at:
                        newUser.created_at
                }
            });
        }

        // ========================================
        // POST /api/auth/google
        // ========================================
        if (
            url.endsWith("/google") ||
            url.includes("/google")
        ) {
            if (req.method !== "POST") {
                return res
                    .status(405)
                    .json({
                        error:
                            "Method not allowed"
                    });
            }

            const {
                idToken,
                onboardingToken,
                role
            } = req.body || {};

            // ========================================
            // GOOGLE ONBOARDING - STAGE B
            // ========================================
            if (onboardingToken) {
                if (!role) {
                    return res.status(400).json({
                        error:
                            "Role is required for Google onboarding"
                    });
                }

                const normalizedRole =
                    String(role).toUpperCase();

                if (
                    ![
                        "BUSINESS",
                        "TRUCK_OWNER"
                    ].includes(normalizedRole)
                ) {
                    return res.status(400).json({
                        error:
                            "Invalid role selection. Admin self-registration is strictly prohibited."
                    });
                }

                let decoded;

                try {
                    decoded = jwt.verify(
                        onboardingToken,
                        process.env.JWT_SECRET
                    );
                } catch (error) {
                    return res.status(401).json({
                        error:
                            "Invalid or expired Google onboarding token. Please sign in with Google again."
                    });
                }

                if (
                    decoded.purpose !==
                    "GOOGLE_ONBOARDING"
                ) {
                    return res.status(401).json({
                        error:
                            "Invalid token type for Google onboarding"
                    });
                }

                const email =
                    normalizeEmail(
                        decoded.email
                    );

                const name =
                    decoded.name;

                const existingUser =
                    await pool.query(
                        `
                        SELECT *
                        FROM users
                        WHERE LOWER(email) = $1
                        `,
                        [email]
                    );

                if (
                    existingUser.rows.length > 0
                ) {
                    const user =
                        existingUser.rows[0];

                    if (
                        user.status ===
                        "BLOCKED"
                    ) {
                        return res.status(403).json({
                            error:
                                "Account is blocked. Please contact support."
                        });
                    }

                    const token =
                        jwt.sign(
                            {
                                email:
                                    user.email,
                                role:
                                    user.role,
                                name:
                                    user.name
                            },
                            process.env.JWT_SECRET,
                            {
                                subject:
                                    String(user.id),
                                expiresIn:
                                    "7d"
                            }
                        );

                    return res.status(200).json({
                        token,

                        user: {
                            id:
                                user.id,

                            name:
                                user.name,

                            email:
                                user.email,

                            phone:
                                user.phone,

                            company_name:
                                user.company_name,

                            role:
                                user.role,

                            status:
                                user.status
                        }
                    });
                }

                const randomPassword =
                    crypto
                        .randomBytes(32)
                        .toString("hex");

                const hashedPassword =
                    await bcrypt.hash(
                        randomPassword,
                        10
                    );

                const companyName =
                    normalizedRole ===
                        "BUSINESS"
                        ? name ||
                        "Business Shipper"
                        : "Individual Truck Owner";

                const result =
                    await pool.query(
                        `
                        INSERT INTO users
                        (
                            name,
                            email,
                            password_hash,
                            phone,
                            company_name,
                            role,
                            status,
                            created_at
                        )
                        VALUES
                        (
                            $1,
                            $2,
                            $3,
                            NULL,
                            $4,
                            $5,
                            'ACTIVE',
                            NOW()
                        )
                        RETURNING *
                        `,
                        [
                            name,
                            email,
                            hashedPassword,
                            companyName,
                            normalizedRole
                        ]
                    );

                const newUser =
                    result.rows[0];

                const token =
                    jwt.sign(
                        {
                            email:
                                newUser.email,
                            role:
                                newUser.role,
                            name:
                                newUser.name
                        },
                        process.env.JWT_SECRET,
                        {
                            subject:
                                String(newUser.id),
                            expiresIn:
                                "7d"
                        }
                    );

                return res.status(201).json({
                    token,
                    user: newUser
                });
            }

            // ========================================
            // GOOGLE LOGIN - STAGE A
            // ========================================
            if (!idToken) {
                return res.status(400).json({
                    error:
                        "Google ID Token is required"
                });
            }

            let googleProfile;

            try {
                googleProfile =
                    await verifyGoogleToken(
                        idToken
                    );
            } catch (tokenErr) {
                return res.status(401).json({
                    error:
                        tokenErr.message ||
                        "Invalid Google authentication"
                });
            }

            const email =
                normalizeEmail(
                    googleProfile.email
                );

            const {
                name,
                sub
            } = googleProfile;

            const existingUser =
                await pool.query(
                    `
                    SELECT *
                    FROM users
                    WHERE LOWER(email) = $1
                    `,
                    [email]
                );

            if (
                existingUser.rows.length > 0
            ) {
                const user =
                    existingUser.rows[0];

                if (
                    user.status ===
                    "BLOCKED"
                ) {
                    return res.status(403).json({
                        error:
                            "Account is blocked. Please contact support."
                    });
                }

                const token =
                    jwt.sign(
                        {
                            email:
                                user.email,
                            role:
                                user.role,
                            name:
                                user.name
                        },
                        process.env.JWT_SECRET,
                        {
                            subject:
                                String(user.id),
                            expiresIn:
                                "7d"
                        }
                    );

                return res.status(200).json({
                    token,

                    user: {
                        id:
                            user.id,

                        name:
                            user.name,

                        email:
                            user.email,

                        phone:
                            user.phone,

                        company_name:
                            user.company_name,

                        role:
                            user.role,

                        status:
                            user.status
                    }
                });
            }

            const signedOnboardingToken =
                jwt.sign(
                    {
                        email,
                        name,
                        sub,
                        purpose:
                            "GOOGLE_ONBOARDING"
                    },
                    process.env.JWT_SECRET,
                    {
                        expiresIn:
                            "15m"
                    }
                );

            return res.status(200).json({
                success: true,
                requiresRoleSelection: true,
                onboardingToken:
                    signedOnboardingToken,
                verifiedEmail:
                    email,
                verifiedName:
                    name
            });
        }

        // ========================================
        // POST /api/auth/login
        // ========================================
        if (
            url.endsWith("/login") ||
            url.includes("/login")
        ) {
            if (req.method !== "POST") {
                return res.status(405).json({
                    error:
                        "Method not allowed"
                });
            }

            const password =
                req.body?.password;

            const email =
                normalizeEmail(
                    req.body?.email
                );

            if (
                !email ||
                !password
            ) {
                return res.status(400).json({
                    error:
                        "Email and password are required"
                });
            }

            const result =
                await pool.query(
                    `
                    SELECT *
                    FROM users
                    WHERE LOWER(email) = $1
                    `,
                    [email]
                );

            if (
                result.rows.length === 0
            ) {
                return res.status(400).json({
                    error:
                        "Invalid email or password"
                });
            }

            const user =
                result.rows[0];

            if (
                user.status ===
                "BLOCKED"
            ) {
                return res.status(403).json({
                    error:
                        "Account is blocked. Please contact support."
                });
            }

            const isMatch =
                await bcrypt.compare(
                    password,
                    user.password_hash
                );

            if (!isMatch) {
                return res.status(400).json({
                    error:
                        "Invalid email or password"
                });
            }

            const token =
                jwt.sign(
                    {
                        email:
                            user.email,

                        role:
                            user.role,

                        name:
                            user.name
                    },
                    process.env.JWT_SECRET,
                    {
                        subject:
                            String(user.id),

                        expiresIn:
                            "7d"
                    }
                );

            return res.status(200).json({
                token,

                user: {
                    id:
                        user.id,

                    name:
                        user.name,

                    email:
                        user.email,

                    phone:
                        user.phone,

                    company_name:
                        user.company_name,

                    role:
                        user.role,

                    status:
                        user.status
                }
            });
        }

        // ========================================
        // GET /api/auth/me
        // ========================================
        if (
            url.endsWith("/me") ||
            url.includes("/me") ||
            req.method === "GET"
        ) {
            const authHeader =
                req.headers.authorization;

            if (
                !authHeader ||
                !authHeader.startsWith(
                    "Bearer "
                )
            ) {
                return res.status(401).json({
                    error:
                        "Unauthorized"
                });
            }

            const token =
                authHeader.split(" ")[1];

            let decoded;

            try {
                decoded =
                    jwt.verify(
                        token,
                        process.env.JWT_SECRET
                    );
            } catch (error) {
                return res.status(401).json({
                    error:
                        "Invalid or expired token"
                });
            }

            const userId =
                Number(decoded.sub);

            const result =
                await pool.query(
                    `
                    SELECT
                        id,
                        name,
                        email,
                        phone,
                        company_name,
                        role,
                        status
                    FROM users
                    WHERE id = $1
                    `,
                    [userId]
                );

            if (
                result.rows.length === 0
            ) {
                return res.status(404).json({
                    error:
                        "User not found"
                });
            }

            return res.status(200).json({
                user:
                    result.rows[0]
            });
        }

        return res.status(404).json({
            error:
                "Endpoint not found"
        });

    } catch (error) {
        console.error(
            "Auth API error:",
            error
        );

        return res.status(500).json({
            error:
                error.message
        });
    }
};