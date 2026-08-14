INSERT INTO "days" (day) VALUES 
    ('Day 1'),
    ('Day 2'),
    ('Day 3'),
    ('Day 4'),
    ('Day 5'),
    ('Day 6')
ON CONFLICT(day) DO NOTHING;

INSERT INTO "exercises" (exercise) VALUES 
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
ON CONFLICT(exercise) DO NOTHING;

INSERT INTO "junction" (dayRef, exerciseRef) 
SELECT d.day_id, e.exercise_id
FROM (
    VALUES
        ('Day 1', 'Back Squat 4x5'),
        ('Day 1', 'Bench Press 4x5'),
        ('Day 1', 'Barbell Row 3x8'),
        ('Day 1', 'DB Overhead Press 3x10'),

        ('Day 2', 'Deadlift 4x5'),
        ('Day 2', 'Chin-ups 4x8'),
        ('Day 2', 'Incline DB Press 3x8'),
        ('Day 2', 'Curls 3x12'),

        ('Day 3', 'Bulgarian Split Squat 3x8'),
        ('Day 3', 'Overhead Press 4x6'),
        ('Day 3', 'Romanian Deadlift 3x10'),
        ('Day 3', 'Cable Row 3x12'),

        ('Day 4', 'Back Squat 4x5'),
        ('Day 4', 'Bench Press 4x5'),
        ('Day 4', 'Barbell Row 3x8'),
        ('Day 4', 'Romanian Deadlift 3x8'),
        ('Day 4', 'Pull-ups 3x8'),

        ('Day 5', 'Bulgarian Split Squat 3x12'),
        ('Day 5', 'Incline DB Press 3x12'),
        ('Day 5', 'Lat Pulldown 3x15'),
        ('Day 5', 'Lateral Raise 3x15'),
        ('Day 5', 'Cable Curls +  Tricep Pushdowns 3x15'),

        ('Day 6', 'Deadlift 4x5'),
        ('Day 6', 'DB Snatch 3x6'),
        ('Day 6', 'Chin-ups 3x10')
) AS pairs(day_name, exercise_name)
JOIN days d ON d.day = pairs.day_name
JOIN exercises e ON e.exercise = pairs.exercise_name
ON CONFLICT(dayRef, exerciseRef) DO NOTHING;