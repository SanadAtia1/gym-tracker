INSERT INTO "days" (day) VALUES 
    ('Day 1'),
    ('Day 2'),
    ('Day 3'),
    ('Day 4'),
    ('Day 5'),
    ('Day 6')
ON CONFLICT(day) DO NOTHING;


INSERT INTO "exercises" (exercise_name) VALUES 
    ('Back Squat 4x5'),
    ('Bench Press 4x5'),
    ('Barbell Row 3x8'),
    ('DB Overhead Press 3x10'),
    ('Deadlift 4x5'),
    ('Chin-ups 4x8'),
    ('Incline DB Press 3x8'),
    ('Curls 3x12'),
    ('Bulgarian Split Squat 3x8'),
    ('Overhead Press 4x6'),
    ('Romanian Deadlift 3x10'),
    ('Cable Row 3x12'),
    ('Romanian Deadlift 3x8'),
    ('Pull-ups 3x8'),
    ('Bulgarian Split Squat 3x12'),
    ('Incline DB Press 3x12'),
    ('Lat Pulldown 3x15'),
    ('Lateral Raise 3x15'),
    ('Cable Curls +  Tricep Pushdowns 3x15'),
    ('DB Snatch 3x6'),
    ('Chin-ups 3x10')
ON CONFLICT(exercise_name) DO NOTHING;