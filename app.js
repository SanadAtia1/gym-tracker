const express = require('express');
const app = express();
const database = require('better-sqlite3');
const db = require('./db.js');

// const rows2 = db.prepare('SELECT * FROM sessions').all();
// console.log(rows2);
const rows3 = db.prepare('SELECT * FROM logs').all();
console.log(rows3);

app.use(express.json());

app.get('/', (req, res) => {
    res.send('Hello, sanad\'s gym tracker!');
});

// view workouts on a given day
app.get('/days/:day', (req, res) => {
    const dayNum = req.params.day;
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

// start new session
app.post('/sessions', (req, res) => {
    const day = req.body.day;
    const createSession = db.prepare('INSERT INTO sessions (dayLogged) VALUES (?)');
    const sessID = createSession.run(day);
    res.json(sessID.lastInsertRowid);
  });

// new log entries
app.post('/logs', (req, res) => {
    const { sessionID, exerciseID, weight, reps } = req.body;
    const createLog = db.prepare('INSERT INTO logs (sessionRef, exerciseRef, weight, reps) VALUES (?, ?, ?, ?)');
    const logID = createLog.run(sessionID, exerciseID, weight, reps);
    res.json(logID.lastInsertRowid);
  });

// view logs on a given date
app.get('/sessions/:date', (req, res) => {
    const sessDate = req.params.date;
    const viewSess = db.prepare(`
        SELECT e.exercise, l.weight, l.reps, s.date, l.id
        FROM exercises e
        JOIN logs l ON l.exerciseRef = e.exercise_id
        JOIN sessions s ON s.session_id = l.sessionRef
        WHERE s.date = ?
        `).all(sessDate);

        res.json(viewSess);
});

// delete log entry
app.delete('/logs/:id', (req, res) => {
    const logID = req.params.id;
    const deleteLog = db.prepare('DELETE FROM logs WHERE id = ?');
    const delInfo = deleteLog.run(logID);

    if (delInfo.changes > 0) {
        res.json({ message: `Log ${logID} deleted` }); 
    }else {
        res.json({ message: 'No changes' });
    }
});

// update existing log entry
app.patch('/logs/:id', (req, res) => {
    const logID = req.params.id;
    const { weight, reps } = req.body;
    let updInfo = undefined;

    if (weight == undefined && reps == undefined){
        res.json({ message: 'No values entered.' });
    } else if (weight == undefined) {
        const updateLog = db.prepare('UPDATE logs SET reps = ? WHERE ID = ?');
        updInfo = updateLog.run(reps, logID);
    } else if (reps == undefined) {
        const updateLog = db.prepare('UPDATE logs SET weight = ? WHERE ID = ?');
        updInfo = updateLog.run(weight, logID);
    } else {
        const updateLog = db.prepare('UPDATE logs SET weight = ?, reps = ? WHERE ID = ?');
        updInfo = updateLog.run(weight, reps, logID);
    }

    if (updInfo.changes > 0) {
        res.json({ message: `Log ${logID} updated` });
    } else {
        res.json({ message: 'No changes' });
    }
});

app.listen(3000, () => {
    console.log('Server is running on http://localhost:3000');
});

// curl -X PATCH http://localhost:3000/logs/2 -H "Content-Type: application/json" -d '{"weight": "300", "reps": "15"}'
// curl -X DELETE http://localhost:3000/logs/1
// curl --json '{"sessionID": "1", "exerciseID": "1", "weight": "225", "reps": "20"}' http://localhost:3000/logs
// curl --json '{"day": "4"}' http://localhost:3000/sessions