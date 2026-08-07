const express = require('express');
const app = express();
const database = require('better-sqlite3');
const db = new database('gym.db');

db.exec('CREATE TABLE IF NOT EXISTS testTable (id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT, password TEXT)');
const insert = db.prepare('INSERT INTO testTable (name, password) VALUES (?, ?)');
// insert.run('sanad', '123456');
// insert.run('john', '654321');
const deleteStatement = db.prepare('DELETE FROM testTable WHERE id = ?');
deleteStatement.run(5);
const update = db.prepare('UPDATE testTable SET ID = ? WHERE name = ?');
update.run(1, 'testing');
const rows = db.prepare('SELECT * FROM testTable').all();
console.log(rows);

// app.get('/', (req, res) => {
//     res.send('Hello, sanad\'s gym tracker!');
// });

// app.listen(3000, () => {
//     console.log('Server is running on http://localhost:3000');
// });

