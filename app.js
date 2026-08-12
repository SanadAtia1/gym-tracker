const express = require('express');
const app = express();
const database = require('better-sqlite3');
const db = require('./db.js');

// db.exec('CREATE TABLE IF NOT EXISTS sessions (id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT UNIQUE NOT NULL)');
// const insert = db.prepare('INSERT INTO days (name) VALUES (?)');

// db.exec('CREATE TABLE IF NOT EXISTS days (id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT UNIQUE NOT NULL)');
// const insert = db.prepare('INSERT INTO days (name) VALUES (?)');
// repopulate for version control
// insert.run('Day 1');
// insert.run('Day 2');
// insert.run('Day 3');
// insert.run('Day 4');
// insert.run('Day 5');
// insert.run('Day 6');

// db.exec('CREATE TABLE IF NOT EXISTS exercises (id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT, reps TEXT)');
// const insert2 = db.prepare('INSERT INTO exercises (name, reps) VALUES (?, ?');
// repopulate for version control
// insert2.run('Back Squat', '4x5');
// insert.run('Bench Press', '4x5');
// insert.run('Barbell Row', '3x8');
// insert.run('DB Overhead Press', '3x10');
// insert.run('Deadlift', '4x5');
// insert.run('Chin-ups', '4x8');
// insert.run('Incline DB Press', '3x8');
// insert.run('Curls', '3x12');
// insert.run('Bulgarian Split Squat', '3x8');
// insert.run('Overhead Press', '4x6');
// insert.run('Romanian Deadlift', '3x10');
// insert.run('Cable Row', '3x12');
// insert.run('Romanian Deadlift', '3x8');
// insert.run('Pull-ups', '3x8');
// insert.run('Bulgarian Split Squat', '3x12');
// insert.run('Incline DB Press', '3x12');
// insert.run('Lat Pulldown', '3x15');
// insert.run('Lateral Raise', '3x15');
// insert.run('Cable Curls +  Tricep Pushdowns', '3x15');
// insert.run('DB Snatch', '3x6');
// insert.run('Chin-ups', '3x10');




// const deleteStatement = db.prepare('DELETE FROM days WHERE id = ?');
// deleteStatement.run(2);

// const update = db.prepare('UPDATE days SET day = ? WHERE ID = ?');
// update.run('updated', 2);
const rows = db.prepare('SELECT * FROM days').all();
console.log(rows);

// app.get('/', (req, res) => {
//     res.send('Hello, sanad\'s gym tracker!');
// });

// app.listen(3000, () => {
//     console.log('Server is running on http://localhost:3000');
// });

