const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');

const dbPath = process.env.DATABASE_PATH || path.join(__dirname, '..', 'database', 'database.sqlite');
const dbDir = path.dirname(dbPath);

if (!fs.existsSync(dbDir)) {
  fs.mkdirSync(dbDir, { recursive: true });
}

const db = new Database(dbPath);

function initDatabase(fastify) {
  try {
    fastify.log.info('Connexion à la base de données établie.');
    
    // users
    db.exec(`
      CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        username TEXT UNIQUE NOT NULL,
        password TEXT NOT NULL,
        email TEXT UNIQUE NOT NULL,
		status TEXT NOT NULL DEFAULT 'offline',
        created_at TEXT DEFAULT CURRENT_TIMESTAMP
      )
    `);
    fastify.log.info('Table des utilisateurs vérifiée/créée.');

    // games
    db.exec(`
      CREATE TABLE IF NOT EXISTS games (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        player1_id INTEGER NOT NULL,
        player2_id INTEGER,
        game_mode TEXT NOT NULL,
        score_player1 INTEGER DEFAULT 0,
        score_player2 INTEGER DEFAULT 0,
        winner_id INTEGER,
        start_time TEXT NOT NULL,
        end_time TEXT,
        status TEXT NOT NULL,
        FOREIGN KEY (player1_id) REFERENCES users(id),
        FOREIGN KEY (player2_id) REFERENCES users(id),
        FOREIGN KEY (winner_id) REFERENCES users(id)
      );
    `);
    fastify.log.info('Table des parties vérifiée/créée.');
    
    return db;
  } catch (err) {
    fastify.log.error('Erreur de connexion à la base de données : ' + err.message);
    process.exit(1);
  }
}

module.exports = {
  db,
  initDatabase
};