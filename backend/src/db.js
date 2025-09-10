const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');
const { seedDatabase } = require('./seed');

const dbPath = process.env.DATABASE_PATH || path.join(__dirname, '..', 'database', 'database.sqlite');
const dbDir = path.dirname(dbPath);

if (!fs.existsSync(dbDir)) {
  fs.mkdirSync(dbDir, { recursive: true });
}

const db = new Database(dbPath, { 
  verbose: process.env.NODE_ENV === 'development' ? console.log : null 
});

db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');
db.pragma('synchronous = NORMAL');

function initDatabase(fastify) {
  try {
    fastify.log.info(`📂 Initialisation de la base de données : ${dbPath}`);
    
    // ========================================
    // TABLE USERS - Gestion des utilisateurs
    // ========================================
    db.exec(`
      CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        username TEXT UNIQUE NOT NULL,
        email TEXT UNIQUE, -- Email optionnel pour comptes locaux
        password TEXT NOT NULL,
        display_name TEXT,
        avatar_url TEXT,
        status TEXT NOT NULL DEFAULT 'offline',
        is_admin BOOLEAN DEFAULT FALSE,
        email_verified BOOLEAN DEFAULT FALSE,
        
        -- OAuth fields
        oauth_provider TEXT,
        oauth_id TEXT,
        
        -- 2FA fields
        two_factor_enabled BOOLEAN DEFAULT FALSE,
        two_factor_secret TEXT,
        two_factor_temp_secret TEXT, -- Temporary secret during setup
        two_factor_backup_codes TEXT, -- JSON array of hashed backup codes
        
        -- Stats
        games_played INTEGER DEFAULT 0,
        games_won INTEGER DEFAULT 0,
        total_score INTEGER DEFAULT 0,
        
        -- Timestamps
        created_at TEXT DEFAULT CURRENT_TIMESTAMP,
        updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
        last_login TEXT,
        last_logout TEXT,
        
        UNIQUE(oauth_provider, oauth_id)
      )
    `);

    // ========================================
    // TABLE FRIENDS - Relations d'amitié  
    // ========================================
    db.exec(`
      CREATE TABLE IF NOT EXISTS friends (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        friend_id INTEGER NOT NULL,
        status TEXT NOT NULL DEFAULT 'pending', -- pending, accepted, blocked
        created_at TEXT DEFAULT CURRENT_TIMESTAMP,
        accepted_at TEXT,
        
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
        FOREIGN KEY (friend_id) REFERENCES users(id) ON DELETE CASCADE,
        UNIQUE(user_id, friend_id)
      )
    `);

    // ========================================
    // TABLE TOURNAMENTS - Système de tournois
    // ========================================
    db.exec(`
      CREATE TABLE IF NOT EXISTS tournaments (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        description TEXT,
        max_players INTEGER NOT NULL DEFAULT 8,
        current_players INTEGER DEFAULT 0,
        status TEXT NOT NULL DEFAULT 'waiting', -- waiting, active, completed, cancelled
        format TEXT NOT NULL DEFAULT 'elimination', -- elimination, round_robin
        created_by INTEGER NOT NULL,
        winner_id INTEGER,
        
        -- Timestamps
        created_at TEXT DEFAULT CURRENT_TIMESTAMP,
        started_at TEXT,
        ended_at TEXT,
        
        FOREIGN KEY (created_by) REFERENCES users(id),
        FOREIGN KEY (winner_id) REFERENCES users(id)
      )
    `);

    // ========================================
    // TABLE TOURNAMENT_PARTICIPANTS
    // ========================================
    db.exec(`
      CREATE TABLE IF NOT EXISTS tournament_participants (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        tournament_id INTEGER NOT NULL,
        user_id INTEGER NOT NULL,
        position INTEGER, -- Final position in tournament
        eliminated_at TEXT,
        
        FOREIGN KEY (tournament_id) REFERENCES tournaments(id) ON DELETE CASCADE,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
        UNIQUE(tournament_id, user_id)
      )
    `);

    // ========================================
    // TABLE GAMES - Parties individuelles
    // ========================================
    db.exec(`
      CREATE TABLE IF NOT EXISTS games (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        tournament_id INTEGER, -- NULL si partie libre
        
        -- Players
        player1_id INTEGER NOT NULL,
        player2_id INTEGER,
        ai_opponent BOOLEAN DEFAULT FALSE,
        ai_level INTEGER, -- 1-5 difficulty
        
        -- Game settings
        game_mode TEXT NOT NULL DEFAULT 'classic', -- classic, custom, multiplayer
        max_score INTEGER DEFAULT 5,
        match_type TEXT DEFAULT 'regular', -- regular, semifinal, third_place, final
        
        -- Scores
        score_player1 INTEGER DEFAULT 0,
        score_player2 INTEGER DEFAULT 0,
        winner_id INTEGER,
        
        -- Game state
        status TEXT NOT NULL DEFAULT 'waiting', -- waiting, playing, paused, completed, abandoned
        
        -- Duration
        start_time TEXT,
        end_time TEXT,
        duration INTEGER, -- in seconds
        
        -- Timestamps
        created_at TEXT DEFAULT CURRENT_TIMESTAMP,
        
        FOREIGN KEY (tournament_id) REFERENCES tournaments(id),
        FOREIGN KEY (player1_id) REFERENCES users(id),
        FOREIGN KEY (player2_id) REFERENCES users(id),
        FOREIGN KEY (winner_id) REFERENCES users(id)
      )
    `);

    // ========================================
    // TABLE MATCH_HISTORY - Historique détaillé
    // ========================================
    db.exec(`
      CREATE TABLE IF NOT EXISTS match_history (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        game_id INTEGER NOT NULL,
        user_id INTEGER NOT NULL,
        opponent_id INTEGER,
        opponent_type TEXT DEFAULT 'human', -- human, ai
        
        result TEXT NOT NULL, -- win, loss, draw
        score_for INTEGER NOT NULL,
        score_against INTEGER NOT NULL,
        
        -- Performance metrics
        reaction_time_avg REAL,
        shots_made INTEGER DEFAULT 0,
        shots_missed INTEGER DEFAULT 0,
        
        played_at TEXT DEFAULT CURRENT_TIMESTAMP,
        
        FOREIGN KEY (game_id) REFERENCES games(id) ON DELETE CASCADE,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
        FOREIGN KEY (opponent_id) REFERENCES users(id) ON DELETE SET NULL
      )
    `);

    // ========================================
    // TABLE USER_SESSIONS - Gestion des sessions
    // ========================================
    db.exec(`
      CREATE TABLE IF NOT EXISTS user_sessions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        session_token TEXT UNIQUE NOT NULL,
        refresh_token TEXT UNIQUE,
        device_info TEXT, -- JSON with device details
        ip_address TEXT,
        expires_at TEXT NOT NULL,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP,
        last_used TEXT DEFAULT CURRENT_TIMESTAMP,
        is_active BOOLEAN DEFAULT TRUE,
        
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      )
    `);

    // ========================================
    // TABLE TOKEN_BLACKLIST - Tokens invalidés
    // ========================================
    db.exec(`
      CREATE TABLE IF NOT EXISTS token_blacklist (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        token_id TEXT UNIQUE NOT NULL,
        user_id INTEGER,
        reason TEXT DEFAULT 'logout',
        invalidated_at TEXT DEFAULT CURRENT_TIMESTAMP,
        expires_at TEXT,
        
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      )
    `);

    // ========================================
    // TABLE OAUTH_PROVIDERS - Comptes OAuth liés
    // ========================================
    db.exec(`
      CREATE TABLE IF NOT EXISTS oauth_providers (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        provider TEXT NOT NULL, -- google, github, etc.
        provider_id TEXT NOT NULL, -- ID unique chez le provider
        email TEXT, -- Email du compte OAuth
        provider_data TEXT, -- JSON avec données additionnelles (avatar, nom, etc.)
        linked_at TEXT DEFAULT CURRENT_TIMESTAMP,
        last_used TEXT DEFAULT CURRENT_TIMESTAMP,
        
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
        UNIQUE(provider, provider_id),
        UNIQUE(user_id, provider)
      )
    `);

    // ========================================
    // INDEX POUR PERFORMANCE
    // ========================================
    db.exec(`
      CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);
      CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
      CREATE INDEX IF NOT EXISTS idx_users_oauth ON users(oauth_provider, oauth_id);
      CREATE INDEX IF NOT EXISTS idx_friends_user_id ON friends(user_id);
      CREATE INDEX IF NOT EXISTS idx_friends_friend_id ON friends(friend_id);
      CREATE INDEX IF NOT EXISTS idx_games_player1 ON games(player1_id);
      CREATE INDEX IF NOT EXISTS idx_games_player2 ON games(player2_id);
      CREATE INDEX IF NOT EXISTS idx_games_tournament ON games(tournament_id);
      CREATE INDEX IF NOT EXISTS idx_match_history_user ON match_history(user_id);
      CREATE INDEX IF NOT EXISTS idx_match_history_played_at ON match_history(played_at);
      CREATE INDEX IF NOT EXISTS idx_sessions_user ON user_sessions(user_id);
      CREATE INDEX IF NOT EXISTS idx_sessions_token ON user_sessions(session_token);
      CREATE INDEX IF NOT EXISTS idx_blacklist_token_id ON token_blacklist(token_id);
      CREATE INDEX IF NOT EXISTS idx_blacklist_user_id ON token_blacklist(user_id);
      CREATE INDEX IF NOT EXISTS idx_oauth_providers_user ON oauth_providers(user_id);
      CREATE INDEX IF NOT EXISTS idx_oauth_providers_provider ON oauth_providers(provider, provider_id);
    `);

    // ========================================
    // TRIGGERS POUR AUTO-UPDATE
    // ========================================
    db.exec(`
      CREATE TRIGGER IF NOT EXISTS update_users_timestamp 
      AFTER UPDATE ON users
      BEGIN
        UPDATE users SET updated_at = datetime('now') WHERE id = NEW.id;
      END;
    `);

    db.exec(`
      CREATE TRIGGER IF NOT EXISTS update_user_stats_on_game_complete
      AFTER UPDATE OF status ON games
      WHEN NEW.status = 'completed' AND OLD.status != 'completed'
      BEGIN
        -- Update player1 stats
        UPDATE users 
        SET games_played = games_played + 1,
            games_won = CASE WHEN NEW.winner_id = NEW.player1_id THEN games_won + 1 ELSE games_won END,
            total_score = total_score + NEW.score_player1
        WHERE id = NEW.player1_id;
        
        -- Update player2 stats (if not AI)
        UPDATE users 
        SET games_played = games_played + 1,
            games_won = CASE WHEN NEW.winner_id = NEW.player2_id THEN games_won + 1 ELSE games_won END,
            total_score = total_score + NEW.score_player2
        WHERE id = NEW.player2_id AND NEW.ai_opponent = FALSE;
      END;
    `);

    db.exec(`
      CREATE TRIGGER IF NOT EXISTS update_user_stats_on_game_insert
      AFTER INSERT ON games
      WHEN NEW.status = 'completed'
      BEGIN
        -- Update player1 stats
        UPDATE users 
        SET games_played = games_played + 1,
            games_won = CASE WHEN NEW.winner_id = NEW.player1_id THEN games_won + 1 ELSE games_won END,
            total_score = total_score + NEW.score_player1
        WHERE id = NEW.player1_id;
        
        -- Update player2 stats (if not AI)
        UPDATE users 
        SET games_played = games_played + 1,
            games_won = CASE WHEN NEW.winner_id = NEW.player2_id THEN games_won + 1 ELSE games_won END,
            total_score = total_score + NEW.score_player2
        WHERE id = NEW.player2_id AND NEW.ai_opponent = 0;
      END;
    `);

    fastify.log.info('✅ Tables de la base de données créées/vérifiées avec succès');
    fastify.log.info(`📊 Base de données prête : ${db.name}`);
    
    // ========================================
    // MIGRATIONS - Ajout de colonnes manquantes
    // ========================================
    try {
      const columns = db.prepare("PRAGMA table_info(games)").all();
      const hasMatchType = columns.some(col => col.name === 'match_type');
      
      if (!hasMatchType) {
        fastify.log.info('🔄 Migration: Ajout de la colonne match_type à la table games');
        db.exec(`ALTER TABLE games ADD COLUMN match_type TEXT DEFAULT 'regular'`);
      }
    } catch (err) {
      fastify.log.error('⚠️ Erreur lors des migrations:', err);
    }
    
    if (process.env.NODE_ENV !== 'production') {
      seedDatabase(db, fastify.log).catch(err => {
        fastify.log.error('Erreur lors du seed:', err);
      });
    }
    
    return db;
    
  } catch (err) {
    fastify.log.error('❌ Erreur lors de l\'initialisation de la base de données:', err);
    console.error('💥 Détail de l\'erreur DB:', err);
    process.exit(1);
  }
}

function closeDatabase() {
  if (db) {
    db.close();
    console.log('🔒 Connexion à la base de données fermée');
  }
}

module.exports = {
  db,
  initDatabase,
  closeDatabase
};