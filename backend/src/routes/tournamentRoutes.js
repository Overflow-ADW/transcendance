const { authenticateToken } = require('../middleware/auth');
const Joi = require('joi');

const createTournamentSchema = Joi.object({
  name: Joi.string().min(3).max(50).required(),
  description: Joi.string().max(200).optional(),
  maxPlayers: Joi.number().integer().min(4).max(32).default(8),
  format: Joi.string().valid('elimination', 'round_robin').default('elimination')
});

const addParticipantSchema = Joi.object({
  userId: Joi.number().integer().required()
});

async function tournamentRoutes(fastify, options) {
  const db = fastify.db;

  fastify.post('/', { preHandler: [authenticateToken] }, async (request, reply) => {
    try {
      const { error, value } = createTournamentSchema.validate(request.body);
      if (error) {
        return reply.status(400).send({
          error: 'Données invalides',
          details: error.details[0].message,
          code: 'VALIDATION_ERROR'
        });
      }

      const { name, description, maxPlayers, format } = value;
      const creatorId = request.user.userId;

      const result = db.prepare(`
        INSERT INTO tournaments (
          name, 
          description,
          max_players,
          current_players,
          status,
          format,
          created_by,
          created_at
        ) VALUES (?, ?, ?, 1, 'waiting', ?, ?, datetime('now'))
      `).run(name, description || null, maxPlayers, format, creatorId);

      const tournamentId = result.lastInsertRowid;

      db.prepare(`
        INSERT INTO tournament_participants (
          tournament_id, 
          user_id
        ) VALUES (?, ?)
      `).run(tournamentId, creatorId);

      const tournament = db.prepare(`
        SELECT 
          t.*, 
          u.username as creator_username,
          u.display_name as creator_display_name
        FROM tournaments t
        JOIN users u ON u.id = t.created_by
        WHERE t.id = ?
      `).get(tournamentId);

      return reply.status(201).send({
        message: 'Tournoi créé avec succès',
        tournament: tournament,
        code: 'TOURNAMENT_CREATED'
      });

    } catch (error) {
      fastify.log.error('❌ Erreur lors de la création du tournoi:', error);
      return reply.status(500).send({
        error: 'Erreur interne du serveur',
        code: 'INTERNAL_ERROR'
      });
    }
  });

  fastify.get('/', { preHandler: [authenticateToken] }, async (request, reply) => {
    try {
      const { status = 'all' } = request.query;
      
      let query = `
        SELECT 
          t.*, 
          u.username as creator_username,
          u.display_name as creator_display_name,
          CASE WHEN EXISTS (
            SELECT 1 FROM tournament_participants 
            WHERE tournament_id = t.id AND user_id = ?
          ) THEN 1 ELSE 0 END as user_joined
        FROM tournaments t
        JOIN users u ON u.id = t.created_by
      `;
      
      const params = [request.user.userId];
      
      if (status !== 'all') {
        query += ' WHERE t.status = ?';
        params.push(status);
      }
      
      query += ' ORDER BY t.created_at DESC';
      
      const tournaments = db.prepare(query).all(...params);
      
      return reply.send({
        tournaments,
        count: tournaments.length
      });

    } catch (error) {
      fastify.log.error('❌ Erreur lors de la récupération des tournois:', error);
      return reply.status(500).send({
        error: 'Erreur interne du serveur',
        code: 'INTERNAL_ERROR'
      });
    }
  });

  fastify.get('/:id', { preHandler: [authenticateToken] }, async (request, reply) => {
    try {
      const tournamentId = parseInt(request.params.id);
      
      if (isNaN(tournamentId)) {
        return reply.status(400).send({
          error: 'ID de tournoi invalide',
          code: 'INVALID_ID'
        });
      }
      
      const tournament = db.prepare(`
        SELECT 
          t.*, 
          u.username as creator_username,
          u.display_name as creator_display_name,
          CASE WHEN EXISTS (
            SELECT 1 FROM tournament_participants 
            WHERE tournament_id = t.id AND user_id = ?
          ) THEN 1 ELSE 0 END as user_joined
        FROM tournaments t
        JOIN users u ON u.id = t.created_by
        WHERE t.id = ?
      `).get(request.user.userId, tournamentId);
      
      if (!tournament) {
        return reply.status(404).send({
          error: 'Tournoi non trouvé',
          code: 'TOURNAMENT_NOT_FOUND'
        });
      }
      
      const participants = db.prepare(`
        SELECT 
          tp.tournament_id,
          tp.user_id,
          tp.position,
          tp.eliminated_at,
          u.username,
          u.display_name,
          u.avatar_url
        FROM tournament_participants tp
        JOIN users u ON u.id = tp.user_id
        WHERE tp.tournament_id = ?
        ORDER BY tp.id ASC
      `).all(tournamentId);
      
      const matches = db.prepare(`
        SELECT 
          g.*,
          p1.username as player1_username,
          p1.display_name as player1_display_name,
          p1.avatar_url as player1_avatar,
          p2.username as player2_username,
          p2.display_name as player2_display_name,
          p2.avatar_url as player2_avatar
        FROM games g
        JOIN users p1 ON p1.id = g.player1_id
        LEFT JOIN users p2 ON p2.id = g.player2_id
        WHERE g.tournament_id = ?
        ORDER BY g.created_at ASC
      `).all(tournamentId);
      
      return reply.send({
        tournament,
        participants,
        matches
      });

    } catch (error) {
      fastify.log.error('❌ Erreur lors de la récupération du tournoi:', error);
      return reply.status(500).send({
        error: 'Erreur interne du serveur',
        code: 'INTERNAL_ERROR'
      });
    }
  });

  fastify.post('/:id/join', { preHandler: [authenticateToken] }, async (request, reply) => {
    try {
      const tournamentId = parseInt(request.params.id);
      const userId = request.user.userId;
      
      if (isNaN(tournamentId)) {
        return reply.status(400).send({
          error: 'ID de tournoi invalide',
          code: 'INVALID_ID'
        });
      }
      
      const tournament = db.prepare(`
        SELECT * FROM tournaments WHERE id = ?
      `).get(tournamentId);
      
      if (!tournament) {
        return reply.status(404).send({
          error: 'Tournoi non trouvé',
          code: 'TOURNAMENT_NOT_FOUND'
        });
      }
      
      if (tournament.status !== 'waiting') {
        return reply.status(400).send({
          error: 'Le tournoi n\'accepte plus de participants',
          code: 'TOURNAMENT_CLOSED'
        });
      }
      
      if (tournament.current_players >= tournament.max_players) {
        return reply.status(400).send({
          error: 'Le tournoi est complet',
          code: 'TOURNAMENT_FULL'
        });
      }
      
      const existingParticipant = db.prepare(`
        SELECT * FROM tournament_participants
        WHERE tournament_id = ? AND user_id = ?
      `).get(tournamentId, userId);
      
      if (existingParticipant) {
        return reply.status(409).send({
          error: 'Vous êtes déjà inscrit à ce tournoi',
          code: 'ALREADY_JOINED'
        });
      }
      
      const updateTournament = db.prepare(`
        UPDATE tournaments 
        SET current_players = current_players + 1
        WHERE id = ?
      `);
      
      const addParticipant = db.prepare(`
        INSERT INTO tournament_participants (tournament_id, user_id) 
        VALUES (?, ?)
      `);
      
      const transaction = db.transaction(() => {
        addParticipant.run(tournamentId, userId);
        updateTournament.run(tournamentId);
      });
      
      transaction();
      
      return reply.send({
        message: 'Vous avez rejoint le tournoi avec succès',
        code: 'JOINED_TOURNAMENT'
      });

    } catch (error) {
      fastify.log.error('❌ Erreur lors de l\'inscription au tournoi:', error);
      return reply.status(500).send({
        error: 'Erreur interne du serveur',
        code: 'INTERNAL_ERROR'
      });
    }
  });

  fastify.post('/:id/participants', { preHandler: [authenticateToken] }, async (request, reply) => {
    try {
      const tournamentId = parseInt(request.params.id);
      
      if (isNaN(tournamentId)) {
        return reply.status(400).send({
          error: 'ID de tournoi invalide',
          code: 'INVALID_ID'
        });
      }
      
      const { error, value } = addParticipantSchema.validate(request.body);
      if (error) {
        return reply.status(400).send({
          error: 'Données invalides',
          details: error.details[0].message,
          code: 'VALIDATION_ERROR'
        });
      }
      
      const { userId } = value;
      
      const tournament = db.prepare(`
        SELECT * FROM tournaments 
        WHERE id = ? AND created_by = ?
      `).get(tournamentId, request.user.userId);
      
      if (!tournament) {
        return reply.status(403).send({
          error: 'Vous n\'êtes pas autorisé à modifier ce tournoi',
          code: 'NOT_AUTHORIZED'
        });
      }
      
      if (tournament.status !== 'waiting') {
        return reply.status(400).send({
          error: 'Le tournoi n\'accepte plus de participants',
          code: 'TOURNAMENT_CLOSED'
        });
      }
      
      if (tournament.current_players >= tournament.max_players) {
        return reply.status(400).send({
          error: 'Le tournoi est complet',
          code: 'TOURNAMENT_FULL'
        });
      }
      
      const userToAdd = db.prepare('SELECT id, username FROM users WHERE id = ?').get(userId);
      
      if (!userToAdd) {
        return reply.status(404).send({
          error: 'Utilisateur non trouvé',
          code: 'USER_NOT_FOUND'
        });
      }
      
      const existingParticipant = db.prepare(`
        SELECT * FROM tournament_participants
        WHERE tournament_id = ? AND user_id = ?
      `).get(tournamentId, userId);
      
      if (existingParticipant) {
        return reply.status(409).send({
          error: 'Cet utilisateur est déjà inscrit au tournoi',
          code: 'ALREADY_JOINED'
        });
      }
      
      const updateTournament = db.prepare(`
        UPDATE tournaments 
        SET current_players = current_players + 1
        WHERE id = ?
      `);
      
      const addParticipant = db.prepare(`
        INSERT INTO tournament_participants (tournament_id, user_id) 
        VALUES (?, ?)
      `);
      
      const transaction = db.transaction(() => {
        addParticipant.run(tournamentId, userId);
        updateTournament.run(tournamentId);
      });
      
      transaction();
      
      return reply.send({
        message: `${userToAdd.username} a été ajouté au tournoi`,
        code: 'PARTICIPANT_ADDED'
      });

    } catch (error) {
      fastify.log.error('❌ Erreur lors de l\'ajout d\'un participant:', error);
      return reply.status(500).send({
        error: 'Erreur interne du serveur',
        code: 'INTERNAL_ERROR'
      });
    }
  });

  fastify.post('/:id/start', { preHandler: [authenticateToken] }, async (request, reply) => {
    try {
      const tournamentId = parseInt(request.params.id);
      
      if (isNaN(tournamentId)) {
        return reply.status(400).send({
          error: 'ID de tournoi invalide',
          code: 'INVALID_ID'
        });
      }
      
      const tournament = db.prepare(`
        SELECT * FROM tournaments 
        WHERE id = ? AND created_by = ?
      `).get(tournamentId, request.user.userId);
      
      if (!tournament) {
        return reply.status(403).send({
          error: 'Vous n\'êtes pas autorisé à modifier ce tournoi',
          code: 'NOT_AUTHORIZED'
        });
      }
      
      if (tournament.status !== 'waiting') {
        return reply.status(400).send({
          error: 'Le tournoi a déjà démarré ou est terminé',
          code: 'INVALID_STATUS'
        });
      }
      
      if (tournament.current_players < 2) {
        return reply.status(400).send({
          error: 'Le tournoi doit avoir au moins 2 participants',
          code: 'NOT_ENOUGH_PARTICIPANTS'
        });
      }

      const participants = db.prepare(`
        SELECT tp.user_id, u.username, u.display_name 
        FROM tournament_participants tp
        JOIN users u ON u.id = tp.user_id
        WHERE tp.tournament_id = ?
        ORDER BY tp.id ASC
      `).all(tournamentId);

      const createMatches = db.transaction(() => {
        db.prepare(`
          UPDATE tournaments 
          SET status = 'active', started_at = datetime('now')
          WHERE id = ?
        `).run(tournamentId);

        if (tournament.format === 'elimination') {
          createEliminationMatches(db, tournamentId, participants);
        } else {
          throw new Error('Format non supporté pour l\'instant');
        }
      });

      createMatches();
      
      return reply.send({
        message: 'Tournoi démarré avec succès',
        matches: getEliminationMatches(participants),
        code: 'TOURNAMENT_STARTED'
      });

    } catch (error) {
      fastify.log.error('❌ Erreur lors du démarrage du tournoi:', error);
      return reply.status(500).send({
        error: 'Erreur interne du serveur',
        details: error.message,
        code: 'INTERNAL_ERROR'
      });
    }
  });

  // ✅ NOUVELLE MÉTHODE ATOMIQUE : Créer et démarrer un tournoi en une seule transaction
  fastify.post('/create-and-start', { preHandler: [authenticateToken] }, async (request, reply) => {
    try {
      const createAndStartSchema = Joi.object({
        name: Joi.string().min(3).max(50).required(),
        description: Joi.string().max(200).optional(),
        playerIds: Joi.array().items(Joi.number().integer()).min(2).max(32).required(),
        format: Joi.string().valid('elimination', 'round_robin').default('elimination')
      });

      const { error, value } = createAndStartSchema.validate(request.body);
      if (error) {
        return reply.status(400).send({
          error: 'Données invalides',
          details: error.details[0].message,
          code: 'VALIDATION_ERROR'
        });
      }

      const { name, description, playerIds, format } = value;
      const creatorId = request.user.userId;

      // Vérifier que le créateur est dans la liste des joueurs
      if (!playerIds.includes(creatorId)) {
        return reply.status(400).send({
          error: 'Le créateur doit être inclus dans la liste des joueurs',
          code: 'CREATOR_NOT_IN_PLAYERS'
        });
      }

      // Vérifier que tous les utilisateurs existent
      const users = db.prepare(`
        SELECT id, username, display_name FROM users 
        WHERE id IN (${playerIds.map(() => '?').join(',')})
      `).all(...playerIds);

      if (users.length !== playerIds.length) {
        const existingIds = users.map(u => u.id);
        const missingIds = playerIds.filter(id => !existingIds.includes(id));
        return reply.status(400).send({
          error: 'Certains utilisateurs n\'existent pas',
          details: `IDs manquants: ${missingIds.join(', ')}`,
          code: 'USERS_NOT_FOUND'
        });
      }

      // ✅ TRANSACTION ATOMIQUE : Tout réussit ou tout échoue
      const createAndStartTransaction = db.transaction(() => {
        // 1. Créer le tournoi
        const tournamentResult = db.prepare(`
          INSERT INTO tournaments (
            name, 
            description,
            max_players,
            current_players,
            status,
            format,
            created_by,
            created_at,
            started_at
          ) VALUES (?, ?, ?, ?, 'active', ?, ?, datetime('now'), datetime('now'))
        `).run(name, description || null, playerIds.length, playerIds.length, format, creatorId);

        const tournamentId = tournamentResult.lastInsertRowid;

        // 2. Ajouter tous les participants
        const addParticipantStmt = db.prepare(`
          INSERT INTO tournament_participants (tournament_id, user_id) 
          VALUES (?, ?)
        `);

        for (const playerId of playerIds) {
          addParticipantStmt.run(tournamentId, playerId);
        }

        // 3. Créer les matchs du tournoi selon le format
        const participants = users.map(user => ({ user_id: user.id, username: user.username }));
        
        if (format === 'elimination') {
          createEliminationMatches(db, tournamentId, participants);
        } else {
          throw new Error('Format non supporté pour l\'instant');
        }

        return tournamentId;
      });

      // Exécuter la transaction
      const tournamentId = createAndStartTransaction();

      // Retourner les détails du tournoi créé
      const tournament = db.prepare(`
        SELECT 
          t.*, 
          u.username as creator_username,
          u.display_name as creator_display_name
        FROM tournaments t
        JOIN users u ON u.id = t.created_by
        WHERE t.id = ?
      `).get(tournamentId);

      fastify.log.info(`🏆 Tournoi créé et démarré avec succès:`, {
        tournamentId,
        name,
        creatorId,
        playersCount: playerIds.length,
        format
      });

      return reply.status(201).send({
        message: 'Tournoi créé et démarré avec succès',
        tournament: tournament,
        tournamentId: tournamentId,
        code: 'TOURNAMENT_CREATED_AND_STARTED'
      });

    } catch (error) {
      fastify.log.error('❌ Erreur lors de la création atomique du tournoi:', error);
      return reply.status(500).send({
        error: 'Erreur interne du serveur',
        details: error.message,
        code: 'INTERNAL_ERROR'
      });
    }
  });

  function createEliminationMatches(db, tournamentId, participants) {
    if (participants.length === 2) {
      db.prepare(`
        INSERT INTO games (
          tournament_id, player1_id, player2_id, 
          game_mode, status, created_at, match_type, ai_opponent
        ) VALUES (?, ?, ?, 'tournament', 'waiting', datetime('now'), 'final', 0)
      `).run(tournamentId, participants[0].user_id, participants[1].user_id);
      
    } else if (participants.length === 3) {
      db.prepare(`
        INSERT INTO games (
          tournament_id, player1_id, player2_id, 
          game_mode, status, created_at, match_type, ai_opponent
        ) VALUES (?, ?, ?, 'tournament', 'waiting', datetime('now'), 'semifinal', 0)
      `).run(tournamentId, participants[0].user_id, participants[1].user_id);
      
    } else if (participants.length === 4) {
      db.prepare(`
        INSERT INTO games (
          tournament_id, player1_id, player2_id, 
          game_mode, status, created_at, match_type, ai_opponent
        ) VALUES (?, ?, ?, 'tournament', 'waiting', datetime('now'), 'semifinal', 0)
      `).run(tournamentId, participants[0].user_id, participants[1].user_id);
      
      db.prepare(`
        INSERT INTO games (
          tournament_id, player1_id, player2_id, 
          game_mode, status, created_at, match_type, ai_opponent
        ) VALUES (?, ?, ?, 'tournament', 'waiting', datetime('now'), 'semifinal', 0)
      `).run(tournamentId, participants[2].user_id, participants[3].user_id);
      
    }
  }

  function getEliminationMatches(participants) {
    const matches = {
      semifinals: [],
      final: null
    };

    if (participants.length === 2) {
      matches.final = {
        player1: participants[0],
        player2: participants[1]
      };
    } else if (participants.length === 3) {
      matches.semifinals = [{
        player1: participants[0],
        player2: participants[1]
      }];
      matches.final = {
        player1: null,
        player2: participants[2]
      };
    } else if (participants.length === 4) {
      matches.semifinals = [
        {
          player1: participants[0],
          player2: participants[1]
        },
        {
          player1: participants[2],
          player2: participants[3]
        }
      ];
      matches.final = {
        player1: null,
        player2: null
      };
    }

    return matches;
  }

  fastify.get('/:id/matches', { preHandler: [authenticateToken] }, async (request, reply) => {
    try {
      const tournamentId = parseInt(request.params.id);
      
      if (isNaN(tournamentId)) {
        return reply.status(400).send({
          error: 'ID de tournoi invalide',
          code: 'INVALID_ID'
        });
      }
      
      const matches = db.prepare(`
        SELECT 
          g.*,
          p1.username as player1_username,
          p1.display_name as player1_display_name,
          p1.avatar_url as player1_avatar,
          p2.username as player2_username,
          p2.display_name as player2_display_name,
          p2.avatar_url as player2_avatar
        FROM games g
        JOIN users p1 ON p1.id = g.player1_id
        LEFT JOIN users p2 ON p2.id = g.player2_id
        WHERE g.tournament_id = ?
        ORDER BY g.created_at ASC
      `).all(tournamentId);
      
      return reply.send({
        tournamentId,
        matches
      });

    } catch (error) {
      fastify.log.error('❌ Erreur lors de la récupération des matchs:', error);
      return reply.status(500).send({
        error: 'Erreur interne du serveur',
        code: 'INTERNAL_ERROR'
      });
    }
  });

  fastify.post('/match/:matchId/complete', { preHandler: [authenticateToken] }, async (request, reply) => {
    try {
      const matchId = parseInt(request.params.matchId);
      const { scorePlayer1, scorePlayer2, winnerId } = request.body;
      
      if (isNaN(matchId)) {
        return reply.status(400).send({
          error: 'ID de match invalide',
          code: 'INVALID_ID'
        });
      }

      const match = db.prepare(`
        SELECT * FROM games 
        WHERE id = ? AND game_mode = 'tournament'
      `).get(matchId);
      
      if (!match) {
        return reply.status(404).send({
          error: 'Match non trouvé',
          code: 'MATCH_NOT_FOUND'
        });
      }

      if (match.status === 'completed') {
        return reply.status(400).send({
          error: 'Ce match est déjà terminé',
          code: 'MATCH_ALREADY_COMPLETED'
        });
      }

      const updateResult = db.prepare(`
        UPDATE games 
        SET 
          score_player1 = ?, 
          score_player2 = ?, 
          winner_id = ?,
          status = 'completed',
          end_time = datetime('now'),
          duration = CAST((julianday('now') - julianday(start_time)) * 86400 AS INTEGER),
          ai_opponent = 0,
          player2_id = COALESCE(player2_id, ?)
        WHERE id = ?
      `).run(scorePlayer1, scorePlayer2, winnerId, match.player2_id, matchId);

      fastify.log.info(`🏆 Match de tournoi mis à jour:`, {
        matchId,
        scorePlayer1,
        scorePlayer2,
        winnerId,
        player1_id: match.player1_id,
        player2_id: match.player2_id,
        tournament_id: match.tournament_id,
        changes: updateResult.changes
      });

      await createNextMatches(db, match.tournament_id);
      
      return reply.send({
        message: 'Match terminé avec succès',
        code: 'MATCH_COMPLETED'
      });

    } catch (error) {
      fastify.log.error('❌ Erreur lors de la completion du match:', error);
      return reply.status(500).send({
        error: 'Erreur interne du serveur',
        code: 'INTERNAL_ERROR'
      });
    }
  });

  async function createNextMatches(db, tournamentId) {
    const tournament = db.prepare('SELECT * FROM tournaments WHERE id = ?').get(tournamentId);
    
    const allMatches = db.prepare(`
      SELECT * FROM games 
      WHERE tournament_id = ?
      ORDER BY created_at ASC
    `).all(tournamentId);

    const completedMatches = allMatches.filter(m => m.status === 'completed');
    const totalParticipants = tournament.current_players;

    if (totalParticipants === 4 && completedMatches.length === 2) {
      const semifinal1 = completedMatches[0];
      const semifinal2 = completedMatches[1];

      const loser1 = semifinal1.player1_id === semifinal1.winner_id 
        ? semifinal1.player2_id : semifinal1.player1_id;
      const winner1 = semifinal1.winner_id;
      
      const loser2 = semifinal2.player1_id === semifinal2.winner_id 
        ? semifinal2.player2_id : semifinal2.player1_id;
      const winner2 = semifinal2.winner_id;
      
      db.prepare(`
        INSERT INTO games (
          tournament_id, player1_id, player2_id, 
          game_mode, status, created_at, match_type, ai_opponent
        ) VALUES (?, ?, ?, 'tournament', 'waiting', datetime('now'), 'third_place', 0)
      `).run(tournamentId, loser1, loser2);
      
      db.prepare(`
        INSERT INTO games (
          tournament_id, player1_id, player2_id, 
          game_mode, status, created_at, match_type, ai_opponent
        ) VALUES (?, ?, ?, 'tournament', 'waiting', datetime('now'), 'final', 0)
      `).run(tournamentId, winner1, winner2);
      
    } else if (totalParticipants === 3 && completedMatches.length === 1) {
      const winner1 = completedMatches[0].winner_id;
      
      const participants = db.prepare(`
        SELECT user_id FROM tournament_participants WHERE tournament_id = ?
      `).all(tournamentId);
      
      const player3 = participants.find(p => 
        p.user_id !== completedMatches[0].player1_id && 
        p.user_id !== completedMatches[0].player2_id
      );
      
      if (player3) {
        db.prepare(`
          INSERT INTO games (
            tournament_id, player1_id, player2_id, 
            game_mode, status, created_at, match_type, ai_opponent
          ) VALUES (?, ?, ?, 'tournament', 'waiting', datetime('now'), 'final', 0)
        `).run(tournamentId, winner1, player3.user_id);
      }

    } else if (totalParticipants === 2) {
    }

    const totalMatches = db.prepare(`
      SELECT COUNT(*) as count FROM games WHERE tournament_id = ?
    `).get(tournamentId).count;
    
    const completedMatchesCount = completedMatches.length;

    if (totalMatches === completedMatchesCount) {
      await calculateFinalRanking(db, tournamentId);
    }
  }

  async function calculateFinalRanking(db, tournamentId) {
    try {
      const matches = db.prepare(`
        SELECT * FROM games 
        WHERE tournament_id = ? AND status = 'completed'
        ORDER BY created_at ASC
      `).all(tournamentId);

      const semifinal1 = matches.find((m, index) => m.match_type === 'semifinal' && index === 0);
      const semifinal2 = matches.find((m, index) => m.match_type === 'semifinal' && index === 1);
      const thirdPlaceMatch = matches.find(m => m.match_type === 'third_place');
      const finalMatch = matches.find(m => m.match_type === 'final');

      if (finalMatch) {
        const firstPlace = finalMatch.winner_id;
        const secondPlace = finalMatch.player1_id === firstPlace ? finalMatch.player2_id : finalMatch.player1_id;
        
        db.prepare(`
          UPDATE tournament_participants 
          SET position = 1 
          WHERE tournament_id = ? AND user_id = ?
        `).run(tournamentId, firstPlace);
        
        db.prepare(`
          UPDATE tournament_participants 
          SET position = 2 
          WHERE tournament_id = ? AND user_id = ?
        `).run(tournamentId, secondPlace);

        if (thirdPlaceMatch) {
          const thirdPlace = thirdPlaceMatch.winner_id;
          const fourthPlace = thirdPlaceMatch.player1_id === thirdPlace ? thirdPlaceMatch.player2_id : thirdPlaceMatch.player1_id;
          
          db.prepare(`
            UPDATE tournament_participants 
            SET position = 3 
            WHERE tournament_id = ? AND user_id = ?
          `).run(tournamentId, thirdPlace);
          
          db.prepare(`
            UPDATE tournament_participants 
            SET position = 4 
            WHERE tournament_id = ? AND user_id = ?
          `).run(tournamentId, fourthPlace);
        } else {
          const semifinalMatch = matches.find(m => m.match_type === 'semifinal');
          if (semifinalMatch) {
            const thirdPlace = semifinalMatch.player1_id === semifinalMatch.winner_id 
              ? semifinalMatch.player2_id : semifinalMatch.player1_id;
            
            db.prepare(`
              UPDATE tournament_participants 
              SET position = 3 
              WHERE tournament_id = ? AND user_id = ?
            `).run(tournamentId, thirdPlace);
          }
        }

        db.prepare(`
          UPDATE tournaments 
          SET status = 'completed', winner_id = ?, ended_at = datetime('now')
          WHERE id = ?
        `).run(firstPlace, tournamentId);
      }
    } catch (error) {
      console.error('Erreur lors du calcul du classement:', error);
    }
  }
  fastify.get('/:id/participants', { preHandler: [authenticateToken] }, async (request, reply) => {
    try {
      const tournamentId = parseInt(request.params.id);
      
      if (isNaN(tournamentId)) {
        return reply.status(400).send({
          error: 'ID de tournoi invalide',
          code: 'INVALID_ID'
        });
      }
      
      const tournament = db.prepare('SELECT * FROM tournaments WHERE id = ?').get(tournamentId);
      
      if (!tournament) {
        return reply.status(404).send({
          error: 'Tournoi non trouvé',
          code: 'TOURNAMENT_NOT_FOUND'
        });
      }
      
      const participants = db.prepare(`
        SELECT 
          tp.tournament_id,
          tp.user_id,
          tp.position,
          tp.eliminated_at,
          u.username,
          u.display_name,
          u.avatar_url
        FROM tournament_participants tp
        JOIN users u ON u.id = tp.user_id
        WHERE tp.tournament_id = ?
        ORDER BY tp.id ASC
      `).all(tournamentId);
      
      return reply.send({
        tournament: {
          id: tournament.id,
          name: tournament.name,
          status: tournament.status,
          current_players: tournament.current_players,
          max_players: tournament.max_players,
          created_at: tournament.created_at,
          started_at: tournament.started_at
        },
        participants,
        count: participants.length
      });

    } catch (error) {
      fastify.log.error('❌ Erreur lors de la récupération des participants:', error);
      return reply.status(500).send({
        error: 'Erreur interne du serveur',
        code: 'INTERNAL_ERROR'
      });
    }
  });

  fastify.delete('/:id/leave', { preHandler: [authenticateToken] }, async (request, reply) => {
    try {
      const tournamentId = parseInt(request.params.id);
      const userId = request.user.userId;
      
      if (isNaN(tournamentId)) {
        return reply.status(400).send({
          error: 'ID de tournoi invalide',
          code: 'INVALID_ID'
        });
      }
      
      const tournament = db.prepare(`SELECT * FROM tournaments WHERE id = ?`).get(tournamentId);
      
      if (!tournament) {
        return reply.status(404).send({
          error: 'Tournoi non trouvé',
          code: 'TOURNAMENT_NOT_FOUND'
        });
      }
      
      if (tournament.status !== 'waiting') {
        return reply.status(400).send({
          error: 'Impossible de quitter un tournoi qui a déjà démarré',
          code: 'TOURNAMENT_STARTED'
        });
      }
      
      if (tournament.created_by === userId) {
        return reply.status(400).send({
          error: 'Le créateur ne peut pas quitter son propre tournoi',
          code: 'CREATOR_CANNOT_LEAVE'
        });
      }
      
      const participant = db.prepare(`
        SELECT * FROM tournament_participants
        WHERE tournament_id = ? AND user_id = ?
      `).get(tournamentId, userId);
      
      if (!participant) {
        return reply.status(404).send({
          error: 'Vous ne participez pas à ce tournoi',
          code: 'NOT_PARTICIPANT'
        });
      }
      
      const updateTournament = db.prepare(`
        UPDATE tournaments 
        SET current_players = current_players - 1
        WHERE id = ?
      `);
      
      const removeParticipant = db.prepare(`
        DELETE FROM tournament_participants
        WHERE tournament_id = ? AND user_id = ?
      `);
      
      const transaction = db.transaction(() => {
        removeParticipant.run(tournamentId, userId);
        updateTournament.run(tournamentId);
      });
      
      transaction();
      
      return reply.send({
        message: 'Vous avez quitté le tournoi',
        code: 'LEFT_TOURNAMENT'
      });

    } catch (error) {
      fastify.log.error('❌ Erreur lors de la sortie du tournoi:', error);
      return reply.status(500).send({
        error: 'Erreur interne du serveur',
        code: 'INTERNAL_ERROR'
      });
    }
  });

  fastify.get('/:id/ranking', { preHandler: [authenticateToken] }, async (request, reply) => {
    try {
      const tournamentId = parseInt(request.params.id);
      
      if (isNaN(tournamentId)) {
        return reply.status(400).send({
          error: 'ID de tournoi invalide',
          code: 'INVALID_ID'
        });
      }
      
      const tournament = db.prepare(`
        SELECT * FROM tournaments WHERE id = ?
      `).get(tournamentId);
      
      if (!tournament) {
        return reply.status(404).send({
          error: 'Tournoi non trouvé',
          code: 'TOURNAMENT_NOT_FOUND'
        });
      }

      const ranking = db.prepare(`
        SELECT 
          tp.position,
          tp.user_id,
          u.username,
          u.display_name,
          u.avatar_url,
          -- Statistiques du joueur dans le tournoi
          (SELECT COUNT(*) FROM games 
           WHERE tournament_id = ? 
           AND (player1_id = u.id OR player2_id = u.id) 
           AND status = 'completed') as matches_played,
          (SELECT COUNT(*) FROM games 
           WHERE tournament_id = ? 
           AND winner_id = u.id 
           AND status = 'completed') as matches_won
        FROM tournament_participants tp
        JOIN users u ON u.id = tp.user_id
        WHERE tp.tournament_id = ?
        ORDER BY tp.position ASC NULLS LAST, tp.id ASC
      `).all(tournamentId, tournamentId, tournamentId);

      return reply.send({
        tournament: {
          id: tournament.id,
          name: tournament.name,
          status: tournament.status,
          winner_id: tournament.winner_id,
          created_at: tournament.created_at,
          started_at: tournament.started_at,
          ended_at: tournament.ended_at
        },
        ranking
      });

    } catch (error) {
      fastify.log.error('❌ Erreur lors de la récupération du classement:', error);
      return reply.status(500).send({
        error: 'Erreur interne du serveur',
        code: 'INTERNAL_ERROR'
      });
    }
  });

  fastify.get('/:id/summary', { preHandler: [authenticateToken] }, async (request, reply) => {
    try {
      const tournamentId = parseInt(request.params.id);
      
      if (isNaN(tournamentId)) {
        return reply.status(400).send({
          error: 'ID de tournoi invalide',
          code: 'INVALID_ID'
        });
      }
      
      const tournament = db.prepare(`
        SELECT * FROM tournaments WHERE id = ?
      `).get(tournamentId);
      
      if (!tournament) {
        return reply.status(404).send({
          error: 'Tournoi non trouvé',
          code: 'TOURNAMENT_NOT_FOUND'
        });
      }

      const matches = db.prepare(`
        SELECT 
          g.*,
          p1.username as player1_username,
          p1.display_name as player1_display_name,
          p1.avatar_url as player1_avatar,
          p2.username as player2_username,
          p2.display_name as player2_display_name,
          p2.avatar_url as player2_avatar,
          winner.username as winner_username,
          winner.display_name as winner_display_name
        FROM games g
        JOIN users p1 ON p1.id = g.player1_id
        LEFT JOIN users p2 ON p2.id = g.player2_id
        LEFT JOIN users winner ON winner.id = g.winner_id
        WHERE g.tournament_id = ?
        ORDER BY g.created_at ASC
      `).all(tournamentId);

      const ranking = db.prepare(`
        SELECT 
          tp.position,
          tp.user_id,
          u.username,
          u.display_name,
          u.avatar_url,
          -- Statistiques du joueur dans le tournoi
          (SELECT COUNT(*) FROM games 
           WHERE tournament_id = ? 
           AND (player1_id = u.id OR player2_id = u.id) 
           AND status = 'completed') as matches_played,
          (SELECT COUNT(*) FROM games 
           WHERE tournament_id = ? 
           AND winner_id = u.id 
           AND status = 'completed') as matches_won
        FROM tournament_participants tp
        JOIN users u ON u.id = tp.user_id
        WHERE tp.tournament_id = ?
        ORDER BY tp.position ASC NULLS LAST, tp.id ASC
      `).all(tournamentId, tournamentId, tournamentId);

      const matchesByType = {
        semifinals: matches.filter(m => m.match_type === 'semifinal'),
        third_place: matches.find(m => m.match_type === 'third_place') || null,
        final: matches.find(m => m.match_type === 'final') || null
      };

      return reply.send({
        tournament: {
          id: tournament.id,
          name: tournament.name,
          description: tournament.description,
          status: tournament.status,
          winner_id: tournament.winner_id,
          current_players: tournament.current_players,
          max_players: tournament.max_players,
          created_at: tournament.created_at,
          started_at: tournament.started_at,
          ended_at: tournament.ended_at
        },
        matches: {
          all: matches,
          byType: matchesByType
        },
        ranking,
        stats: {
          totalMatches: matches.length,
          completedMatches: matches.filter(m => m.status === 'completed').length,
          totalDuration: matches
            .filter(m => m.status === 'completed' && m.duration)
            .reduce((sum, m) => sum + m.duration, 0)
        }
      });

    } catch (error) {
      fastify.log.error('❌ Erreur lors de la récupération du résumé:', error);
      return reply.status(500).send({
        error: 'Erreur interne du serveur',
        code: 'INTERNAL_ERROR'
      });
    }
  });
}

module.exports = tournamentRoutes;
