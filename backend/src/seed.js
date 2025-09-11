const bcrypt = require('bcrypt');

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
    password: 'Charlie456!', 
    display_name: 'Charlie Rookie',
    status: 'in_game'
  }
];

const SEED_GAMES = [
  {
    player1_id: 1,
    player2_id: 2,
    winner_id: 1,
    score_player1: 5,
    score_player2: 2,
    duration: 180,
    game_mode: 'classic',
    ai_opponent: false
  },
  {
    player1_id: 2,
    player2_id: 3,
    winner_id: 2,
    score_player1: 5,
    score_player2: 3,
    duration: 240,
    game_mode: 'classic',
    ai_opponent: false
  },
  {
    player1_id: 1,
    player2_id: 3,
    winner_id: 1,
    score_player1: 5,
    score_player2: 2,
    duration: 150,
    game_mode: 'classic',
    ai_opponent: false
  },
  {
    player1_id: 2,
    player2_id: 1,
    winner_id: 1,
    score_player1: 3,
    score_player2: 5,
    duration: 200,
    game_mode: 'classic',
    ai_opponent: false
  },
  {
    player1_id: 1,
    player2_id: null,
    winner_id: 1,
    score_player1: 5,
    score_player2: 3,
    duration: 120,
    game_mode: 'classic',
    ai_opponent: true,
    ai_level: 3
  },
  {
    player1_id: 1,
    player2_id: null,
    winner_id: null,
    score_player1: 4,
    score_player2: 5,
    duration: 140,
    game_mode: 'classic',
    ai_opponent: true,
    ai_level: 4
  },
  {
    player1_id: 1,
    player2_id: 2,
    winner_id: 1,
    score_player1: 5,
    score_player2: 4,
    duration: 180,
    game_mode: 'tournament',
    ai_opponent: false,
    tournament_id: 1
  },
  {
    player1_id: 2,
    player2_id: 3,
    winner_id: 2,
    score_player1: 5,
    score_player2: 3,
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
    created_by: 1,
    winner_id: 1
  }
];

const SEED_TOURNAMENT_PARTICIPANTS = [
  { tournament_id: 1, user_id: 1, position: 1 },
  { tournament_id: 1, user_id: 2, position: 2 },
  { tournament_id: 1, user_id: 3, position: 3 }
];

const SEED_FRIENDSHIPS = [
  { user_id: 1, friend_id: 2, status: 'accepted' },
  { user_id: 2, friend_id: 1, status: 'accepted' },
  { user_id: 1, friend_id: 3, status: 'accepted' },
  { user_id: 3, friend_id: 1, status: 'accepted' },
  { user_id: 2, friend_id: 3, status: 'pending' } 
];

async function seedDatabase(db, logger) {
  try {
    logger.info('🌱 Initialisation des données de seed...');

    const existingUsers = db.prepare('SELECT COUNT(*) as count FROM users').get();
    if (existingUsers.count > 0) {
      logger.info('📊 Données de seed déjà présentes, skip');
      return;
    }

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

    logger.info('🎮 Creation des parties de test...');
    
    const userCount = db.prepare('SELECT COUNT(*) as count FROM users').get();
    logger.info(`👥 Utilisateurs disponibles: ${userCount.count}`);
    
    const users = db.prepare('SELECT id, username FROM users').all();
    users.forEach(u => logger.info(`  - User ID ${u.id}: ${u.username}`));
    
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
          game.ai_opponent ? 1 : 0,
          game.ai_level || null,
          null
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

    const gameCount = db.prepare('SELECT COUNT(*) as count FROM games').get();
    logger.info(`📊 Total jeux en base: ${gameCount.count}`);

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
          game.ai_opponent ? 1 : 0,
          game.ai_level || null,
          game.tournament_id
        );
        
        logger.info(`✅ Partie tournoi ${result.lastInsertRowid} créée: ${game.game_mode} (${game.score_player1}-${game.score_player2})`);
      } catch (error) {
        logger.error(`❌ Erreur partie tournoi ${index}:`, error.message);
        throw error;
      }
    });

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

function updateUserStats(db) {
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
      user.id, user.id,
      user.id,
      user.id, user.id, user.id, user.id,
      user.id
    );
  });
}

module.exports = {
  seedDatabase
};
