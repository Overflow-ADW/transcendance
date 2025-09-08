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
    username: 'charlie',
    password: 'Charlie456!', // Compte sans email
    display_name: 'Charlie Rookie',
    status: 'in_game'
  }
];

const SEED_GAMES = [
  // Jeux entre joueurs
  {
    player1_id: 1, // alice
    player2_id: 2, // bob
    winner_id: 1,
    score_player1: 11,
    score_player2: 7,
    duration: 180, // 3 minutes
    game_mode: 'classic',
    ai_opponent: false
  },
  {
    player1_id: 2, // bob
    player2_id: 3, // charlie
    winner_id: 2,
    score_player1: 11,
    score_player2: 9,
    duration: 240,
    game_mode: 'classic',
    ai_opponent: false
  },
  {
    player1_id: 1, // alice
    player2_id: 3, // charlie
    winner_id: 1,
    score_player1: 11,
    score_player2: 5,
    duration: 150,
    game_mode: 'classic',
    ai_opponent: false
  },
  {
    player1_id: 2, // bob
    player2_id: 1, // alice
    winner_id: 1,
    score_player1: 8,
    score_player2: 11,
    duration: 200,
    game_mode: 'classic',
    ai_opponent: false
  },
  // Jeux contre IA
  {
    player1_id: 1, // alice vs IA
    player2_id: null,
    winner_id: 1,
    score_player1: 11,
    score_player2: 6,
    duration: 120,
    game_mode: 'classic',
    ai_opponent: true,
    ai_level: 3
  },
  {
    player1_id: 1, // alice vs IA (défaite)
    player2_id: null,
    winner_id: null, // IA gagne
    score_player1: 9,
    score_player2: 11,
    duration: 140,
    game_mode: 'classic',
    ai_opponent: true,
    ai_level: 4
  },
  // Jeux de tournoi (Tournoi Test)
  {
    player1_id: 1, // alice vs bob (demi-finale)
    player2_id: 2,
    winner_id: 1,
    score_player1: 11,
    score_player2: 8,
    duration: 180,
    game_mode: 'tournament',
    ai_opponent: false,
    tournament_id: 1
  },
  {
    player1_id: 2, // bob vs charlie (demi-finale)
    player2_id: 3,
    winner_id: 2,
    score_player1: 11,
    score_player2: 6,
    duration: 160,
    game_mode: 'tournament',
    ai_opponent: false,
    tournament_id: 1
  }
];

const SEED_TOURNAMENTS = [
  {
    name: 'Premier Tournoi Test',
    description: 'Tournoi de test avec Alice, Bob et Charlie',
    max_players: 4,
    current_players: 3,
    status: 'completed',
    format: 'elimination',
    created_by: 1, // alice
    winner_id: 1 // alice gagne
  }
];

const SEED_TOURNAMENT_PARTICIPANTS = [
  { tournament_id: 1, user_id: 1, position: 1 }, // alice - gagnante
  { tournament_id: 1, user_id: 2, position: 2 }, // bob - finaliste
  { tournament_id: 1, user_id: 3, position: 3 }  // charlie - demi-finaliste
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
    
    // Vérifier les utilisateurs avant de créer les jeux
    const userCount = db.prepare('SELECT COUNT(*) as count FROM users').get();
    logger.info(`👥 Utilisateurs disponibles: ${userCount.count}`);
    
    const users = db.prepare('SELECT id, username FROM users').all();
    users.forEach(u => logger.info(`  - User ID ${u.id}: ${u.username}`));
    
    // Insertion simple sans dates complexes
    const insertGame = db.prepare(`
      INSERT INTO games (
        player1_id, player2_id, winner_id, 
        score_player1, score_player2, duration,
        game_mode, ai_opponent, ai_level, status, tournament_id
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'completed', ?)
    `);

    SEED_GAMES.filter(game => !game.tournament_id).forEach((game, index) => {
      try {
        logger.info(`Création partie ${index + 1}: player1=${game.player1_id}, player2=${game.player2_id}, winner=${game.winner_id}`);
        logger.info(`Détails: mode=${game.game_mode}, ai=${game.ai_opponent}, ai_level=${game.ai_level}`);
        
        const result = insertGame.run(
          game.player1_id,
          game.player2_id || null,
          game.winner_id,
          game.score_player1,
          game.score_player2,
          game.duration,
          game.game_mode,
          game.ai_opponent ? 1 : 0, // Convertir boolean en integer pour SQLite
          game.ai_level || null,
          null // tournament_id = null pour les jeux normaux
        );
        
        logger.info(`✅ Partie ${result.lastInsertRowid} créée: ${game.game_mode} (${game.score_player1}-${game.score_player2})`);
      } catch (error) {
        logger.error(`❌ Erreur partie ${index}:`, error.message);
        logger.error(`   Code:`, error.code);
        logger.error(`   Errno:`, error.errno); 
        logger.error(`   Game:`, JSON.stringify(game));
        throw error;
      }
    });

    const normalGamesCount = SEED_GAMES.filter(game => !game.tournament_id).length;
    logger.info(`🎯 ${normalGamesCount} parties normales créées avec succès`);

    // Test: vérifier les données
    const gameCount = db.prepare('SELECT COUNT(*) as count FROM games').get();
    logger.info(`📊 Total jeux en base: ${gameCount.count}`);

    // ============ SEED TOURNAMENTS ============
    logger.info('🏆 Creation des tournois de test...');
    const insertTournament = db.prepare(`
      INSERT INTO tournaments (
        name, description, max_players, current_players, 
        status, format, created_by, winner_id, created_at, ended_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))
    `);

    SEED_TOURNAMENTS.forEach(tournament => {
      const result = insertTournament.run(
        tournament.name,
        tournament.description,
        tournament.max_players,
        tournament.current_players,
        tournament.status,
        tournament.format,
        tournament.created_by,
        tournament.winner_id
      );
      logger.info(`✅ Tournoi ${result.lastInsertRowid} créé: ${tournament.name}`);
    });

    // ============ SEED TOURNAMENT PARTICIPANTS ============
    logger.info('👥 Creation des participants aux tournois...');
    const insertParticipant = db.prepare(`
      INSERT INTO tournament_participants (tournament_id, user_id, position)
      VALUES (?, ?, ?)
    `);

    SEED_TOURNAMENT_PARTICIPANTS.forEach(participant => {
      insertParticipant.run(
        participant.tournament_id,
        participant.user_id,
        participant.position
      );
      logger.info(`✅ Participant ajouté: user_id=${participant.user_id}, position=${participant.position}`);
    });

    // ============ SEED TOURNAMENT GAMES ============
    logger.info('🏆 Creation des parties de tournoi...');
    const tournamentGames = SEED_GAMES.filter(game => game.tournament_id);
    
    tournamentGames.forEach((game, index) => {
      try {
        logger.info(`Création partie tournoi ${index + 1}/${tournamentGames.length}: player1=${game.player1_id}, player2=${game.player2_id}`);
        
        const result = insertGame.run(
          game.player1_id,
          game.player2_id || null,
          game.winner_id,
          game.score_player1,
          game.score_player2,
          game.duration,
          game.game_mode,
          game.ai_opponent ? 1 : 0, // Convertir boolean en integer pour SQLite
          game.ai_level || null,
          game.tournament_id
        );
        
        logger.info(`✅ Partie tournoi ${result.lastInsertRowid} créée: ${game.game_mode} (${game.score_player1}-${game.score_player2})`);
      } catch (error) {
        logger.error(`❌ Erreur partie tournoi ${index}:`, error.message);
        throw error;
      }
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
