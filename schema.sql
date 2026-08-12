
CREATE TABLE IF NOT EXISTS days (
    day_id INTEGER PRIMARY KEY AUTOINCREMENT, 
    day TEXT UNIQUE NOT NULL
);

CREATE TABLE IF NOT EXISTS exercises (
    exercise_id INTEGER PRIMARY KEY AUTOINCREMENT, 
    exercise_name TEXT UNIQUE NOT NULL
);

CREATE TABLE IF NOT EXISTS junction (
    day_id INTEGER, 
    exercise_id INTEGER,
    UNIQUE (day_id, exercise_id)
);

CREATE TABLE IF NOT EXISTS sessions (
    session_id INTEGER PRIMARY KEY AUTOINCREMENT,
    date TEXT, 
    day_id INTEGER
);

CREATE TABLE IF NOT EXISTS logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT, 
    session_id INTEGER, 
    exercise_id INTEGER, 
    weight INTEGER,
    reps TEXT
);
