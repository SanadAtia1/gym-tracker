require('dotenv').config();

// Fail fast in production so a misconfigured deploy cannot accept signups
// without working email links or Secure-cookie settings.
function assertProductionConfig() {
    if (process.env.NODE_ENV !== 'production') {
        return;
    }

    const required = ['RESEND_API_KEY', 'EMAIL_FROM', 'APP_URL'];
    const missing = required.filter((name) => !process.env[name]?.trim());
    if (missing.length > 0) {
        console.error(`Missing required production env: ${missing.join(', ')}`);
        process.exit(1);
    }

    if (!process.env.APP_URL.startsWith('https://')) {
        console.error('APP_URL must start with https:// in production');
        process.exit(1);
    }

    if (process.env.TRUST_PROXY !== 'true') {
        console.warn(
            'TRUST_PROXY is not true. Behind a reverse proxy, rate limits and client IPs will be wrong.'
        );
    }
}

assertProductionConfig();

const express = require('express');
const crypto = require('node:crypto');
const { promisify } = require('node:util');
const { rateLimit } = require('express-rate-limit');
const app = express();
const db = require('./db.js');
const port = process.env.PORT || 3000;
const maxSplitDays = 14;
const sessionCookieName = 'gym_session';
const sessionDurationMs = 7 * 24 * 60 * 60 * 1000;
const verificationDurationMs = 24 * 60 * 60 * 1000;
const passwordResetDurationMs = 60 * 60 * 1000;
const scrypt = promisify(crypto.scrypt);

// Behind a known reverse proxy, this lets rate limiting use the visitor's IP
// instead of treating every request as if it came from the proxy.
if (process.env.TRUST_PROXY === 'true') {
    app.set('trust proxy', 1);
}

app.use(express.static('public'));
app.use(express.json());

// Layered limits allow normal API usage while applying tighter protection to
// password endpoints, which are the most likely brute-force targets.
const apiLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: 500,
    standardHeaders: 'draft-8',
    legacyHeaders: false,
    message: { success: false, message: 'Too many requests. Please try again shortly.' }
});
const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: 20,
    standardHeaders: 'draft-8',
    legacyHeaders: false,
    message: { success: false, message: 'Too many authentication attempts. Try again later.' }
});
const loginLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: 8,
    standardHeaders: 'draft-8',
    legacyHeaders: false,
    message: { success: false, message: 'Too many sign-in attempts. Try again later.' }
});
const recoveryLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: 5,
    standardHeaders: 'draft-8',
    legacyHeaders: false,
    message: { success: false, message: 'Too many password recovery attempts. Try again later.' }
});

app.use(apiLimiter);
app.use('/auth', authLimiter);
app.use('/auth/login', loginLimiter);
app.use('/auth/forgot-password', recoveryLimiter);
app.use('/auth/reset-password', recoveryLimiter);

// Express does not parse cookies by default. This converts the Cookie header
// into a simple object so the session token can be retrieved by name.
function parseCookies(cookieHeader = '') {
    return Object.fromEntries(
        cookieHeader
            .split(';')
            .map(cookie => cookie.trim())
            .filter(cookie => cookie.includes('='))
            .map(cookie => {
                const separator = cookie.indexOf('=');
                return [
                    decodeURIComponent(cookie.slice(0, separator)),
                    decodeURIComponent(cookie.slice(separator + 1))
                ];
            })
    );
}

// Validate YYYY-MM-DD without allowing JavaScript's Date parser to silently
// turn impossible dates such as February 31 into a different calendar day.
function isValidCalendarDate(value) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
        return false;
    }

    const [year, month, day] = value.split('-').map(Number);
    const parsed = new Date(Date.UTC(year, month - 1, day));
    return parsed.getUTCFullYear() === year &&
        parsed.getUTCMonth() === month - 1 &&
        parsed.getUTCDate() === day;
}

// Only a SHA-256 digest is stored in SQLite. If the database leaks, the raw
// session or verification token cannot be used directly.
function digestSessionToken(token) {
    return crypto.createHash('sha256').update(token).digest('hex');
}

// scrypt is a password-specific key derivation function. A unique random salt
// ensures that users with the same password still have different stored hashes.
async function hashPassword(password) {
    const salt = crypto.randomBytes(16).toString('hex');
    const derivedKey = await scrypt(password, salt, 64);
    return `scrypt:${salt}:${derivedKey.toString('hex')}`;
}

// Recreate the key using the stored salt, then compare in constant time to
// avoid leaking information through comparison timing.
async function passwordMatches(password, storedHash) {
    const [algorithm, salt, hash] = String(storedHash).split(':');
    if (algorithm !== 'scrypt' || !salt || !hash) {
        return false;
    }

    const derivedKey = await scrypt(password, salt, 64);
    const storedKey = Buffer.from(hash, 'hex');
    return storedKey.length === derivedKey.length &&
        crypto.timingSafeEqual(storedKey, derivedKey);
}

// HttpOnly prevents browser JavaScript from reading the token. SameSite=Lax
// limits cross-site cookie sending, and production cookies are HTTPS-only.
function setSessionCookie(res, token) {
    const secure = process.env.NODE_ENV === 'production' ? '; Secure' : '';
    res.setHeader(
        'Set-Cookie',
        `${sessionCookieName}=${encodeURIComponent(token)}; HttpOnly; SameSite=Lax; Path=/; Max-Age=${sessionDurationMs / 1000}${secure}`
    );
}

// Expiring the cookie immediately removes it from the browser.
function clearSessionCookie(res) {
    const secure = process.env.NODE_ENV === 'production' ? '; Secure' : '';
    res.setHeader(
        'Set-Cookie',
        `${sessionCookieName}=; HttpOnly; SameSite=Lax; Path=/; Max-Age=0${secure}`
    );
}

// The browser receives the random token, while SQLite stores only its digest
// and the user it belongs to. Sessions remain valid for seven days.
function createAuthSession(userID, res) {
    const token = crypto.randomBytes(32).toString('base64url');
    const expiresAt = Date.now() + sessionDurationMs;

    db.prepare(`
        INSERT INTO auth_sessions (token_hash, userRef, expires_at)
        VALUES (?, ?, ?)
    `).run(digestSessionToken(token), userID, expiresAt);

    setSessionCookie(res, token);
}

// A user can have only one active verification link. Creating a new link
// invalidates any older link before storing the new token digest.
function createVerificationToken(userID) {
    const token = crypto.randomBytes(32).toString('base64url');
    const expiresAt = Date.now() + verificationDurationMs;

    db.transaction(() => {
        db.prepare('DELETE FROM email_verification_tokens WHERE userRef = ?').run(userID);
        db.prepare(`
            INSERT INTO email_verification_tokens (token_hash, userRef, expires_at)
            VALUES (?, ?, ?)
        `).run(digestSessionToken(token), userID, expiresAt);
    })();

    return token;
}

// Password reset tokens follow the same one-active-link rule as verification
// tokens, but expire after one hour because they grant access to the account.
function createPasswordResetToken(userID) {
    const token = crypto.randomBytes(32).toString('base64url');
    const expiresAt = Date.now() + passwordResetDurationMs;

    db.transaction(() => {
        db.prepare('DELETE FROM password_reset_tokens WHERE userRef = ?').run(userID);
        db.prepare(`
            INSERT INTO password_reset_tokens (token_hash, userRef, expires_at)
            VALUES (?, ?, ?)
        `).run(digestSessionToken(token), userID, expiresAt);
    })();

    return token;
}

// Names are inserted into HTML email content, so escape HTML special characters
// to prevent user input from becoming markup.
function escapeHtml(value) {
    return String(value)
        .replaceAll('&', '&amp;')
        .replaceAll('<', '&lt;')
        .replaceAll('>', '&gt;')
        .replaceAll('"', '&quot;')
        .replaceAll("'", '&#039;');
}

// In production this sends through Resend. Development returns the same
// one-time URL to the frontend so verification can be tested without email.
async function sendVerificationEmail(user, token, req) {
    const appUrl = process.env.APP_URL || `${req.protocol}://${req.get('host')}`;
    const verificationUrl = `${appUrl}/auth/verify?token=${encodeURIComponent(token)}`;

    if (!process.env.RESEND_API_KEY) {
        if (process.env.NODE_ENV === 'production') {
            throw new Error('RESEND_API_KEY is required in production');
        }
        console.log(`Development verification link for ${user.email}: ${verificationUrl}`);
        return { verificationUrl };
    }

    const response = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
            Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            from: process.env.EMAIL_FROM || 'Gym Tracker <onboarding@resend.dev>',
            to: [user.email],
            subject: 'Verify your Gym Tracker account',
            html: `
                <div style="font-family:Arial,sans-serif;color:#171717">
                    <h1>Welcome, ${escapeHtml(user.name)}!</h1>
                    <p>Verify your email to finish setting up your Gym Tracker account.</p>
                    <p>
                        <a href="${verificationUrl}"
                           style="display:inline-block;padding:12px 20px;border-radius:8px;background:#FFDB58;color:#171717;text-decoration:none;font-weight:700">
                            Verify email
                        </a>
                    </p>
                    <p>This link expires in 24 hours.</p>
                </div>
            `
        })
    });

    if (!response.ok) {
        const details = await response.text();
        throw new Error(`Resend rejected verification email: ${response.status} ${details}`);
    }

    return {};
}

// Send a one-hour password reset link through Resend. Local development
// returns the link directly so the complete recovery flow remains testable.
async function sendPasswordResetEmail(user, token, req) {
    const appUrl = process.env.APP_URL || `${req.protocol}://${req.get('host')}`;
    const resetUrl = `${appUrl}/?resetToken=${encodeURIComponent(token)}`;

    if (!process.env.RESEND_API_KEY) {
        if (process.env.NODE_ENV === 'production') {
            throw new Error('RESEND_API_KEY is required in production');
        }
        console.log(`Development password reset link for ${user.email}: ${resetUrl}`);
        return { resetUrl };
    }

    const response = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
            Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            from: process.env.EMAIL_FROM || 'Gym Tracker <onboarding@resend.dev>',
            to: [user.email],
            subject: 'Reset your Gym Tracker password',
            html: `
                <div style="font-family:Arial,sans-serif;color:#171717">
                    <h1>Password reset</h1>
                    <p>Hello ${escapeHtml(user.name)}, use the link below to choose a new password.</p>
                    <p>
                        <a href="${resetUrl}"
                           style="display:inline-block;padding:12px 20px;border-radius:8px;background:#FFDB58;color:#171717;text-decoration:none;font-weight:700">
                            Reset password
                        </a>
                    </p>
                    <p>This link expires in one hour. Ignore this email if you did not request it.</p>
                </div>
            `
        })
    });

    if (!response.ok) {
        const details = await response.text();
        throw new Error(`Resend rejected password reset email: ${response.status} ${details}`);
    }

    return {};
}

// Resolve an unexpired session cookie to its user. Returning the split setting
// here also lets the frontend configure its day selectors after page load.
function getAuthenticatedUser(req) {
    const token = parseCookies(req.headers.cookie)[sessionCookieName];
    if (!token) {
        return undefined;
    }

    return db.prepare(`
        SELECT u.user_id, u.name, u.email, u.split_days
        FROM auth_sessions a
        JOIN users u ON u.user_id = a.userRef
        WHERE a.token_hash = ? AND a.expires_at > ?
    `).get(digestSessionToken(token), Date.now());
}

// Protected routes use req.user instead of trusting a user ID supplied by the
// client. Every later ownership check is based on this authenticated user.
function requireAuth(req, res, next) {
    const user = getAuthenticatedUser(req);
    if (!user) {
        return res.status(401).json({
            success: false,
            message: 'Please sign in.'
        });
    }

    req.user = user;
    next();
}

// Create an unverified account. No login session is issued until the user
// proves ownership of the email address through the verification link.
app.post('/auth/signup', async (req, res) => {
    const name = typeof req.body.name === 'string' ? req.body.name.trim() : '';
    const email = typeof req.body.email === 'string'
        ? req.body.email.trim().toLowerCase()
        : '';
    const password = typeof req.body.password === 'string' ? req.body.password : '';

    if (!name || name.length > 80 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        return res.status(400).json({
            success: false,
            message: 'Enter a valid name and email address.'
        });
    }
    if (password.length < 8 || password.length > 128) {
        return res.status(400).json({
            success: false,
            message: 'Password must be between 8 and 128 characters.'
        });
    }

    try {
        // Store the derived password hash, never the original password.
        const passwordHash = await hashPassword(password);
        const result = db.prepare(`
            INSERT INTO users (name, email, password_hash)
            VALUES (?, ?, ?)
        `).run(name, email, passwordHash);
        const userID = result.lastInsertRowid;
        const verificationToken = createVerificationToken(userID);
        let delivery;

        try {
            delivery = await sendVerificationEmail({ name, email }, verificationToken, req);
        } catch (emailError) {
            console.error('Error sending verification email:', emailError);
            return res.status(502).json({
                success: false,
                accountCreated: true,
                message: 'Account created, but the verification email could not be sent. Please try resending it.'
            });
        }

        return res.status(201).json({
            success: true,
            requiresVerification: true,
            message: 'Account created. Check your email to verify it.',
            verificationUrl: delivery.verificationUrl
        });
    } catch (error) {
        if (error.code === 'SQLITE_CONSTRAINT_UNIQUE') {
            return res.status(409).json({
                success: false,
                message: 'An account already exists for that email.'
            });
        }
        console.error('Error creating account:', error);
        return res.status(500).json({
            success: false,
            message: 'Unable to create account.'
        });
    }
});

// Check both the password and email-verification state before issuing a
// persistent session cookie.
app.post('/auth/login', async (req, res) => {
    const email = typeof req.body.email === 'string'
        ? req.body.email.trim().toLowerCase()
        : '';
    const password = typeof req.body.password === 'string' ? req.body.password : '';
    const user = db.prepare('SELECT * FROM users WHERE email = ?').get(email);

    // Use the same generic response for an unknown email and a bad password so
    // callers cannot discover which email addresses have accounts.
    if (!user || !(await passwordMatches(password, user.password_hash))) {
        return res.status(401).json({
            success: false,
            message: 'Incorrect email or password.'
        });
    }
    if (!user.email_verified_at) {
        return res.status(403).json({
            success: false,
            requiresVerification: true,
            message: 'Verify your email before signing in.'
        });
    }

    db.prepare('DELETE FROM auth_sessions WHERE expires_at <= ?').run(Date.now());
    createAuthSession(user.user_id, res);
    return res.json({
        success: true,
        message: 'Signed in',
        user: {
            user_id: user.user_id,
            name: user.name,
            email: user.email,
            split_days: user.split_days
        }
    });
});

// Verification is transactional: mark the user verified and consume the token
// together so the same one-time link cannot be reused.
app.get('/auth/verify', (req, res) => {
    const token = typeof req.query.token === 'string' ? req.query.token : '';
    const tokenHash = token ? digestSessionToken(token) : '';

    const verifyEmail = db.transaction(() => {
        const verification = db.prepare(`
            SELECT u.user_id, u.name, u.email, u.split_days
            FROM email_verification_tokens v
            JOIN users u ON u.user_id = v.userRef
            WHERE v.token_hash = ? AND v.expires_at > ?
        `).get(tokenHash, Date.now());

        if (!verification) {
            return undefined;
        }

        db.prepare(`
            UPDATE users
            SET email_verified_at = CURRENT_TIMESTAMP
            WHERE user_id = ?
        `).run(verification.user_id);
        db.prepare('DELETE FROM email_verification_tokens WHERE userRef = ?')
            .run(verification.user_id);

        return verification;
    });

    const user = verifyEmail();
    if (!user) {
        return res.redirect('/?verification=invalid');
    }

    createAuthSession(user.user_id, res);
    return res.redirect('/?verified=1');
});

// Always return the same outward response, even when the email is unknown or
// already verified, to avoid exposing account existence.
app.post('/auth/resend-verification', async (req, res) => {
    const email = typeof req.body.email === 'string'
        ? req.body.email.trim().toLowerCase()
        : '';
    const user = db.prepare(`
        SELECT user_id, name, email
        FROM users
        WHERE email = ? AND email_verified_at IS NULL
    `).get(email);

    let verificationUrl;
    if (user) {
        try {
            const token = createVerificationToken(user.user_id);
            const delivery = await sendVerificationEmail(user, token, req);
            verificationUrl = delivery.verificationUrl;
        } catch (error) {
            console.error('Error resending verification email:', error);
        }
    }

    return res.json({
        success: true,
        message: 'If that unverified account exists, a new email has been sent.',
        verificationUrl
    });
});

// Generate a reset link without revealing whether the submitted email belongs
// to an account. The frontend always receives the same outward message.
app.post('/auth/forgot-password', async (req, res) => {
    const email = typeof req.body.email === 'string'
        ? req.body.email.trim().toLowerCase()
        : '';
    const user = db.prepare(`
        SELECT user_id, name, email
        FROM users
        WHERE email = ? AND email_verified_at IS NOT NULL
    `).get(email);

    let resetUrl;
    if (user) {
        try {
            const token = createPasswordResetToken(user.user_id);
            const delivery = await sendPasswordResetEmail(user, token, req);
            resetUrl = delivery.resetUrl;
        } catch (error) {
            console.error('Error sending password reset email:', error);
        }
    }

    return res.json({
        success: true,
        message: 'If that account exists, a password reset email has been sent.',
        resetUrl
    });
});

// Consume a valid one-time token, replace the password hash, and revoke every
// existing login session so other devices must authenticate with the new password.
app.post('/auth/reset-password', async (req, res) => {
    const token = typeof req.body.token === 'string' ? req.body.token : '';
    const password = typeof req.body.password === 'string' ? req.body.password : '';

    if (password.length < 8 || password.length > 128) {
        return res.status(400).json({
            success: false,
            message: 'Password must be between 8 and 128 characters.'
        });
    }

    const tokenHash = token ? digestSessionToken(token) : '';
    const resetRecord = db.prepare(`
        SELECT userRef
        FROM password_reset_tokens
        WHERE token_hash = ? AND expires_at > ?
    `).get(tokenHash, Date.now());
    if (!resetRecord) {
        return res.status(400).json({
            success: false,
            message: 'That password reset link is invalid or expired.'
        });
    }

    const passwordHash = await hashPassword(password);
    const resetPassword = db.transaction(() => {
        const currentToken = db.prepare(`
            SELECT userRef
            FROM password_reset_tokens
            WHERE token_hash = ? AND expires_at > ?
        `).get(tokenHash, Date.now());
        if (!currentToken) {
            return false;
        }

        db.prepare('UPDATE users SET password_hash = ? WHERE user_id = ?')
            .run(passwordHash, currentToken.userRef);
        db.prepare('DELETE FROM password_reset_tokens WHERE userRef = ?')
            .run(currentToken.userRef);
        db.prepare('DELETE FROM auth_sessions WHERE userRef = ?')
            .run(currentToken.userRef);
        return true;
    });

    if (!resetPassword()) {
        return res.status(400).json({
            success: false,
            message: 'That password reset link is invalid or expired.'
        });
    }

    return res.json({
        success: true,
        message: 'Password updated. Sign in with your new password.'
    });
});

// Delete the server-side session as well as expiring the browser cookie.
app.post('/auth/logout', (req, res) => {
    const token = parseCookies(req.headers.cookie)[sessionCookieName];
    if (token) {
        db.prepare('DELETE FROM auth_sessions WHERE token_hash = ?')
            .run(digestSessionToken(token));
    }
    clearSessionCookie(res);
    return res.json({ success: true, message: 'Signed out' });
});

// Used on page load to restore the signed-in UI from an existing cookie.
app.get('/auth/me', (req, res) => {
    const user = getAuthenticatedUser(req);
    if (!user) {
        return res.status(401).json({ authenticated: false });
    }
    return res.json({ authenticated: true, user });
});

// Everything declared below this line requires a valid signed-in session.
app.use(requireAuth);

// Store split length with the account so it follows the user across devices.
app.patch('/users/me/split', (req, res) => {
    const splitDays = Number(req.body.splitDays);
    if (!Number.isInteger(splitDays) || splitDays < 1 || splitDays > maxSplitDays) {
        return res.status(400).json({
            success: false,
            message: `Split must contain between 1 and ${maxSplitDays} days.`
        });
    }

    db.prepare('UPDATE users SET split_days = ? WHERE user_id = ?')
        .run(splitDays, req.user.user_id);
    return res.json({
        success: true,
        message: `Split updated to ${splitDays} days`,
        splitDays
    });
});

// Return the exercises assigned to a workout day, including each exercise's
// latest logged performance.
app.get('/days/:day', (req, res) => {
    const dayNum = Number(req.params.day);
    if (Number.isInteger(dayNum) && dayNum > 0 && dayNum <= maxSplitDays) {
        // An exercise may belong to several days through junction. Partitioning
        // by exercise_id finds its newest log across every day, which means Day
        // 5 can show a result most recently logged during Day 1.
        const dayQuery = db.prepare(`
            WITH ranked AS (
            SELECT e.exercise, e.exercise_id, e.target_sets, e.target_reps,
            l.weight, l.reps, j.junction_id, j.day,
            ROW_NUMBER() OVER (PARTITION BY e.exercise_id ORDER BY s.date DESC, l.log_id DESC) AS rn
            FROM exercises e
            JOIN junction j ON j.exerciseRef = e.exercise_id 
            LEFT JOIN logs l ON l.exerciseRef = e.exercise_id
            LEFT JOIN sessions s ON s.session_id = l.sessionRef
            WHERE j.day = ? AND e.userRef = ?
            )
            SELECT *
            FROM ranked
            WHERE rn = 1
            ORDER BY junction_id ASC;
        `).all(dayNum, req.user.user_id);
    
        res.json(dayQuery);
    } else {
        res.json({message: 'Error: invalid choice'});
    }
});

// Create or reuse an exercise, then assign it to the selected workout day.
app.post('/exercises', (req, res) => {
    const exercise = typeof req.body.exercise === 'string' ? req.body.exercise.trim() : '';
    const day = Number(req.body.day);
    const targetSets = Number(req.body.sets);
    const targetReps = Number(req.body.reps);

    if (
        !exercise ||
        !Number.isInteger(day) || day < 1 || day > maxSplitDays ||
        !Number.isInteger(targetSets) || targetSets < 1 ||
        !Number.isInteger(targetReps) || targetReps < 1
    ) {
        return res.status(400).json({
            success: false,
            message: 'Enter a name and positive whole numbers for day, sets, and reps.'
        });
    }

    // Keep creation and day assignment atomic: either both database changes
    // succeed or neither is saved.
    const createExercise = db.transaction(() => {
        // Reuse an existing exercise for this user so multiple workout days
        // point to the same exercise_id and therefore share log history.
        const existing = db.prepare(`
            SELECT exercise_id, target_sets, target_reps
            FROM exercises
            WHERE exercise = ? AND userRef = ?
        `).get(exercise, req.user.user_id);

        let exerciseID;
        if (existing) {
            exerciseID = existing.exercise_id;

            if (existing.target_sets === null && existing.target_reps === null) {
                db.prepare(`
                    UPDATE exercises
                    SET target_sets = ?, target_reps = ?
                    WHERE exercise_id = ?
                `).run(targetSets, targetReps, exerciseID);
            } else if (
                existing.target_sets !== targetSets ||
                existing.target_reps !== targetReps
            ) {
                const error = new Error('Exercise targets do not match');
                error.code = 'EXERCISE_TARGET_MISMATCH';
                throw error;
            }
        } else {
            const result = db.prepare(`
                INSERT INTO exercises (exercise, target_sets, target_reps, userRef)
                VALUES (?, ?, ?, ?)
            `).run(exercise, targetSets, targetReps, req.user.user_id);
            exerciseID = result.lastInsertRowid;
        }

        // The junction table represents the many-to-many relationship between
        // workout days and exercises. INSERT OR IGNORE prevents duplicate pairs.
        const assignment = db.prepare(`
            INSERT OR IGNORE INTO junction (day, exerciseRef)
            VALUES (?, ?)
        `).run(day, exerciseID);

        if (assignment.changes === 0) {
            const error = new Error('Exercise already assigned');
            error.code = 'EXERCISE_ALREADY_ASSIGNED';
            throw error;
        }

        return exerciseID;
    });

    try {
        const exerciseID = createExercise();
        return res.status(201).json({
            success: true,
            message: 'Exercise added',
            exerciseID
        });
    } catch (error) {
        if (error.code === 'EXERCISE_ALREADY_ASSIGNED') {
            return res.status(409).json({
                success: false,
                message: 'That exercise is already assigned to this day.'
            });
        }
        if (error.code === 'EXERCISE_TARGET_MISMATCH') {
            return res.status(409).json({
                success: false,
                message: 'That exercise already exists with different targets. Edit it first.'
            });
        }

        console.error('Error creating exercise:', error);
        return res.status(500).json({
            success: false,
            message: 'Unable to add exercise.'
        });
    }
});

// Update the name or target prescription of an exercise owned by this user.
app.patch('/exercises/:id', (req, res) => {
    const exerciseID = Number(req.params.id);
    // Including userRef prevents one user from reading or editing another
    // user's exercise by guessing its numeric ID.
    const current = db.prepare(`
        SELECT * FROM exercises WHERE exercise_id = ? AND userRef = ?
    `).get(exerciseID, req.user.user_id);

    if (!current) {
        return res.status(404).json({
            success: false,
            message: 'Exercise not found.'
        });
    }

    const exercise = req.body.exercise === undefined
        ? current.exercise
        : String(req.body.exercise).trim();
    const targetSets = req.body.sets === undefined
        ? current.target_sets
        : Number(req.body.sets);
    const targetReps = req.body.reps === undefined
        ? current.target_reps
        : Number(req.body.reps);

    if (
        !exercise ||
        !Number.isInteger(targetSets) || targetSets < 1 ||
        !Number.isInteger(targetReps) || targetReps < 1
    ) {
        return res.status(400).json({
            success: false,
            message: 'Enter a name and positive whole numbers for sets and reps.'
        });
    }

    try {
        db.prepare(`
            UPDATE exercises
            SET exercise = ?, target_sets = ?, target_reps = ?
            WHERE exercise_id = ? AND userRef = ?
        `).run(exercise, targetSets, targetReps, exerciseID, req.user.user_id);

        return res.json({
            success: true,
            message: 'Exercise updated',
            exercise: {
                exercise_id: exerciseID,
                exercise,
                target_sets: targetSets,
                target_reps: targetReps
            }
        });
    } catch (error) {
        if (error.code === 'SQLITE_CONSTRAINT_UNIQUE') {
            return res.status(409).json({
                success: false,
                message: 'Another exercise already uses that name.'
            });
        }

        console.error('Error updating exercise:', error);
        return res.status(500).json({
            success: false,
            message: 'Unable to update exercise.'
        });
    }
});

// Detach an exercise from one workout day without deleting its log history.
app.delete('/days/:day/exercises/:id', (req, res) => {
    const day = Number(req.params.day);
    const exerciseID = Number(req.params.id);

    if (
        !Number.isInteger(day) || day < 1 || day > maxSplitDays ||
        !Number.isInteger(exerciseID) || exerciseID < 1
    ) {
        return res.status(400).json({
            success: false,
            message: 'Invalid day or exercise.'
        });
    }

    // Delete only the day assignment. The exercise and all of its historical
    // logs remain available if it is assigned to another day later.
    const result = db.prepare(`
        DELETE FROM junction
        WHERE day = ? AND exerciseRef = ?
          AND exerciseRef IN (
              SELECT exercise_id FROM exercises WHERE userRef = ?
          )
    `).run(day, exerciseID, req.user.user_id);

    if (result.changes === 0) {
        return res.status(404).json({
            success: false,
            message: 'Exercise was not assigned to that day.'
        });
    }

    return res.json({
        success: true,
        message: 'Exercise removed from day.'
    });
});

// Start today's workout session for the selected day.
app.post('/sessions', (req, res) => {
    const day = Number(req.body.day);
    const sessionDate = typeof req.body.date === 'string' ? req.body.date : '';
    if (
        !Number.isInteger(day) || day < 1 || day > maxSplitDays ||
        !isValidCalendarDate(sessionDate)
    ) {
        return res.status(400).json({
            duplicate: false,
            success: false,
            message: 'Invalid workout day or date.'
        });
    }

    // The browser supplies its local YYYY-MM-DD value so late-night workouts
    // are not shifted by SQLite's UTC-based CURRENT_DATE.
    const dupSess = db.prepare(`
        SELECT * FROM sessions
        WHERE date = ? AND userRef = ?
    `).all(sessionDate, req.user.user_id);
    if (dupSess.length > 0) {
        res.json({
            duplicate: true,
            message: 'Session already exists'
        });
        return;
    }
    const createSession = db.prepare(`
        INSERT INTO sessions (date, dayLogged, userRef) VALUES (?, ?, ?)
    `).run(sessionDate, day, req.user.user_id);
    res.json({
        duplicate: false,
        message: 'Session created',
        sessID: createSession.lastInsertRowid
    });
  });

// Record one exercise's completed weight and reps in a workout session.
app.post('/logs', (req, res) => {
    const { sessionID, exerciseID, weight, reps } = req.body;
    const weightValue = Number(weight);
    const repsValue = Number(reps);
    if (
        String(weight).trim() === '' ||
        String(reps).trim() === '' ||
        !Number.isFinite(weightValue) || weightValue < 0 ||
        !Number.isInteger(repsValue) || repsValue < 0
    ) {
        return res.status(400).json({
            success: false,
            message: 'Weight must be non-negative and reps must be a non-negative whole number.'
        });
    }
    if (!sessionID|| !exerciseID) {
        return res.status(400).json({
            success: false,
            message: 'Invalid input(s) - (session/exercise)'
        });
    }

    // Verify both foreign IDs belong to the signed-in user before connecting
    // them in a log entry.
    const ownsSession = db.prepare(`
        SELECT 1 FROM sessions WHERE session_id = ? AND userRef = ?
    `).get(sessionID, req.user.user_id);
    const ownsExercise = db.prepare(`
        SELECT 1 FROM exercises WHERE exercise_id = ? AND userRef = ?
    `).get(exerciseID, req.user.user_id);
    if (!ownsSession || !ownsExercise) {
        return res.status(404).json({
            success: false,
            message: 'Session or exercise not found.'
        });
    }
    const createLog = db.prepare(`
        INSERT INTO logs (sessionRef, exerciseRef, weight, reps)
        VALUES (?, ?, ?, ?)
    `).run(sessionID, exerciseID, weightValue, repsValue);
    res.json({
        success: true,
        logID: createLog.lastInsertRowid
        
    });
  });

// Return a user's workout session and its logs for a calendar date.
app.get('/sessions/:date', (req, res) => {
    const sessionDate = req.params.date;
    // Scope the initial lookup and joined log query to the current user so a
    // shared date cannot expose another account's workout.
    const checkSession = db.prepare(`
        SELECT * FROM sessions WHERE date = ? AND userRef = ?
    `).get(sessionDate, req.user.user_id);
    if (checkSession) {
        const printLogInfo = db.prepare(`
            SELECT e.exercise, l.weight, l.reps, s.date, l.log_id, s.session_id, s.dayLogged
            FROM exercises e
            JOIN logs l ON l.exerciseRef = e.exercise_id
            JOIN sessions s ON s.session_id = l.sessionRef
            WHERE s.date = ? AND s.userRef = ?
        `).all(sessionDate, req.user.user_id);
        
        if (printLogInfo.length > 0) { 
            res.json({
                sessionExists: true,
                logsExist: true,
                logs: printLogInfo,
            });
        } else {
            res.json({
                sessionExists: true,
                logsExist: false,
                session: checkSession
            });
        }
        return;
    } else {
        res.json({
            sessionExists: false,
            message: 'No session on this day'
        });
    }
});

// Return exercises assigned to the session's day that have not been logged yet.
app.get('/sessions/:id/day/:day', (req, res) => {
    const { id, day } = req.params;
    // LEFT JOIN keeps every exercise assigned to the day; l.log_id IS NULL
    // narrows that list to exercises not yet logged in this specific session.
    // EXISTS also proves that the requested session belongs to this user.
    const printEmptyLogs = db.prepare(`
        SELECT e.exercise, e.exercise_id, e.target_sets, e.target_reps, l.weight, l.reps
        FROM exercises e
        JOIN junction j ON j.exerciseRef = e.exercise_id 
        LEFT JOIN logs l ON l.exerciseRef = e.exercise_id AND l.sessionRef = ?
        WHERE l.log_id IS NULL AND j.day = ? AND e.userRef = ?
          AND EXISTS (
              SELECT 1 FROM sessions
              WHERE session_id = ? AND userRef = ?
          )
        ORDER BY j.junction_id ASC
    `).all(id, day, req.user.user_id, id, req.user.user_id);

    if (printEmptyLogs.length > 0) {
        res.json({
            logsExist: true,
            logs: printEmptyLogs
        });
    } else {
        res.json({
            logsExist: false,
            message: 'No unlogged exercises found'
        });
    }
});

// Allow deletion only while a session contains no workout logs.
app.delete('/sessions/:id', (req, res) => {
    const sessionID = req.params.id;
    const ownsSession = db.prepare(`
        SELECT 1 FROM sessions WHERE session_id = ? AND userRef = ?
    `).get(sessionID, req.user.user_id);
    if (!ownsSession) {
        return res.status(404).json({
            logsExist: false,
            message: 'Session not found'
        });
    }

    // A session with logs is retained to avoid accidentally deleting workout
    // history through the "delete empty session" action.
    const hasLogs = db.prepare('SELECT * FROM logs WHERE sessionRef = ?').all(sessionID);
    if (hasLogs.length > 0) {
        res.json({
            logsExist: true,
            message: 'Cannot delete session containing logs'
        });
        return;
    }
    const deleteSession = db.prepare(`
        DELETE FROM sessions WHERE session_id = ? AND userRef = ?
    `);
    const delInfo = deleteSession.run(sessionID, req.user.user_id);

    if (delInfo.changes > 0){
        res.json({
            logsExist: false,
            message: `Session deleted`
        });
    } else {
        res.json({
            logsExist: false,
            message: 'No changes made'
        });
    }

});

// Delete one log after applying ownership through its parent session.
app.delete('/logs/:id', (req, res) => {
    const logID = req.params.id;
    // The nested session lookup applies ownership inside the DELETE itself,
    // preventing deletion of another user's log by ID.
    const deleteLog = db.prepare(`
        DELETE FROM logs
        WHERE log_id = ?
          AND sessionRef IN (
              SELECT session_id FROM sessions WHERE userRef = ?
          )
    `);
    const delInfo = deleteLog.run(logID, req.user.user_id);

    if (delInfo.changes > 0) {
        res.json({ message: `Log deleted` }); 
    }else {
        res.json({ message: 'No changes made' });
    }
});

// Update either or both performance values on an existing log.
app.patch('/logs/:id', (req, res) => {
    const logID = req.params.id;
    const { weight, reps } = req.body;
    const hasWeight = weight !== undefined && String(weight).trim() !== '';
    const hasReps = reps !== undefined && String(reps).trim() !== '';
    const weightValue = Number(weight);
    const repsValue = Number(reps);
    // Logs do not carry userRef directly, so ownership is established through
    // the parent session before any update is allowed.
    const ownsLog = db.prepare(`
        SELECT 1
        FROM logs l
        JOIN sessions s ON s.session_id = l.sessionRef
        WHERE l.log_id = ? AND s.userRef = ?
    `).get(logID, req.user.user_id);

    if (!ownsLog) {
        return res.status(404).json({
            success: false,
            message: 'Log not found.'
        });
    }

    if (!hasWeight && !hasReps) {
        return res.status(400).json({
            success: false,
            message:'No valid entries provided.'
        });
    }
    if (
        (hasWeight && (!Number.isFinite(weightValue) || weightValue < 0)) ||
        (hasReps && (!Number.isInteger(repsValue) || repsValue < 0))
    ) {
        return res.status(400).json({
            success: false,
            message: 'Weight must be non-negative and reps must be a non-negative whole number.'
        });
    }

    if (!hasWeight) {
        db.prepare('UPDATE logs SET reps = ? WHERE log_id = ?').run(repsValue, logID);
    } else if (!hasReps) {
        db.prepare('UPDATE logs SET weight = ? WHERE log_id = ?').run(weightValue, logID);
    } else {
        db.prepare('UPDATE logs SET weight = ?, reps = ? WHERE log_id = ?')
            .run(weightValue, repsValue, logID);
    }

    res.json({ 
        success: true,
        message: `Log updated` 
    });
});

app.listen(port, () => {
    console.log(`Server is running on port ${port}`);
  });