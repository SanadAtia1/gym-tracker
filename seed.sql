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

INSERT INTO "junction" (day, exerciseRef) VALUES
    (1, (SELECT exercise_id FROM exercises WHERE exercise = 'Back Squat 4x5')),
    (1, (SELECT exercise_id FROM exercises WHERE exercise = 'Bench Press 4x5')),
    (1, (SELECT exercise_id FROM exercises WHERE exercise = 'Barbell Row 3x8')),
    (1, (SELECT exercise_id FROM exercises WHERE exercise = 'DB Overhead Press 3x10')),

    (2, (SELECT exercise_id FROM exercises WHERE exercise ='Deadlift 4x5')),
    (2, (SELECT exercise_id FROM exercises WHERE exercise ='Chin-ups 4x8')),
    (2, (SELECT exercise_id FROM exercises WHERE exercise ='Incline DB Press 3x8')),
    (2, (SELECT exercise_id FROM exercises WHERE exercise ='Curls 3x12')),

    (3, (SELECT exercise_id FROM exercises WHERE exercise ='Bulgarian Split Squat 3x8')),
    (3, (SELECT exercise_id FROM exercises WHERE exercise ='Overhead Press 4x6')),
    (3, (SELECT exercise_id FROM exercises WHERE exercise ='Romanian Deadlift 3x10')),
    (3, (SELECT exercise_id FROM exercises WHERE exercise ='Cable Row 3x12')),

    (4, (SELECT exercise_id FROM exercises WHERE exercise ='Back Squat 4x5')),
    (4, (SELECT exercise_id FROM exercises WHERE exercise ='Bench Press 4x5')),
    (4, (SELECT exercise_id FROM exercises WHERE exercise ='Barbell Row 3x8')),
    (4, (SELECT exercise_id FROM exercises WHERE exercise ='Romanian Deadlift 3x8')),
    (4, (SELECT exercise_id FROM exercises WHERE exercise ='Pull-ups 3x8')),

    (5, (SELECT exercise_id FROM exercises WHERE exercise ='Bulgarian Split Squat 3x12')),
    (5, (SELECT exercise_id FROM exercises WHERE exercise ='Incline DB Press 3x12')),
    (5, (SELECT exercise_id FROM exercises WHERE exercise ='Lat Pulldown 3x15')),
    (5, (SELECT exercise_id FROM exercises WHERE exercise ='Lateral Raise 3x15')),
    (5, (SELECT exercise_id FROM exercises WHERE exercise ='Cable Curls +  Tricep Pushdowns 3x15')),

    (6, (SELECT exercise_id FROM exercises WHERE exercise ='Deadlift 4x5')),
    (6, (SELECT exercise_id FROM exercises WHERE exercise ='DB Snatch 3x6')),
    (6, (SELECT exercise_id FROM exercises WHERE exercise ='Chin-ups 3x10'))
ON CONFLICT(day, exerciseRef) DO NOTHING;