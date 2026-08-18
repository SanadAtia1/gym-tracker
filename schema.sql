CREATE TABLE IF NOT EXISTS exercises (
    exercise_id INTEGER PRIMARY KEY AUTOINCREMENT, 
    exercise TEXT UNIQUE NOT NULL
);

CREATE TABLE IF NOT EXISTS junction (
    day INTEGER,
    exerciseRef INTEGER,
    FOREIGN KEY(exerciseRef) REFERENCES exercises(exercise_id),
    UNIQUE (day, exerciseRef)
   
);

CREATE TABLE IF NOT EXISTS sessions (
    session_id INTEGER PRIMARY KEY AUTOINCREMENT,
    date TEXT DEFAULT CURRENT_DATE, 
    dayLogged INTEGER
);

CREATE TABLE IF NOT EXISTS logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT, 
    FOREIGN KEY (sessionRef) REFERENCES session(session_id),
    FOREIGN KEY (exerciseRef) REFERENCES exercises(exercise_id),
    weight INTEGER,
    reps TEXT
);
