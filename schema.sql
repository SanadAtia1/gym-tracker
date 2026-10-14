CREATE TABLE IF NOT EXISTS users (
    user_id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL COLLATE NOCASE,
    password_hash TEXT NOT NULL,
    email_verified_at TEXT,
    split_days INTEGER NOT NULL DEFAULT 6 CHECK (split_days BETWEEN 1 AND 14),
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS auth_sessions (
    token_hash TEXT PRIMARY KEY,
    userRef INTEGER NOT NULL,
    expires_at INTEGER NOT NULL,
    FOREIGN KEY (userRef) REFERENCES users(user_id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS email_verification_tokens (
    token_hash TEXT PRIMARY KEY,
    userRef INTEGER NOT NULL,
    expires_at INTEGER NOT NULL,
    FOREIGN KEY (userRef) REFERENCES users(user_id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS password_reset_tokens (
    token_hash TEXT PRIMARY KEY,
    userRef INTEGER NOT NULL,
    expires_at INTEGER NOT NULL,
    FOREIGN KEY (userRef) REFERENCES users(user_id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS exercises (
    exercise_id INTEGER PRIMARY KEY AUTOINCREMENT, 
    exercise TEXT NOT NULL,
    target_sets INTEGER CHECK (target_sets > 0),
    target_reps INTEGER CHECK (target_reps > 0),
    userRef INTEGER,
    FOREIGN KEY (userRef) REFERENCES users(user_id) ON DELETE CASCADE,
    UNIQUE (userRef, exercise)
);

CREATE TABLE IF NOT EXISTS junction (
    junction_id INTEGER PRIMARY KEY AUTOINCREMENT,
    day INTEGER,
    exerciseRef INTEGER,
    FOREIGN KEY(exerciseRef) REFERENCES exercises(exercise_id) ON DELETE CASCADE,
    UNIQUE (day, exerciseRef)
   
);

CREATE TABLE IF NOT EXISTS sessions (
    session_id INTEGER PRIMARY KEY AUTOINCREMENT,
    date TEXT NOT NULL,
    dayLogged INTEGER,
    userRef INTEGER,
    FOREIGN KEY (userRef) REFERENCES users(user_id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS logs (
    log_id INTEGER PRIMARY KEY AUTOINCREMENT,
    sessionRef INTEGER,
    exerciseRef INTEGER,
    weight REAL,
    reps INTEGER,
    FOREIGN KEY (sessionRef) REFERENCES sessions(session_id) ON DELETE CASCADE,
    FOREIGN KEY (exerciseRef) REFERENCES exercises(exercise_id) ON DELETE CASCADE
);
