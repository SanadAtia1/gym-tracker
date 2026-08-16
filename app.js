const express = require('express');
const app = express();
const database = require('better-sqlite3');
const db = require('./db.js');


// const deleteStatement = db.prepare('DELETE FROM exercises WHERE exercise_id = ?');
// deleteStatement.run(1);
// const update = db.prepare('UPDATE days SET day = ? WHERE ID = ?');
// update.run('updated', 2);
// const rows2 = db.prepare('SELECT * FROM exercises').all();
// console.log(rows2);
// const rows3 = db.prepare('SELECT * FROM junction').all();
// console.log(rows3);


app.get('/', (req, res) => {
    res.send('Hello, sanad\'s gym tracker!');
});

app.get('/days/:dayNum', (req, res) => {
    const dayNum = req.params.dayNum;
    if (dayNum > 0 && dayNum < 7) {
        const dayQuery = db.prepare(`
        SELECT e.exercise
        FROM exercises e 
        JOIN junction j ON j.exerciseRef = e.exercise_id 
        WHERE j.day = ?
        `).all(dayNum);
    
        res.json(dayQuery);
    } else {
        res.send('No workouts on this day!');
    }
});

app.listen(3000, () => {
    console.log('Server is running on http://localhost:3000');
});

