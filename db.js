const fs = require('node:fs');
const path = require('node:path');
const database = require('better-sqlite3');
const dbPath = process.env.DB_PATH || path.join(__dirname, 'gym.db');
const db = new database(dbPath);

function columnNames(table) {
    return new Set(
        db.prepare(`PRAGMA table_info(${table})`).all().map((column) => column.name)
    );
}

// Older databases stored targets on exercises, which blocked the same lift from
// having different set/rep prescriptions on different split days. Move those
// columns onto junction and backfill existing day assignments.
function migrateDayTargets() {
    const junctionColumns = columnNames('junction');
    if (!junctionColumns.has('target_sets')) {
        db.exec('ALTER TABLE junction ADD COLUMN target_sets INTEGER CHECK (target_sets > 0)');
    }
    if (!junctionColumns.has('target_reps')) {
        db.exec('ALTER TABLE junction ADD COLUMN target_reps INTEGER CHECK (target_reps > 0)');
    }

    const exerciseColumns = columnNames('exercises');
    if (exerciseColumns.has('target_sets') && exerciseColumns.has('target_reps')) {
        db.prepare(`
            UPDATE junction
            SET
                target_sets = COALESCE(
                    target_sets,
                    (SELECT target_sets FROM exercises WHERE exercise_id = junction.exerciseRef)
                ),
                target_reps = COALESCE(
                    target_reps,
                    (SELECT target_reps FROM exercises WHERE exercise_id = junction.exerciseRef)
                )
            WHERE target_sets IS NULL OR target_reps IS NULL
        `).run();
    }
}

try {
    db.pragma('foreign_keys = ON');
    db.pragma('journal_mode = WAL');

    const schema = fs.readFileSync(path.join(__dirname, 'schema.sql'), 'utf8');
    db.exec(schema);
    migrateDayTargets();
    console.log('Schema executed successfully.');
} catch (error) {
    console.error('Error executing schema:', error);
    throw error;
}


module.exports = db;
