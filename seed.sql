INSERT INTO "exercises" (exercise) VALUES 
    ('Barbell Bench Press 4x6'),
    ('Pull-Ups 4x6'),
    ('Dumbbell Shoulder Press 3x8'),
    ('One-Arm Dumbbell Row 3x10'),
    ('Dumbbell Lateral Raise 3x12'),
    ('Bulgarian Split Squat 3x8'),
    ('Dumbbell Step-Up 3x8'),
    ('Dumbbell Romanian Deadlift 3x10'),
    ('Dumbbell Hip Thrust 3x10'),
    ('Vertical Jump 3x8'),
    ('Incline Dumbbell Bench Press 4x8'),
    ('Chin-Ups 4x6'),
    ('Dumbbell Bench Press 3x10'),
    ('Chest-Supported Dumbbell Row 3x10'),
    ('Dumbbell Curl 3x10'),
    ('Reverse Lunge 3x8'),
    ('Goblet Squat 3x10'),
    ('Balance Ball Hamstring Curl 3x12'),
    ('Lateral Bound 3x8'),
    ('Weighted/BW Pull-Up 4x6'),
    ('Weighted/BW Dip 4x8'),
    ('Incline Dumbbell Bench Press 3x10'),
    ('Inverted Row 3x10'),
    ('Broad Jump 3x4'),
    ('Push-Ups 3x12'),
    ('Pull-Ups 3x6'),
    ('Farmer Carry 3x40 (sec)')
ON CONFLICT(exercise) DO NOTHING; 


INSERT INTO "junction" (day, exerciseRef) VALUES
    (1, (SELECT exercise_id FROM exercises WHERE exercise = 'Barbell Bench Press 4x6')),
    (1, (SELECT exercise_id FROM exercises WHERE exercise = 'Pull-Ups 4x6')),
    (1, (SELECT exercise_id FROM exercises WHERE exercise = 'Dumbbell Shoulder Press 3x8')),
    (1, (SELECT exercise_id FROM exercises WHERE exercise = 'One-Arm Dumbbell Row 3x10')),
    (1, (SELECT exercise_id FROM exercises WHERE exercise = 'Dumbbell Lateral Raise 3x12')),

    (2, (SELECT exercise_id FROM exercises WHERE exercise ='Bulgarian Split Squat 3x8')),
    (2, (SELECT exercise_id FROM exercises WHERE exercise ='Dumbbell Step-Up 3x8')),
    (2, (SELECT exercise_id FROM exercises WHERE exercise ='Dumbbell Romanian Deadlift 3x10')),
    (2, (SELECT exercise_id FROM exercises WHERE exercise ='Dumbbell Hip Thrust 3x10')),
    (2, (SELECT exercise_id FROM exercises WHERE exercise = 'Vertical Jump 3x8')),

    (3, (SELECT exercise_id FROM exercises WHERE exercise ='Incline Dumbbell Bench Press 4x8')),
    (3, (SELECT exercise_id FROM exercises WHERE exercise ='Chin-Ups 4x6')),
    (3, (SELECT exercise_id FROM exercises WHERE exercise ='Dumbbell Bench Press 3x10')),
    (3, (SELECT exercise_id FROM exercises WHERE exercise ='Chest-Supported Dumbbell Row 3x10')),
    (3, (SELECT exercise_id FROM exercises WHERE exercise = 'Dumbbell Curl 3x10')),

    (4, (SELECT exercise_id FROM exercises WHERE exercise ='Reverse Lunge 3x8')),
    (4, (SELECT exercise_id FROM exercises WHERE exercise ='Goblet Squat 3x10')),
    (4, (SELECT exercise_id FROM exercises WHERE exercise ='Dumbbell Hip Thrust 3x10')),
    (4, (SELECT exercise_id FROM exercises WHERE exercise ='Balance Ball Hamstring Curl 3x12')),
    (4, (SELECT exercise_id FROM exercises WHERE exercise ='Lateral Bound 3x8')),

    (5, (SELECT exercise_id FROM exercises WHERE exercise ='Weighted/BW Pull-Up 4x6')),
    (5, (SELECT exercise_id FROM exercises WHERE exercise ='Weighted/BW Dip 4x8')),
    (5, (SELECT exercise_id FROM exercises WHERE exercise ='Incline Dumbbell Bench Press 3x10')),
    (5, (SELECT exercise_id FROM exercises WHERE exercise ='Inverted Row 3x10')),
    (5, (SELECT exercise_id FROM exercises WHERE exercise ='Dumbbell Lateral Raise 3x12')),

    (6, (SELECT exercise_id FROM exercises WHERE exercise ='Broad Jump 3x4')),
    (6, (SELECT exercise_id FROM exercises WHERE exercise ='Bulgarian Split Squat 3x8')),
    (6, (SELECT exercise_id FROM exercises WHERE exercise ='Push-Ups 3x12')),
    (6, (SELECT exercise_id FROM exercises WHERE exercise = 'Pull-Ups 3x6')),
    (6, (SELECT exercise_id FROM exercises WHERE exercise = 'Farmer Carry 3x40 (sec)'))
ON CONFLICT(day, exerciseRef) DO NOTHING;