const express = require('express');
const app = express();
const database = require('better-sqlite3');
const db = require('./db.js');

const rows2 = db.prepare('SELECT * FROM sessions').all();
console.log(rows2);
const rows3 = db.prepare('SELECT * FROM logs').all();
console.log(rows3);

app.use(express.static('public'));
app.use(express.json());

// view exercises by day
app.get('/days/:day', (req, res) => {
    const dayNum = req.params.day;
    if (dayNum > 0 && dayNum < 7) {
        const dayQuery = db.prepare(`
            WITH ranked AS (
            SELECT e.exercise, e.exercise_id, l.weight, l.reps,
            ROW_NUMBER() OVER (PARTITION BY e.exercise_id ORDER BY s.date DESC, l.id DESC) AS rn
            FROM exercises e
            JOIN junction j ON j.exerciseRef = e.exercise_id 
            LEFT JOIN logs l ON l.exerciseRef = e.exercise_id
            LEFT JOIN sessions s ON s.session_id = l.sessionRef
            WHERE j.day = ?
            )
            SELECT *
            FROM ranked
            WHERE rn = 1;
        `).all(dayNum);
    
        res.json(dayQuery);
    } else {
        res.json({message: 'Error: invalid choice'});
    }
});

// create new session
app.post('/sessions', (req, res) => {
    const day = req.body.day;
    const dupSess = db.prepare('SELECT * FROM sessions s WHERE date = CURRENT_DATE').all();
    if (dupSess.length > 0) {
        res.json({
            duplicate: true,
            message: 'Delete existing session to create new one'
        });
        return;
    }
    const createSession = db.prepare('INSERT INTO sessions (dayLogged) VALUES (?)').run(day);
    res.json({
        duplicate: false,
        message: 'Session created',
        sessID: createSession.lastInsertRowid
    });
  });

// create log entries
app.post('/logs', (req, res) => {
    const { sessionID, exerciseID, weight, reps } = req.body;
    if (weight.trim() === '' || reps.trim() === '') {
        res.json({ 
            success: false,
            message:'Invalid input(s)'
        });
        return;
    }
    const createLog = db.prepare('INSERT INTO logs (sessionRef, exerciseRef, weight, reps) VALUES (?, ?, ?, ?)').run(sessionID, exerciseID, weight, reps);
    res.json({
        success: true,
        logID: createLog.lastInsertRowid
        
    });
  });

// view logs by date
app.get('/sessions/:date', (req, res) => {
    const sessionDate = req.params.date;
    const checkSession = db.prepare('SELECT * FROM sessions WHERE date = ?').get(sessionDate);
    if (checkSession) {
        const printLogInfo = db.prepare(`
            SELECT e.exercise, l.weight, l.reps, s.date, l.id, s.session_id, s.dayLogged
            FROM exercises e
            JOIN logs l ON l.exerciseRef = e.exercise_id
            JOIN sessions s ON s.session_id = l.sessionRef
            WHERE s.date = ?
        `).all(sessionDate);
        
        if (printLogInfo.length > 0) { 
            res.json({
                sessionExists: true,
                logsExist: true,
                logs: printLogInfo,
            });
        } else {
            res.json({
                sessionExists: true,
                logsExist: false,
                session: checkSession
            });
        }
        return;
    } else {
        res.json({
            sessionExists: false,
            message: 'No sessiom created for this date'
        })
    }
});

app.get('/sessions/:id/exercises', (req, res) => {
    const sessionID = req.params.id;
    const printEmptyLogs = db.prepare(`
        SELECT e.exercise, l.weight, l.reps, s.date, l.id, s.dayLogged
        FROM exercises e
        JOIN junction j ON j.exerciseRef = e.exercise_id 
        LEFT JOIN logs l ON l.exerciseRef = e.exercise_id AND l.sessionRef = ?
        JOIN sessions s ON s.session_id = l.sessionRef
        WHERE s.session_id = ?
    `).all(sessionID, sessionID);

    console.log(printEmptyLogs);
});



// delete empty sessions
app.delete('/sessions/:id', (req, res) => {
    const sessionID = req.params.id;
    const hasLogs = db.prepare('SELECT * FROM logs WHERE sessionRef = ?').all(sessionID);
    if (hasLogs.length > 0) {
        res.json({
            logsExist: true,
            message: 'Cannot delete session containing logs'
        });
        return;
    }
    const deleteSession = db.prepare('DELETE FROM sessions WHERE session_id = ?');
    const delInfo = deleteSession.run(sessionID);

    if (delInfo.changes > 0){
        res.json({
            logsExist: false,
            message: `Session ${sessionID} deleted`
        });
    } else {
        res.json({
            logsExist: false,
            message: 'No session deleted'
        });
    }

});

// delete logs
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

// update logs
app.patch('/logs/:id', (req, res) => {
    const logID = req.params.id;
    const { weight, reps } = req.body;
    // let updInfo = undefined;

    if (!weight && !reps) {
        res.json({ 
            success: false,
            message:'No valid entries provided.'
        });
        return;
    } else if (!weight) {
        const updateLog = db.prepare('UPDATE logs SET reps = ? WHERE ID = ?');
        updateLog.run(reps, logID);
    } else if (!reps) {
        const updateLog = db.prepare('UPDATE logs SET weight = ? WHERE ID = ?');
        updateLog.run(weight, logID);
    } else {
        const updateLog = db.prepare('UPDATE logs SET weight = ?, reps = ? WHERE ID = ?');
        updateLog.run(weight, reps, logID);
    }

    res.json({ 
        success: true,
        message: `Log ${logID} updated` 
    });
});

app.listen(3000, () => {
    console.log('Server is running on http://localhost:3000');
});

// curl -X PATCH http://localhost:3000/logs/2 -H "Content-Type: application/json" -d '{"weight": "300", "reps": "15"}'
// curl -X DELETE http://localhost:3000/logs/1
// curl --json '{"sessionID": "1", "exerciseID": "1", "weight": "225", "reps": "20"}' http://localhost:3000/logs
// curl --json '{"day": "4"}' http://localhost:3000/sessions