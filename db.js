const fs = require('node:fs');
const path = require('node:path');
const database = require('better-sqlite3');
const dbPath = process.env.DB_PATH || path.join(__dirname, 'gym.db');
const db = new database(dbPath);

try {
    db.pragma('foreign_keys = ON');
    db.pragma('journal_mode = WAL');

    const schema = fs.readFileSync(path.join(__dirname, 'schema.sql'), 'utf8');
    db.exec(schema);
    console.log('Schema executed successfully.');
} catch (error) {
    console.error('Error executing schema:', error);
    throw error;
}


module.exports = db;