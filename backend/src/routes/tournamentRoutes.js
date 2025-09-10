// src/routes/tournamentRoutes.js
const { authenticateToken } = require('../middleware/auth');
const Joi = require('joi');

// Schémas de validation adaptés à la structure existante
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

  // ========================================
  // ROUTE DE CRÉATION DE TOURNOI
  // ========================================
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

      // Créer le tournoi avec la structure existante
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

      // Ajouter automatiquement le créateur comme participant
      db.prepare(`
        INSERT INTO tournament_participants (
          tournament_id, 
          user_id
        ) VALUES (?, ?)
      `).run(tournamentId, creatorId);

      // Récupérer les détails complets du tournoi
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

  // ========================================
  // ROUTE DE RÉCUPÉRATION DES TOURNOIS
  // ========================================
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

  // ========================================
  // ROUTE DE RÉCUPÉRATION D'UN TOURNOI SPÉCIFIQUE
  // ========================================
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
      
      // Récupérer les participants
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
      
      // Récupérer les matchs du tournoi
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

  // ========================================
  // ROUTE POUR REJOINDRE UN TOURNOI
  // ========================================
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
      
      // Vérifier si le tournoi existe et peut accepter de nouveaux participants
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
      
      // Vérifier si l'utilisateur est déjà inscrit
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
      
      // Transaction pour ajouter le participant et mettre à jour le compteur
      const updateTournament = db.prepare(`
        UPDATE tournaments 
        SET current_players = current_players + 1
        WHERE id = ?
      `);
      
      const addParticipant = db.prepare(`
        INSERT INTO tournament_participants (tournament_id, user_id) 
        VALUES (?, ?)
      `);
      
      // Exécuter la transaction
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

  // ========================================
  // ROUTE POUR AJOUTER UN PARTICIPANT (créateur seulement)
  // ========================================
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
      
      // Vérifier si le tournoi existe et appartient à l'utilisateur
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
      
      // Vérifier si l'utilisateur à ajouter existe
      const userToAdd = db.prepare('SELECT id, username FROM users WHERE id = ?').get(userId);
      
      if (!userToAdd) {
        return reply.status(404).send({
          error: 'Utilisateur non trouvé',
          code: 'USER_NOT_FOUND'
        });
      }
      
      // Vérifier si l'utilisateur est déjà inscrit
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
      
      // Transaction pour ajouter le participant et mettre à jour le compteur
      const updateTournament = db.prepare(`
        UPDATE tournaments 
        SET current_players = current_players + 1
        WHERE id = ?
      `);
      
      const addParticipant = db.prepare(`
        INSERT INTO tournament_participants (tournament_id, user_id) 
        VALUES (?, ?)
      `);
      
      // Exécuter la transaction
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

  // ========================================
  // ROUTE POUR DÉMARRER UN TOURNOI
  // ========================================
  fastify.post('/:id/start', { preHandler: [authenticateToken] }, async (request, reply) => {
    try {
      const tournamentId = parseInt(request.params.id);
      
      if (isNaN(tournamentId)) {
        return reply.status(400).send({
          error: 'ID de tournoi invalide',
          code: 'INVALID_ID'
        });
      }
      
      // Vérifier si le tournoi existe et appartient à l'utilisateur
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

      // Récupérer tous les participants
      const participants = db.prepare(`
        SELECT tp.user_id, u.username, u.display_name 
        FROM tournament_participants tp
        JOIN users u ON u.id = tp.user_id
        WHERE tp.tournament_id = ?
        ORDER BY tp.id ASC
      `).all(tournamentId);

      // Débuter une transaction pour créer les matchs
      const createMatches = db.transaction(() => {
        // Mettre à jour le statut du tournoi
        db.prepare(`
          UPDATE tournaments 
          SET status = 'active', started_at = datetime('now')
          WHERE id = ?
        `).run(tournamentId);

        // Créer les matchs selon le format
        if (tournament.format === 'elimination') {
          createEliminationMatches(db, tournamentId, participants);
        } else {
          // Pour l'instant, on ne gère que l'élimination
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

  // ========================================
  // FONCTION UTILITAIRE : CRÉER LES MATCHS D'ÉLIMINATION
  // ========================================
  function createEliminationMatches(db, tournamentId, participants) {
    // Pour un tournoi à élimination directe avec 2-4 joueurs
    if (participants.length === 2) {
      // Finale directe
      db.prepare(`
        INSERT INTO games (
          tournament_id, player1_id, player2_id, 
          game_mode, status, created_at, match_type, ai_opponent
        ) VALUES (?, ?, ?, 'tournament', 'waiting', datetime('now'), 'final', 0)
      `).run(tournamentId, participants[0].user_id, participants[1].user_id);
      
    } else if (participants.length === 3) {
      // 1 demi-finale + 1 finale (pas de petite finale avec 3 joueurs)
      // Demi-finale : participant 0 vs participant 1
      db.prepare(`
        INSERT INTO games (
          tournament_id, player1_id, player2_id, 
          game_mode, status, created_at, match_type, ai_opponent
        ) VALUES (?, ?, ?, 'tournament', 'waiting', datetime('now'), 'semifinal', 0)
      `).run(tournamentId, participants[0].user_id, participants[1].user_id);
      
    } else if (participants.length === 4) {
      // 2 demi-finales + 1 petite finale + 1 finale
      // Demi-finale 1 : participant 0 vs participant 1
      db.prepare(`
        INSERT INTO games (
          tournament_id, player1_id, player2_id, 
          game_mode, status, created_at, match_type, ai_opponent
        ) VALUES (?, ?, ?, 'tournament', 'waiting', datetime('now'), 'semifinal', 0)
      `).run(tournamentId, participants[0].user_id, participants[1].user_id);
      
      // Demi-finale 2 : participant 2 vs participant 3
      db.prepare(`
        INSERT INTO games (
          tournament_id, player1_id, player2_id, 
          game_mode, status, created_at, match_type, ai_opponent
        ) VALUES (?, ?, ?, 'tournament', 'waiting', datetime('now'), 'semifinal', 0)
      `).run(tournamentId, participants[2].user_id, participants[3].user_id);
      
      // La petite finale et la finale seront créées après les demi-finales
    }
  }

  // ========================================
  // FONCTION UTILITAIRE : OBTENIR LA STRUCTURE DES MATCHS
  // ========================================
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
        player1: null, // Gagnant de la demi
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
        player1: null, // Gagnant demi 1
        player2: null  // Gagnant demi 2
      };
    }

    return matches;
  }

  // ========================================
  // ROUTE POUR RÉCUPÉRER LES MATCHS D'UN TOURNOI
  // ========================================
  fastify.get('/:id/matches', { preHandler: [authenticateToken] }, async (request, reply) => {
    try {
      const tournamentId = parseInt(request.params.id);
      
      if (isNaN(tournamentId)) {
        return reply.status(400).send({
          error: 'ID de tournoi invalide',
          code: 'INVALID_ID'
        });
      }
      
      // Récupérer les matchs du tournoi
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

  // ========================================
  // ROUTE POUR JOUER/TERMINER UN MATCH
  // ========================================
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

      // Récupérer le match
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

      // Mettre à jour le match avec toutes les informations nécessaires
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

      // Vérifier si on doit créer les prochains matchs
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

  // ========================================
  // FONCTION : CRÉER LES MATCHS SUIVANTS
  // ========================================
  async function createNextMatches(db, tournamentId) {
    // Récupérer le tournoi
    const tournament = db.prepare('SELECT * FROM tournaments WHERE id = ?').get(tournamentId);
    
    // Récupérer tous les matchs du tournoi
    const allMatches = db.prepare(`
      SELECT * FROM games 
      WHERE tournament_id = ?
      ORDER BY created_at ASC
    `).all(tournamentId);

    const completedMatches = allMatches.filter(m => m.status === 'completed');
    const totalParticipants = tournament.current_players;

    // Logique pour 4 joueurs : 2 demi-finales → petite finale → grande finale
    if (totalParticipants === 4 && completedMatches.length === 2) {
      // Les 2 demi-finales sont terminées
      const semifinal1 = completedMatches[0]; // Premier match
      const semifinal2 = completedMatches[1]; // Deuxième match

      // Identifier les perdants et gagnants de chaque demi-finale
      const loser1 = semifinal1.player1_id === semifinal1.winner_id 
        ? semifinal1.player2_id : semifinal1.player1_id;
      const winner1 = semifinal1.winner_id;
      
      const loser2 = semifinal2.player1_id === semifinal2.winner_id 
        ? semifinal2.player2_id : semifinal2.player1_id;
      const winner2 = semifinal2.winner_id;
      
      // Créer la petite finale (3ème place) - perdants des demi-finales
      // Elle se joue AVANT la grande finale
      db.prepare(`
        INSERT INTO games (
          tournament_id, player1_id, player2_id, 
          game_mode, status, created_at, match_type, ai_opponent
        ) VALUES (?, ?, ?, 'tournament', 'waiting', datetime('now'), 'third_place', 0)
      `).run(tournamentId, loser1, loser2);
      
      // Créer la grande finale - gagnants des demi-finales
      // Elle se joue APRÈS la petite finale
      db.prepare(`
        INSERT INTO games (
          tournament_id, player1_id, player2_id, 
          game_mode, status, created_at, match_type, ai_opponent
        ) VALUES (?, ?, ?, 'tournament', 'waiting', datetime('now'), 'final', 0)
      `).run(tournamentId, winner1, winner2);
      
    } else if (totalParticipants === 3 && completedMatches.length === 1) {
      // Pour 3 joueurs : 1 demi-finale → finale directe avec le 3ème
      const winner1 = completedMatches[0].winner_id;
      
      // Trouver le 3ème participant (celui qui n'a pas joué la demi)
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
      // Pour 2 joueurs : finale directe (déjà créée au début)
      // Pas d'action nécessaire
    }

    // Vérifier si le tournoi est terminé (tous les matchs joués)
    const totalMatches = db.prepare(`
      SELECT COUNT(*) as count FROM games WHERE tournament_id = ?
    `).get(tournamentId).count;
    
    const completedMatchesCount = completedMatches.length;

    // Si tous les matchs sont terminés, calculer le classement final
    if (totalMatches === completedMatchesCount) {
      await calculateFinalRanking(db, tournamentId);
    }
  }

  // ========================================
  // FONCTION : CALCULER LE CLASSEMENT FINAL
  // ========================================
  async function calculateFinalRanking(db, tournamentId) {
    try {
      // Récupérer tous les matchs terminés du tournoi
      const matches = db.prepare(`
        SELECT * FROM games 
        WHERE tournament_id = ? AND status = 'completed'
        ORDER BY created_at ASC
      `).all(tournamentId);

      // Trouver les matchs par type
      const semifinal1 = matches.find((m, index) => m.match_type === 'semifinal' && index === 0);
      const semifinal2 = matches.find((m, index) => m.match_type === 'semifinal' && index === 1);
      const thirdPlaceMatch = matches.find(m => m.match_type === 'third_place');
      const finalMatch = matches.find(m => m.match_type === 'final');

      if (finalMatch) {
        // 1ère place : gagnant de la grande finale
        const firstPlace = finalMatch.winner_id;
        // 2ème place : perdant de la grande finale
        const secondPlace = finalMatch.player1_id === firstPlace ? finalMatch.player2_id : finalMatch.player1_id;
        
        // Mettre à jour les positions
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

        // 3ème et 4ème place selon la petite finale
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
          // Pour un tournoi à 3 joueurs, le perdant de la demi-finale est 3ème
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

        // Finaliser le tournoi
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
      
      // Vérifier si le tournoi existe
      const tournament = db.prepare('SELECT * FROM tournaments WHERE id = ?').get(tournamentId);
      
      if (!tournament) {
        return reply.status(404).send({
          error: 'Tournoi non trouvé',
          code: 'TOURNAMENT_NOT_FOUND'
        });
      }
      
      // Récupérer les participants
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

  // ========================================
  // ROUTE POUR QUITTER UN TOURNOI
  // ========================================
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
      
      // Vérifier si le tournoi existe
      const tournament = db.prepare(`SELECT * FROM tournaments WHERE id = ?`).get(tournamentId);
      
      if (!tournament) {
        return reply.status(404).send({
          error: 'Tournoi non trouvé',
          code: 'TOURNAMENT_NOT_FOUND'
        });
      }
      
      // Ne pas permettre de quitter si le tournoi a démarré
      if (tournament.status !== 'waiting') {
        return reply.status(400).send({
          error: 'Impossible de quitter un tournoi qui a déjà démarré',
          code: 'TOURNAMENT_STARTED'
        });
      }
      
      // Ne pas permettre au créateur de quitter son propre tournoi
      if (tournament.created_by === userId) {
        return reply.status(400).send({
          error: 'Le créateur ne peut pas quitter son propre tournoi',
          code: 'CREATOR_CANNOT_LEAVE'
        });
      }
      
      // Vérifier si l'utilisateur participe au tournoi
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
      
      // Transaction pour supprimer le participant et mettre à jour le compteur
      const updateTournament = db.prepare(`
        UPDATE tournaments 
        SET current_players = current_players - 1
        WHERE id = ?
      `);
      
      const removeParticipant = db.prepare(`
        DELETE FROM tournament_participants
        WHERE tournament_id = ? AND user_id = ?
      `);
      
      // Exécuter la transaction
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

  // ========================================
  // ROUTE POUR RÉCUPÉRER LE CLASSEMENT FINAL D'UN TOURNOI
  // ========================================
  fastify.get('/:id/ranking', { preHandler: [authenticateToken] }, async (request, reply) => {
    try {
      const tournamentId = parseInt(request.params.id);
      
      if (isNaN(tournamentId)) {
        return reply.status(400).send({
          error: 'ID de tournoi invalide',
          code: 'INVALID_ID'
        });
      }
      
      // Récupérer le tournoi
      const tournament = db.prepare(`
        SELECT * FROM tournaments WHERE id = ?
      `).get(tournamentId);
      
      if (!tournament) {
        return reply.status(404).send({
          error: 'Tournoi non trouvé',
          code: 'TOURNAMENT_NOT_FOUND'
        });
      }

      // Récupérer le classement final
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

  // ========================================
  // ROUTE POUR RÉCUPÉRER LE RÉSUMÉ COMPLET D'UN TOURNOI
  // ========================================
  fastify.get('/:id/summary', { preHandler: [authenticateToken] }, async (request, reply) => {
    try {
      const tournamentId = parseInt(request.params.id);
      
      if (isNaN(tournamentId)) {
        return reply.status(400).send({
          error: 'ID de tournoi invalide',
          code: 'INVALID_ID'
        });
      }
      
      // Récupérer le tournoi
      const tournament = db.prepare(`
        SELECT * FROM tournaments WHERE id = ?
      `).get(tournamentId);
      
      if (!tournament) {
        return reply.status(404).send({
          error: 'Tournoi non trouvé',
          code: 'TOURNAMENT_NOT_FOUND'
        });
      }

      // Récupérer tous les matchs avec détails complets
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

      // Récupérer le classement final
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

      // Organiser les matchs par type pour la lisibilité
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
