const bcrypt = require('bcrypt');

/**
 * Données de seed pour le développement
 * Crée des utilisateurs et des parties de test
 */

const SEED_USERS = [
  {
    username: 'alice',
    email: 'alice@example.com',
    password: 'Alice123!',
    display_name: 'Alice Champion',
    status: 'online'
  },
  {
    username: 'bob',
    email: 'bob@example.com', 
    password: 'BobPong123!',
    display_name: 'Bob Master',
    status: 'offline'
  },
  {
    username: 'test',
    email: 'test@example.com', 
    password: 'Test123!',
    display_name: 'Test Master',
    status: 'offline'
  },
  {
    username: 'charlie',
    password: 'Charlie456!', // Compte sans email
    display_name: 'Charlie Rookie',
    status: 'in_game'
  }
];

const SEED_GAMES = [
  {
    player1_id: 1, // alice
    player2_id: 2, // bob
    winner_id: 1,
    score_player1: 11,
    score_player2: 7,
    duration: 180, // 3 minutes
    game_mode: 'classic'
  },
  {
    player1_id: 2, // bob
    player2_id: 3, // charlie
    winner_id: 2,
    score_player1: 11,
    score_player2: 9,
    duration: 240,
    game_mode: 'classic'
  },
  {
    player1_id: 1, // alice
    player2_id: 3, // charlie
    winner_id: 1,
    score_player1: 11,
    score_player2: 5,
    duration: 150,
    game_mode: 'custom'
  },
  {
    player1_id: 2, // bob
    player2_id: 1, // alice
    winner_id: 1,
    score_player1: 8,
    score_player2: 11,
    duration: 200,
    game_mode: 'classic'
  }
];

const SEED_FRIENDSHIPS = [
  { user_id: 1, friend_id: 2, status: 'accepted' }, // alice <-> bob
  { user_id: 2, friend_id: 1, status: 'accepted' },
  { user_id: 1, friend_id: 3, status: 'accepted' }, // alice <-> charlie
  { user_id: 3, friend_id: 1, status: 'accepted' },
  { user_id: 2, friend_id: 3, status: 'pending' }   // bob -> charlie (pending)
];

/**
 * Initialise les données de seed
 * @param {Object} db - Instance de base de données SQLite
 * @param {Object} logger - Logger Fastify
 */
async function seedDatabase(db, logger) {
  try {
    logger.info('🌱 Initialisation des données de seed...');

    // Vérifier si des utilisateurs existent déjà
    const existingUsers = db.prepare('SELECT COUNT(*) as count FROM users').get();
    if (existingUsers.count > 0) {
      logger.info('📊 Données de seed déjà présentes, skip');
      return;
    }

    // ============ SEED USERS ============
    logger.info('👥 Création des utilisateurs de test...');
    const insertUser = db.prepare(`
      INSERT INTO users (username, email, password, display_name, status, created_at)
      VALUES (?, ?, ?, ?, ?, datetime('now'))
    `);

    for (const user of SEED_USERS) {
      const hashedPassword = await bcrypt.hash(user.password, 12);
      insertUser.run(
        user.username,
        user.email || null,
        hashedPassword,
        user.display_name,
        user.status
      );
      logger.info(`✅ Utilisateur créé: ${user.username}`);
    }

    // ============ SEED GAMES ============
    logger.info('🎮 Creation des parties de test...');
    const insertGame = db.prepare(`
      INSERT INTO games (
        player1_id, player2_id, winner_id, 
        score_player1, score_player2, duration,
        game_mode, status, start_time, end_time, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, 'completed', datetime('now', '-' || ? || ' days'), datetime('now', '-' || ? || ' days', '+' || ? || ' seconds'), datetime('now', '-' || ? || ' days'))
    `);

    SEED_GAMES.forEach((game, index) => {
      const daysAgo = Math.floor(Math.random() * 7) + 1; // 1-7 jours
      insertGame.run(
        game.player1_id,
        game.player2_id,
        game.winner_id,
        game.score_player1,
        game.score_player2,
        game.duration,
        game.game_mode,
        daysAgo, // start_time offset
        daysAgo, // end_time offset  
        game.duration, // duration in seconds
        daysAgo // created_at offset
      );
      logger.info(`✅ Partie creee: ${game.game_mode} (${game.score_player1}-${game.score_player2})`);
    });

    // ============ SEED FRIENDSHIPS ============
    logger.info('👫 Creation des relations d\'amitie...');
    const insertFriendship = db.prepare(`
      INSERT INTO friends (user_id, friend_id, status, created_at, accepted_at)
      VALUES (?, ?, ?, datetime('now'), ?)
    `);

    SEED_FRIENDSHIPS.forEach(friendship => {
      const acceptedAt = friendship.status === 'accepted' ? "datetime('now')" : null;
      insertFriendship.run(
        friendship.user_id,
        friendship.friend_id,
        friendship.status,
        acceptedAt
      );
    });

    // ============ UPDATE STATS ============
    logger.info('📊 Mise à jour des statistiques...');
    updateUserStats(db);

    logger.info('🎉 Données de seed créées avec succès!');
    logger.info('📝 Comptes de test disponibles:');
    logger.info('   - alice / Alice123! (avec email)');
    logger.info('   - bob / BobPong123! (avec email)');
    logger.info('   - charlie / Charlie456! (sans email)');

  } catch (error) {
    logger.error('❌ Erreur lors de la création des données de seed:', error);
    throw error;
  }
}

/**
 * Met à jour les statistiques des utilisateurs basées sur les parties
 * @param {Object} db - Instance de base de données
 */
function updateUserStats(db) {
  // Mise à jour des stats pour chaque utilisateur
  const users = db.prepare('SELECT id FROM users').all();
  
  const updateStats = db.prepare(`
    UPDATE users SET
      games_played = (
        SELECT COUNT(*) FROM games 
        WHERE (player1_id = ? OR player2_id = ?) AND status = 'completed'
      ),
      games_won = (
        SELECT COUNT(*) FROM games 
        WHERE winner_id = ? AND status = 'completed'
      ),
      total_score = (
        SELECT COALESCE(SUM(
          CASE 
            WHEN player1_id = ? THEN score_player1 
            WHEN player2_id = ? THEN score_player2 
            ELSE 0 
          END
        ), 0) FROM games 
        WHERE (player1_id = ? OR player2_id = ?) AND status = 'completed'
      ),
      updated_at = datetime('now')
    WHERE id = ?
  `);

  users.forEach(user => {
    updateStats.run(
      user.id, user.id, // games_played
      user.id, // games_won
      user.id, user.id, user.id, user.id, // total_score
      user.id // WHERE clause
    );
  });
}

module.exports = {
  seedDatabase
};
