const fs = require('node:fs');
const database = require('better-sqlite3');
const db = new database('gym.db');

try {
    const schema = fs.readFileSync('./schema.sql', 'utf8');
    db.exec(schema);
    console.log('Schema executed successfully.');
} catch (error) {
    console.error('Error executing schema:', error);
}

try {
    const seed = fs.readFileSync('./seed.sql', 'utf8');
    db.exec(seed);
    console.log('Seed executed successfully.');
} catch (error) {
    console.error('Error executing seed:', error);
}


module.exports = db;