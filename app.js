const express = require('express');
const app = express();
const database = require('better-sqlite3');
const db = require('./db.js');


// const deleteStatement = db.prepare('DELETE FROM exercises WHERE exercise_id = ?');
// deleteStatement.run(1);

// const update = db.prepare('UPDATE days SET day = ? WHERE ID = ?');
// update.run('updated', 2);
const rows = db.prepare('SELECT * FROM days').all();
console.log(rows);
const rows2 = db.prepare('SELECT * FROM exercises').all();
console.log(rows2);

// app.get('/', (req, res) => {
//     res.send('Hello, sanad\'s gym tracker!');
// });

// app.listen(3000, () => {
//     console.log('Server is running on http://localhost:3000');
// });

