
CREATE TABLE IF NOT EXISTS days (
    day_id INTEGER PRIMARY KEY AUTOINCREMENT, 
    day TEXT UNIQUE NOT NULL
);

CREATE TABLE IF NOT EXISTS exercises (
    exercise_id INTEGER PRIMARY KEY AUTOINCREMENT, 
    exercise TEXT UNIQUE NOT NULL
);

CREATE TABLE IF NOT EXISTS junction (
    dayRef INTEGER,
    exerciseRef INTEGER,
    FOREIGN KEY(dayRef) REFERENCES days(day_id),
    FOREIGN KEY(exerciseRef) REFERENCES exercises(exercise_id),
    UNIQUE (dayRef, exerciseRef)
   
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
