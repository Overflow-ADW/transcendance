const { authenticateToken } = require('../middleware/auth');
const bcrypt = require('bcrypt');
const Joi = require('joi');
const path = require('path');
const fs = require('fs');

const updateProfileSchema = Joi.object({
  username: Joi.string().alphanum().min(3).max(30).optional(),
  email: Joi.string().email().optional(),
  display_name: Joi.string().min(1).max(50).optional()
});

const changePasswordSchema = Joi.object({
  currentPassword: Joi.string().required(),
  newPassword: Joi.string().min(8).pattern(new RegExp('^(?=.*[a-z])(?=.*[A-Z])(?=.*\\d)(?=.*[!@#\\$%\\^&\\*])')).required()
    .messages({
      'string.pattern.base': 'Le mot de passe doit contenir au moins une majuscule, une minuscule, un chiffre et un caractère spécial'
    })
});

const addFriendSchema = Joi.object({
  username: Joi.string().required()
});

async function userRoutes(fastify, options) {
  const db = fastify.db;

  fastify.get('/profile', { preHandler: [authenticateToken] }, async (request, reply) => {
    try {
      console.log('Fetching profile for user ID:', request.user.userId);
      const user = db.prepare(`
        SELECT 
          users.id, 
          users.username, 
          users.email, 
          users.display_name, 
          users.avatar_url, 
          users.status,
          users.is_admin, 
          users.two_factor_enabled, 
          users.created_at, 
          users.last_login,
          (SELECT COUNT(*) FROM friends WHERE (user_id = ? OR friend_id = ?) AND status = 'accepted') as friends_count,
          (SELECT COUNT(*) FROM games WHERE (player1_id = ? OR player2_id = ?) AND status = 'completed') as games_played,
          (SELECT COUNT(*) FROM games WHERE status = 'completed' AND 
           ((player1_id = ? AND winner_id = ?) OR (player2_id = ? AND winner_id = ?))) as games_won
        FROM users 
        WHERE users.id = ?
      `).get(
        request.user.userId, request.user.userId,
        request.user.userId, request.user.userId,
        request.user.userId, request.user.userId, request.user.userId, request.user.userId,
        request.user.userId
      );
      
      if (!user) {
        return reply.status(404).send({
          error: 'Utilisateur non trouvé',
          code: 'USER_NOT_FOUND'
        });
      }

      console.log('User data from DB:', user);
      
      const winrate = user.games_played > 0 ? Math.round((user.games_won / user.games_played) * 100) : 0;

      const recentGames = db.prepare(`
        SELECT 
          g.id,
          g.player1_id,
          g.player2_id,
          g.score_player1,
          g.score_player2,
          g.status,
          g.game_mode,
          g.duration,
          g.created_at,
          g.winner_id,
          g.ai_opponent,
          p1.username as player1_username,
          p1.display_name as player1_display_name,
          p1.avatar_url as player1_avatar,
          p2.username as player2_username,
          p2.display_name as player2_display_name,
          p2.avatar_url as player2_avatar,
          CASE 
            WHEN g.winner_id = ? THEN 'win'
            WHEN g.winner_id IS NULL AND g.status = 'completed' THEN 'loss'
            WHEN g.status != 'completed' THEN 'pending'
            ELSE 'loss'
          END as result,
          CASE 
            WHEN g.player1_id = ? THEN g.score_player1
            ELSE g.score_player2
          END as user_score,
          CASE 
            WHEN g.player1_id = ? THEN g.score_player2
            ELSE g.score_player1
          END as opponent_score,
          CASE 
            WHEN g.player1_id = ? THEN p2.username
            ELSE p1.username
          END as opponent_username,
          CASE 
            WHEN g.player1_id = ? THEN p2.display_name
            ELSE p1.display_name
          END as opponent_display_name
        FROM games g
        JOIN users p1 ON p1.id = g.player1_id
        LEFT JOIN users p2 ON p2.id = g.player2_id
        WHERE (g.player1_id = ? OR g.player2_id = ?)
        ORDER BY g.created_at DESC
        LIMIT 10
      `).all(
        request.user.userId, request.user.userId, request.user.userId, 
        request.user.userId, request.user.userId, request.user.userId, request.user.userId
      );

      const detailedStats = db.prepare(`
        SELECT 
          COUNT(CASE WHEN g.status = 'completed' THEN 1 END) as completed_games,
          COUNT(CASE WHEN g.status = 'in_progress' THEN 1 END) as ongoing_games,
          COUNT(CASE WHEN g.winner_id = ? THEN 1 END) as games_won,
          COUNT(CASE WHEN g.status = 'completed' AND g.winner_id != ? AND g.winner_id IS NOT NULL THEN 1 END) as games_lost,
          COUNT(CASE WHEN g.status = 'completed' AND g.winner_id IS NULL THEN 1 END) as games_drawn,
          AVG(CASE WHEN g.status = 'completed' AND g.duration IS NOT NULL THEN g.duration END) as avg_duration,
          MAX(CASE WHEN g.player1_id = ? THEN g.score_player1 ELSE g.score_player2 END) as highest_score,
          
          -- Statistiques VS IA (jeux non-tournoi avec AI)
          COUNT(CASE WHEN g.ai_opponent = TRUE AND g.status = 'completed' THEN 1 END) as vs_ai_total,
          COUNT(CASE WHEN g.ai_opponent = TRUE AND g.winner_id = ? THEN 1 END) as vs_ai_won,
          
          -- Statistiques VS Joueurs (jeux non-tournoi sans AI)  
          COUNT(CASE WHEN g.ai_opponent = FALSE AND g.status = 'completed' THEN 1 END) as vs_players_total,
          COUNT(CASE WHEN g.ai_opponent = FALSE AND g.winner_id = ? THEN 1 END) as vs_players_won
          
        FROM games g 
        WHERE (g.player1_id = ? OR g.player2_id = ?) AND g.tournament_id IS NULL
      `).get(request.user.userId, request.user.userId, request.user.userId, request.user.userId, request.user.userId, request.user.userId, request.user.userId);

      const tournamentStats = db.prepare(`
        SELECT 
          COUNT(DISTINCT t.id) as tournaments_joined,
          COUNT(DISTINCT CASE WHEN t.winner_id = ? THEN t.id END) as tournaments_won
        FROM tournaments t
        JOIN tournament_participants tp ON t.id = tp.tournament_id
        WHERE tp.user_id = ?
      `).get(request.user.userId, request.user.userId);

      if (!user.avatar_url || user.avatar_url === null || user.avatar_url.trim() === '') {
        user.avatar_url = '/uploads/default/defaultavatar.jpg';
      }

      const responseData = {
        id: user.id,
        username: user.username,
        display_name: user.display_name,
        email: user.email,
        avatar_url: user.avatar_url,
        status: user.status,
        created_at: user.created_at,
        last_login: user.last_login,
        winrate: winrate,
        stats: {
          friends: user.friends_count,
          gamesPlayed: detailedStats.completed_games || 0,
          gamesWon: detailedStats.games_won || 0,
          gamesLost: detailedStats.games_lost || 0,
          gamesDrawn: detailedStats.games_drawn || 0,
          ongoingGames: detailedStats.ongoing_games || 0,
          winrate: detailedStats.completed_games > 0 ? Math.round((detailedStats.games_won / detailedStats.completed_games) * 100) : 0,
          avgDuration: detailedStats.avg_duration ? Math.round(detailedStats.avg_duration) : 0,
          highestScore: detailedStats.highest_score || 0,
          
          winRates: {
            vsAI: detailedStats.vs_ai_total > 0 ? Math.round((detailedStats.vs_ai_won / detailedStats.vs_ai_total) * 100) : 0,
            vsPlayers: detailedStats.vs_players_total > 0 ? Math.round((detailedStats.vs_players_won / detailedStats.vs_players_total) * 100) : 0,
            tournaments: tournamentStats.tournaments_won || 0
          },
          
          gamesByType: {
            vsAI: detailedStats.vs_ai_total || 0,
            vsPlayers: detailedStats.vs_players_total || 0,
            tournaments: tournamentStats.tournaments_joined || 0
          }
        },
        recentGames: recentGames
      };

      console.log('Sending response:', responseData);
      return reply.send(responseData);

    } catch (error) {
      fastify.log.error('❌ Erreur lors de la récupération du profil:', error);
      return reply.status(500).send({
        error: 'Erreur interne du serveur',
        code: 'INTERNAL_ERROR'
      });
    }
  });

  fastify.get('/profile/:userId', { preHandler: [authenticateToken] }, async (request, reply) => {
    try {
      const { userId } = request.params;
      const requesterId = request.user.userId;

      const targetUser = db.prepare(`
        SELECT 
          u.id,
          u.username,
          u.display_name,
          u.avatar_url,
          u.status,
          u.created_at,
          u.last_login,
          (SELECT COUNT(*) FROM friends f 
           WHERE (f.user_id = u.id OR f.friend_id = u.id) 
           AND f.status = 'accepted') as friends_count
        FROM users u 
        WHERE u.id = ?
      `).get(userId);
      
      if (!targetUser) {
        return reply.status(404).send({
          error: 'Utilisateur non trouvé',
          code: 'USER_NOT_FOUND'
        });
      }

      const friendship = db.prepare(`
        SELECT status FROM friends 
        WHERE ((user_id = ? AND friend_id = ?) OR (user_id = ? AND friend_id = ?))
        AND status = 'accepted'
      `).get(requesterId, userId, userId, requesterId);

      const areWeFriends = !!friendship;

      const publicStats = db.prepare(`
        SELECT 
          COUNT(CASE WHEN status = 'completed' THEN 1 END) as games_played,
          COUNT(CASE WHEN status = 'completed' AND winner_id = ? THEN 1 END) as games_won,
          COUNT(CASE WHEN status = 'completed' AND winner_id != ? AND winner_id IS NOT NULL THEN 1 END) as games_lost,
          COUNT(CASE WHEN status = 'completed' AND winner_id IS NULL THEN 1 END) as games_drawn,
          COALESCE(AVG(CASE WHEN status = 'completed' THEN duration END), 0) as avg_duration,
          COALESCE(MAX(CASE WHEN status = 'completed' AND player1_id = ? THEN score_player1 
                            WHEN status = 'completed' AND player2_id = ? THEN score_player2 END), 0) as highest_score,
          COUNT(CASE WHEN status = 'completed' AND ai_opponent = 1 THEN 1 END) as vs_ai_total,
          COUNT(CASE WHEN status = 'completed' AND ai_opponent = 1 AND winner_id = ? THEN 1 END) as vs_ai_won,
          COUNT(CASE WHEN status = 'completed' AND ai_opponent = 0 THEN 1 END) as vs_players_total,
          COUNT(CASE WHEN status = 'completed' AND ai_opponent = 0 AND winner_id = ? THEN 1 END) as vs_players_won
        FROM games 
        WHERE (player1_id = ? OR player2_id = ?)
      `).get(userId, userId, userId, userId, userId, userId, userId, userId);

      const tournamentStats = db.prepare(`
        SELECT 
          COUNT(DISTINCT t.id) as tournaments_joined,
          COUNT(DISTINCT CASE WHEN t.winner_id = ? THEN t.id END) as tournaments_won
        FROM tournaments t
        JOIN tournament_participants tp ON t.id = tp.tournament_id
        WHERE tp.user_id = ?
      `).get(userId, userId);

      if (!targetUser.avatar_url || targetUser.avatar_url === null || targetUser.avatar_url.trim() === '') {
        targetUser.avatar_url = '/uploads/default/defaultavatar.jpg';
      }

      let recentGames = [];
      if (areWeFriends) {
        recentGames = db.prepare(`
          SELECT 
            g.id,
            g.score_player1,
            g.score_player2,
            g.game_mode,
            g.duration,
            g.created_at,
            g.winner_id,
            g.ai_opponent,
            CASE 
              WHEN g.winner_id = ? THEN 'win'
              WHEN g.winner_id IS NULL AND g.status = 'completed' THEN 'draw'
              WHEN g.status != 'completed' THEN 'pending'
              ELSE 'loss'
            END as result,
            CASE 
              WHEN g.player1_id = ? THEN g.score_player1
              ELSE g.score_player2
            END as user_score,
            CASE 
              WHEN g.player1_id = ? THEN g.score_player2
              ELSE g.score_player1
            END as opponent_score,
            CASE 
              WHEN g.ai_opponent = 1 THEN 'AI'
              WHEN g.player1_id = ? THEN p2.username
              ELSE p1.username
            END as opponent_username,
            CASE 
              WHEN g.ai_opponent = 1 THEN 'AI'
              WHEN g.player1_id = ? THEN p2.display_name
              ELSE p1.display_name
            END as opponent_display_name
          FROM games g
          LEFT JOIN users p1 ON g.player1_id = p1.id
          LEFT JOIN users p2 ON g.player2_id = p2.id
          WHERE (g.player1_id = ? OR g.player2_id = ?) 
            AND g.status = 'completed'
          ORDER BY g.created_at DESC
          LIMIT 5
        `).all(userId, userId, userId, userId, userId, userId, userId);
      }

      const responseData = {
        id: targetUser.id,
        username: targetUser.username,
        display_name: targetUser.display_name,
        avatar_url: targetUser.avatar_url,
        status: targetUser.status,
        created_at: targetUser.created_at,
        last_login: targetUser.last_login,
        isOwn: false,
        areWeFriends,
        stats: {
          friends: targetUser.friends_count,
          gamesPlayed: publicStats.games_played || 0,
          gamesWon: publicStats.games_won || 0,
          gamesLost: publicStats.games_lost || 0,
          gamesDrawn: publicStats.games_drawn || 0,
          winrate: publicStats.games_played > 0 ? Math.round((publicStats.games_won / publicStats.games_played) * 100) : 0,
          avgDuration: publicStats.avg_duration ? Math.round(publicStats.avg_duration) : 0,
          highestScore: publicStats.highest_score || 0,
          
          winRates: {
            vsAI: publicStats.vs_ai_total > 0 ? Math.round((publicStats.vs_ai_won / publicStats.vs_ai_total) * 100) : 0,
            vsPlayers: publicStats.vs_players_total > 0 ? Math.round((publicStats.vs_players_won / publicStats.vs_players_total) * 100) : 0,
            tournaments: tournamentStats.tournaments_won || 0
          },
          
          gamesByType: {
            vsAI: publicStats.vs_ai_total || 0,
            vsPlayers: publicStats.vs_players_total || 0,
            tournaments: tournamentStats.tournaments_joined || 0
          }
        },
        recentGames: areWeFriends ? recentGames : []
      };

      fastify.log.info(`👤 Profil public consulté: ${targetUser.username} (ID: ${userId}) par ${request.user.username} (ID: ${requesterId}), amis: ${areWeFriends}`);
      
      return reply.send(responseData);

    } catch (error) {
      fastify.log.error('❌ Erreur lors de la récupération du profil public:', error);
      return reply.status(500).send({
        error: 'Erreur interne du serveur',
        code: 'INTERNAL_ERROR'
      });
    }
  });

  fastify.get('/games/history', { preHandler: [authenticateToken] }, async (request, reply) => {
    try {
      const userId = request.user.userId;
      const { page = 1, limit = 10, status, gameMode } = request.query;
      
      const currentPage = Math.max(1, parseInt(page));
      const pageSize = Math.min(50, Math.max(1, parseInt(limit)));
      const offset = (currentPage - 1) * pageSize;

      let filters = [];
      let filterParams = [];
      
      if (status && ['pending', 'in_progress', 'completed', 'cancelled'].includes(status)) {
        filters.push('g.status = ?');
        filterParams.push(status);
      }
      
      if (gameMode && ['classic', 'custom', 'tournament'].includes(gameMode)) {
        filters.push('g.game_mode = ?');
        filterParams.push(gameMode);
      }

      const whereClause = filters.length > 0 ? `AND ${filters.join(' AND ')}` : '';

      const totalCount = db.prepare(`
        SELECT COUNT(*) as count
        FROM games g
        WHERE (g.player1_id = ? OR g.player2_id = ?) ${whereClause}
      `).get(userId, userId, ...filterParams);

      const games = db.prepare(`
        SELECT 
          g.id,
          g.player1_id,
          g.player2_id,
          g.score_player1,
          g.score_player2,
          g.status,
          g.game_mode,
          g.duration,
          g.created_at,
          g.start_time,
          g.end_time,
          g.winner_id,
          g.ai_opponent,
          p1.username as player1_username,
          p1.display_name as player1_display_name,
          p1.avatar_url as player1_avatar,
          p2.username as player2_username,
          p2.display_name as player2_display_name,
          p2.avatar_url as player2_avatar,
          CASE 
            WHEN g.winner_id = ? THEN 'win'
            WHEN g.winner_id IS NULL AND g.status = 'completed' AND g.ai_opponent = 1 THEN 'loss'
            WHEN g.winner_id IS NULL AND g.status = 'completed' AND g.score_player1 = g.score_player2 THEN 'draw'
            WHEN g.status != 'completed' THEN 'pending'
            ELSE 'loss'
          END as result,
          CASE 
            WHEN g.player1_id = ? THEN g.score_player1
            ELSE g.score_player2
          END as user_score,
          CASE 
            WHEN g.player1_id = ? THEN g.score_player2
            ELSE g.score_player1
          END as opponent_score,
          CASE 
            WHEN g.player1_id = ? THEN p2.username
            ELSE p1.username
          END as opponent_username,
          CASE 
            WHEN g.player1_id = ? THEN p2.display_name
            ELSE p1.display_name
          END as opponent_display_name,
          CASE 
            WHEN g.player1_id = ? THEN p2.avatar_url
            ELSE p1.avatar_url
          END as opponent_avatar
        FROM games g
        JOIN users p1 ON p1.id = g.player1_id
        LEFT JOIN users p2 ON p2.id = g.player2_id
        WHERE (g.player1_id = ? OR g.player2_id = ?) ${whereClause}
        ORDER BY g.created_at DESC, g.id DESC
        LIMIT ? OFFSET ?
      `).all(
        userId, userId, userId, userId, userId, userId, 
        userId, userId, ...filterParams, pageSize, offset
      );

      const totalPages = Math.ceil(totalCount.count / pageSize);
      const hasNextPage = currentPage < totalPages;
      const hasPreviousPage = currentPage > 1;

      const pageStats = {
        wins: games.filter(g => g.result === 'win').length,
        losses: games.filter(g => g.result === 'loss').length,
        draws: games.filter(g => g.result === 'draw').length,
        pending: games.filter(g => g.result === 'pending').length
      };

      return reply.send({
        games: games,
        pagination: {
          currentPage,
          totalPages,
          pageSize,
          totalItems: totalCount.count,
          hasNextPage,
          hasPreviousPage,
          nextPage: hasNextPage ? currentPage + 1 : null,
          previousPage: hasPreviousPage ? currentPage - 1 : null
        },
        stats: pageStats,
        filters: {
          status: status || 'all',
          gameMode: gameMode || 'all'
        }
      });

    } catch (error) {
      fastify.log.error('❌ Erreur lors de la récupération de l\'historique des jeux:', error);
      return reply.status(500).send({
        error: 'Erreur interne du serveur',
        code: 'INTERNAL_ERROR'
      });
    }
  });

  fastify.put('/profile', { preHandler: [authenticateToken] }, async (request, reply) => {
    try {
      const { error, value } = updateProfileSchema.validate(request.body);
      if (error) {
        return reply.status(400).send({
          error: 'Données invalides',
          details: error.details[0].message,
          code: 'VALIDATION_ERROR'
        });
      }

      const { username, email, display_name } = value;
      const userId = request.user.userId;

      if (username || email) {
        const conflicts = db.prepare(`
          SELECT username, email FROM users 
          WHERE (username = ? OR email = ?) AND id != ?
        `).get(username || '', email || '', userId);

        if (conflicts) {
          const conflictField = conflicts.username === username ? 'nom d\'utilisateur' : 'adresse email';
          return reply.status(409).send({
            error: 'Conflit de données',
            details: `Ce ${conflictField} est déjà utilisé`,
            code: 'DATA_CONFLICT'
          });
        }
      }

      const updates = [];
      const values = [];

      if (username) {
        updates.push('username = ?');
        values.push(username);
      }
      if (email) {
        updates.push('email = ?');
        values.push(email);
      }
      if (display_name) {
        updates.push('display_name = ?');
        values.push(display_name);
      }

      if (updates.length === 0) {
        return reply.status(400).send({
          error: 'Aucune donnée à mettre à jour',
          code: 'NO_DATA_TO_UPDATE'
        });
      }

      values.push(userId);
      const updateQuery = `UPDATE users SET ${updates.join(', ')}, updated_at = datetime('now') WHERE id = ?`;
      
      const result = db.prepare(updateQuery).run(...values);

      if (result.changes === 0) {
        return reply.status(404).send({
          error: 'Utilisateur non trouvé',
          code: 'USER_NOT_FOUND'
        });
      }

      const updatedUser = db.prepare('SELECT id, username, email, display_name, avatar_url FROM users WHERE id = ?').get(userId);

      fastify.log.info(`✅ Profil mis à jour pour: ${request.user.username} (ID: ${userId})`);

      return reply.send({
        message: 'Profil mis à jour avec succès',
        user: updatedUser,
        code: 'PROFILE_UPDATED'
      });

    } catch (error) {
      fastify.log.error('❌ Erreur lors de la mise à jour du profil:', error);
      return reply.status(500).send({
        error: 'Erreur interne du serveur',
        code: 'INTERNAL_ERROR'
      });
    }
  });

  fastify.put('/password', { preHandler: [authenticateToken] }, async (request, reply) => {
    try {
      const { error, value } = changePasswordSchema.validate(request.body);
      if (error) {
        return reply.status(400).send({
          error: 'Données invalides',
          details: error.details[0].message,
          code: 'VALIDATION_ERROR'
        });
      }

      const { currentPassword, newPassword } = value;
      const userId = request.user.userId;

      const user = db.prepare('SELECT password FROM users WHERE id = ?').get(userId);
      
      if (!user) {
        return reply.status(404).send({
          error: 'Utilisateur non trouvé',
          code: 'USER_NOT_FOUND'
        });
      }

      const passwordMatch = await bcrypt.compare(currentPassword, user.password);
      
      if (!passwordMatch) {
        return reply.status(401).send({
          error: 'Mot de passe actuel incorrect',
          details: 'Veuillez vérifier votre mot de passe actuel',
          code: 'INVALID_CURRENT_PASSWORD'
        });
      }

      const saltRounds = parseInt(process.env.BCRYPT_ROUNDS) || 12;
      const hashedNewPassword = await bcrypt.hash(newPassword, saltRounds);

      const result = db.prepare('UPDATE users SET password = ?, updated_at = datetime(\'now\') WHERE id = ?').run(hashedNewPassword, userId);

      if (result.changes === 0) {
        return reply.status(500).send({
          error: 'Échec de la mise à jour',
          code: 'UPDATE_FAILED'
        });
      }

      fastify.log.info(`🔐 Mot de passe changé pour: ${request.user.username} (ID: ${userId})`);

      return reply.send({
        message: 'Mot de passe changé avec succès',
        code: 'PASSWORD_UPDATED'
      });

    } catch (error) {
      fastify.log.error('❌ Erreur lors du changement de mot de passe:', error);
      return reply.status(500).send({
        error: 'Erreur interne du serveur',
        code: 'INTERNAL_ERROR'
      });
    }
  });

  fastify.post('/avatar', { preHandler: [authenticateToken] }, async (request, reply) => {
    try {
      fastify.log.info(`📸 Upload avatar demandé par utilisateur: ${request.user.username} (ID: ${request.user.userId})`);
      
      const { imageData, fileName, mimeType } = request.body;
      
      fastify.log.info(`📝 Données reçues: fileName=${fileName}, mimeType=${mimeType}, dataLength=${imageData?.length || 0}`);
      
      if (!imageData || !fileName || !mimeType) {
        fastify.log.warn('❌ Données manquantes pour l\'upload d\'avatar');
        return reply.status(400).send({
          error: 'Données d\'image, nom de fichier et type MIME requis',
          code: 'MISSING_IMAGE_DATA'
        });
      }

      const allowedTypes = ['image/png', 'image/jpeg', 'image/jpg', 'image/gif', 'image/webp'];
      if (!allowedTypes.includes(mimeType.toLowerCase())) {
        return reply.status(400).send({
          error: 'Type de fichier non supporté. Utilisez PNG, JPG, JPEG, GIF ou WebP',
          code: 'INVALID_FILE_TYPE',
          acceptedTypes: allowedTypes
        });
      }

      let buffer;
      try {
        const base64Data = imageData.replace(/^data:image\/[a-z]+;base64,/, '');
        buffer = Buffer.from(base64Data, 'base64');
      } catch (error) {
        return reply.status(400).send({
          error: 'Données d\'image invalides',
          code: 'INVALID_IMAGE_DATA'
        });
      }

      const maxSize = 5 * 1024 * 1024;
      if (buffer.length > maxSize) {
        return reply.status(400).send({
          error: 'Le fichier est trop volumineux (max 5MB)',
          code: 'FILE_TOO_LARGE'
        });
      }

      const fileExtension = mimeType.split('/')[1];
      const uniqueFileName = `${request.user.userId}_${Date.now()}.${fileExtension}`;
      const uploadsDir = path.join(__dirname, '..', '..', 'uploads', 'avatars');
      const filePath = path.join(uploadsDir, uniqueFileName);

      if (!fs.existsSync(uploadsDir)) {
        fs.mkdirSync(uploadsDir, { recursive: true });
      }

      const currentUser = db.prepare('SELECT avatar_url FROM users WHERE id = ?').get(request.user.userId);
      if (currentUser?.avatar_url) {
        const oldFileName = currentUser.avatar_url.split('/').pop();
        if (oldFileName && oldFileName !== uniqueFileName) {
          const oldFilePath = path.join(uploadsDir, oldFileName);
          if (fs.existsSync(oldFilePath)) {
            try {
              fs.unlinkSync(oldFilePath);
              fastify.log.info(`🗑️ Ancien avatar supprimé: ${oldFileName}`);
            } catch (err) {
              fastify.log.warn('⚠️ Impossible de supprimer l\'ancien avatar:', err.message);
            }
          }
        }
      }

      await fs.promises.writeFile(filePath, buffer);

      const avatarUrl = `/uploads/avatars/${uniqueFileName}`;

      const result = db.prepare('UPDATE users SET avatar_url = ?, updated_at = datetime(\'now\') WHERE id = ?')
        .run(avatarUrl, request.user.userId);

      if (result.changes === 0) {
        fs.unlinkSync(filePath);
        return reply.status(404).send({
          error: 'Utilisateur non trouvé',
          code: 'USER_NOT_FOUND'
        });
      }

      fastify.log.info(`📸 Avatar uploadé avec succès pour: ${request.user.username} -> ${uniqueFileName}`);

      return reply.send({
        message: 'Avatar uploadé avec succès',
        avatarUrl: avatarUrl,
        fileName: uniqueFileName,
        fileSize: buffer.length,
        code: 'AVATAR_UPLOADED'
      });

    } catch (error) {
      fastify.log.error('❌ Erreur lors de l\'upload de l\'avatar:', error);
      return reply.status(500).send({
        error: 'Erreur lors de l\'upload de l\'avatar',
        code: 'UPLOAD_ERROR'
      });
    }
  });

  fastify.delete('/avatar', { preHandler: [authenticateToken] }, async (request, reply) => {
    try {
      fastify.log.info(`🗑️ Suppression avatar demandée par utilisateur: ${request.user.username} (ID: ${request.user.userId})`);
      
      const currentUser = db.prepare('SELECT avatar_url FROM users WHERE id = ?').get(request.user.userId);
      
      if (currentUser?.avatar_url) {
        const fileName = currentUser.avatar_url.split('/').pop();
        if (fileName) {
          const uploadsDir = path.join(__dirname, '..', '..', 'uploads', 'avatars');
          const filePath = path.join(uploadsDir, fileName);
          
          if (fs.existsSync(filePath)) {
            try {
              fs.unlinkSync(filePath);
              fastify.log.info(`🗑️ Fichier avatar supprimé: ${fileName}`);
            } catch (err) {
              fastify.log.warn('⚠️ Impossible de supprimer le fichier avatar:', err.message);
            }
          } else {
            fastify.log.warn(`⚠️ Fichier avatar introuvable: ${filePath}`);
          }
        }
      } else {
        fastify.log.info('ℹ️ Aucun avatar à supprimer pour cet utilisateur');
      }

      const result = db.prepare('UPDATE users SET avatar_url = NULL, updated_at = datetime(\'now\') WHERE id = ?')
        .run(request.user.userId);

      if (result.changes === 0) {
        return reply.status(404).send({
          error: 'Utilisateur non trouvé',
          code: 'USER_NOT_FOUND'
        });
      }

      fastify.log.info(`️ Avatar supprimé pour: ${request.user.username}`);

      return reply.send({
        message: 'Avatar supprimé avec succès',
        code: 'AVATAR_DELETED'
      });

    } catch (error) {
      fastify.log.error('❌ Erreur lors de la suppression de l\'avatar:', error);
      return reply.status(500).send({
        error: 'Erreur lors de la suppression de l\'avatar',
        code: 'DELETE_ERROR'
      });
    }
  });

  fastify.post('/avatar/cleanup', { preHandler: [authenticateToken] }, async (request, reply) => {
    try {
      const user = db.prepare('SELECT is_admin FROM users WHERE id = ?').get(request.user.userId);
      if (!user?.is_admin) {
        return reply.status(403).send({
          error: 'Accès refusé - Administrateur requis',
          code: 'ACCESS_DENIED'
        });
      }

      const uploadsDir = path.join(__dirname, '..', '..', 'uploads', 'avatars');
      
      if (!fs.existsSync(uploadsDir)) {
        return reply.send({
          message: 'Dossier avatars introuvable',
          cleaned: 0
        });
      }

      const files = fs.readdirSync(uploadsDir);
      
      const avatarsInDB = db.prepare('SELECT avatar_url FROM users WHERE avatar_url IS NOT NULL').all();
      const activeAvatars = avatarsInDB.map(row => {
        const url = row.avatar_url;
        return url ? url.split('/').pop() : null;
      }).filter(Boolean);

      let cleanedCount = 0;
      
      for (const file of files) {
        if (!activeAvatars.includes(file)) {
          try {
            const filePath = path.join(uploadsDir, file);
            fs.unlinkSync(filePath);
            fastify.log.info(`🗑️ Avatar orphelin supprimé: ${file}`);
            cleanedCount++;
          } catch (err) {
            fastify.log.warn(`⚠️ Impossible de supprimer l'avatar orphelin ${file}:`, err.message);
          }
        }
      }

      fastify.log.info(`🧹 Nettoyage terminé: ${cleanedCount} avatars orphelins supprimés`);

      return reply.send({
        message: `Nettoyage terminé avec succès`,
        cleaned: cleanedCount,
        totalFiles: files.length,
        activeAvatars: activeAvatars.length
      });

    } catch (error) {
      fastify.log.error('❌ Erreur lors du nettoyage des avatars:', error);
      return reply.status(500).send({
        error: 'Erreur lors du nettoyage',
        code: 'CLEANUP_ERROR'
      });
    }
  });

  fastify.get('/friends', { preHandler: [authenticateToken] }, async (request, reply) => {
    try {
      const userId = request.user.userId;
      fastify.log.info(`�� Récupération des amis pour l'utilisateur ${userId}`);

      const friendships = db.prepare(`
        SELECT DISTINCT
          CASE 
            WHEN f.user_id = ? THEN f.friend_id
            ELSE f.user_id 
          END as friend_user_id,
          MIN(f.id) as friendship_id,
          MIN(f.created_at) as friends_since,
          'accepted' as friendship_status
        FROM friends f
        WHERE f.status = 'accepted'
          AND (f.user_id = ? OR f.friend_id = ?)
        GROUP BY 
          CASE 
            WHEN f.user_id = ? THEN f.friend_id
            ELSE f.user_id 
          END
      `).all(userId, userId, userId, userId);

      fastify.log.info(`📊 Trouvé ${friendships.length} relations d'amitié`);

      const friends = [];
      for (const friendship of friendships) {
        const friendInfo = db.prepare(`
          SELECT 
            id as user_id,
            username,
            display_name,
            avatar_url,
            status,
            last_login,
            status as online_status
          FROM users 
          WHERE id = ?
        `).get(friendship.friend_user_id);

        if (friendInfo) {
          friends.push({
            id: friendship.friendship_id,
            user_id: friendInfo.user_id,
            username: friendInfo.username,
            display_name: friendInfo.display_name,
            avatar_url: friendInfo.avatar_url,
            status: friendInfo.status,
            last_login: friendInfo.last_login,
            friends_since: friendship.friends_since,
            friendship_status: friendship.friendship_status,
            online_status: friendInfo.online_status
          });
        }
      }

      friends.sort((a, b) => {
        const statusOrder = { 'online': 1, 'offline': 2 };
        const statusA = statusOrder[a.online_status] || 2;
        const statusB = statusOrder[b.online_status] || 2;
        
        if (statusA !== statusB) return statusA - statusB;
        return a.username.localeCompare(b.username);
      });

      const pendingRequests = db.prepare(`
        SELECT 
          f.id as friendship_id,
          u.id,
          u.username,
          u.display_name,
          u.avatar_url,
          f.created_at as requested_at,
          'incoming' as request_type
        FROM friends f
        JOIN users u ON u.id = f.user_id
        WHERE f.friend_id = ? AND f.status = 'pending'
        
        UNION ALL
        
        SELECT 
          f.id as friendship_id,
          u.id,
          u.username,
          u.display_name,
          u.avatar_url,
          f.created_at as requested_at,
          'outgoing' as request_type
        FROM friends f
        JOIN users u ON u.id = f.friend_id
        WHERE f.user_id = ? AND f.status = 'pending'
      `).all(userId, userId);

      return reply.send({
        friends: friends,
        pendingRequests: pendingRequests,
        stats: {
          totalFriends: friends.length,
          onlineFriends: friends.filter(f => f.online_status === 'online').length,
          pendingIncoming: pendingRequests.filter(r => r.request_type === 'incoming').length,
          pendingOutgoing: pendingRequests.filter(r => r.request_type === 'outgoing').length
        }
      });

    } catch (error) {
      fastify.log.error('❌ Erreur lors de la récupération des amis:', error);
      return reply.status(500).send({
        error: 'Erreur interne du serveur',
        code: 'INTERNAL_ERROR'
      });
    }
  });


  fastify.post('/friends', { preHandler: [authenticateToken] }, async (request, reply) => {
    try {
      const { error, value } = addFriendSchema.validate(request.body);
      if (error) {
        return reply.status(400).send({
          error: 'Données invalides',
          details: error.details[0].message,
          code: 'VALIDATION_ERROR'
        });
      }

      const { username } = value;
      const userId = request.user.userId;

      const targetUser = db.prepare('SELECT id, username FROM users WHERE username = ?').get(username);
      
      if (!targetUser) {
        return reply.status(404).send({
          error: 'Utilisateur non trouvé',
          details: `L'utilisateur "${username}" n'existe pas`,
          code: 'USER_NOT_FOUND'
        });
      }

      if (targetUser.id === userId) {
        return reply.status(400).send({
          error: 'Action impossible',
          details: 'Vous ne pouvez pas vous ajouter vous-même en ami',
          code: 'SELF_FRIEND_REQUEST'
        });
      }

      const existingFriendship = db.prepare(`
        SELECT id, status FROM friends 
        WHERE (user_id = ? AND friend_id = ?) OR (user_id = ? AND friend_id = ?)
      `).get(userId, targetUser.id, targetUser.id, userId);

      if (existingFriendship) {
        const statusMessages = {
          pending: 'Une demande d\'amitié est déjà en attente',
          accepted: 'Cet utilisateur est déjà votre ami',
          blocked: 'Cette relation d\'amitié est bloquée'
        };

        return reply.status(409).send({
          error: 'Relation existante',
          details: statusMessages[existingFriendship.status] || 'Une relation existe déjà',
          code: 'FRIENDSHIP_EXISTS'
        });
      }

      const result = db.prepare(`
        INSERT INTO friends (user_id, friend_id, status, created_at)
        VALUES (?, ?, 'pending', datetime('now'))
      `).run(userId, targetUser.id);

      fastify.log.info(`👥 Demande d'amitié envoyée: ${request.user.username} → ${username}`);

      return reply.status(201).send({
        message: `Demande d'amitié envoyée à ${username}`,
        friendRequest: {
          id: result.lastInsertRowid,
          targetUser: {
            id: targetUser.id,
            username: targetUser.username
          },
          status: 'pending'
        },
        code: 'FRIEND_REQUEST_SENT'
      });

    } catch (error) {
      fastify.log.error('❌ Erreur lors de l\'ajout d\'ami:', error);
      return reply.status(500).send({
        error: 'Erreur interne du serveur',
        code: 'INTERNAL_ERROR'
      });
    }
  });

  fastify.put('/friends/:friendId/accept', { preHandler: [authenticateToken] }, async (request, reply) => {
    try {
      fastify.log.info(`🎯 DEBUG: Endpoint d'acceptation atteint`, {
        params: request.params,
        user: request.user?.username,
        userId: request.user?.userId
      });

      const friendId = parseInt(request.params.friendId);
      const userId = request.user.userId;

      fastify.log.info(`🎯 DEBUG: Paramètres parsés`, { friendId, userId });

      if (isNaN(friendId)) {
        fastify.log.warn(`❌ DEBUG: ID invalide - friendId: ${request.params.friendId}`);
        return reply.status(400).send({
          error: 'ID invalide',
          code: 'INVALID_FRIEND_ID'
        });
      }

      fastify.log.info(`🔍 DEBUG: Recherche demande ID ${friendId} pour userId ${userId}`);
      const friendRequest = db.prepare(`
        SELECT f.id, f.user_id, f.friend_id, f.status, u.username as requester_username
        FROM friends f
        JOIN users u ON u.id = f.user_id
        WHERE f.id = ? AND f.friend_id = ? AND f.status = 'pending'
      `).get(friendId, userId);

      fastify.log.info(`🔍 DEBUG: Résultat de la recherche:`, friendRequest);

      if (!friendRequest) {
        fastify.log.warn(`❌ DEBUG: Demande non trouvée - friendId: ${friendId}, userId: ${userId}`);
        return reply.status(404).send({
          error: 'Demande non trouvée',
          details: 'Aucune demande d\'amitié en attente avec cet ID',
          code: 'REQUEST_NOT_FOUND'
        });
      }

      const result = db.prepare('UPDATE friends SET status = \'accepted\', accepted_at = datetime(\'now\') WHERE id = ?').run(friendId);

      if (result.changes === 0) {
        return reply.status(500).send({
          error: 'Échec de l\'acceptation',
          code: 'ACCEPT_FAILED'
        });
      }

      const existingReverse = db.prepare(`
        SELECT id FROM friends 
        WHERE user_id = ? AND friend_id = ?
      `).get(userId, friendRequest.user_id);

      if (!existingReverse) {
        db.prepare(`
          INSERT INTO friends (user_id, friend_id, status, created_at, accepted_at)
          VALUES (?, ?, 'accepted', datetime('now'), datetime('now'))
        `).run(userId, friendRequest.user_id);

        fastify.log.info(`🔗 Relation réciproque créée: ${request.user.username} → ${friendRequest.requester_username}`);
      } else {
        db.prepare(`
          UPDATE friends 
          SET status = 'accepted', accepted_at = datetime('now')
          WHERE user_id = ? AND friend_id = ?
        `).run(userId, friendRequest.user_id);

        fastify.log.info(`🔗 Relation réciproque mise à jour: ${request.user.username} → ${friendRequest.requester_username}`);
      }

      fastify.log.info(`✅ Amitié acceptée: ${request.user.username} ↔ ${friendRequest.requester_username}`);

      return reply.send({
        message: `Vous êtes maintenant ami avec ${friendRequest.requester_username}`,
        friendship: {
          id: friendId,
          friendUsername: friendRequest.requester_username,
          status: 'accepted'
        },
        code: 'FRIENDSHIP_ACCEPTED'
      });

    } catch (error) {
      fastify.log.error('❌ Erreur lors de l\'acceptation d\'amitié:', error);
      return reply.status(500).send({
        error: 'Erreur interne du serveur',
        code: 'INTERNAL_ERROR'
      });
    }
  });

  fastify.delete('/friends/:friendId', { preHandler: [authenticateToken] }, async (request, reply) => {
    try {
      const friendId = parseInt(request.params.friendId);
      const userId = request.user.userId;

      if (isNaN(friendId)) {
        return reply.status(400).send({
          error: 'ID invalide',
          code: 'INVALID_FRIEND_ID'
        });
      }

      const friendship = db.prepare(`
        SELECT f.id, f.user_id, f.friend_id, u.username as friend_username
        FROM friends f
        JOIN users u ON (
          CASE 
            WHEN f.user_id = ? THEN u.id = f.friend_id
            ELSE u.id = f.user_id
          END
        )
        WHERE f.id = ? AND (f.user_id = ? OR f.friend_id = ?)
      `).get(userId, friendId, userId, userId);

      if (!friendship) {
        return reply.status(404).send({
          error: 'Relation non trouvée',
          details: 'Aucune relation d\'amitié avec cet ID',
          code: 'FRIENDSHIP_NOT_FOUND'
        });
      }

      const user1Id = friendship.user_id;
      const user2Id = friendship.friend_id;

      const result = db.prepare(`
        DELETE FROM friends 
        WHERE (user_id = ? AND friend_id = ?) OR (user_id = ? AND friend_id = ?)
      `).run(user1Id, user2Id, user2Id, user1Id);

      if (result.changes === 0) {
        return reply.status(500).send({
          error: 'Échec de la suppression',
          code: 'DELETE_FAILED'
        });
      }

      fastify.log.info(`💔 Amitié supprimée: ${request.user.username} X ${friendship.friend_username}`);

      return reply.send({
        message: `Vous n'êtes plus ami avec ${friendship.friend_username}`,
        code: 'FRIENDSHIP_REMOVED'
      });

    } catch (error) {
      fastify.log.error('❌ Erreur lors de la suppression d\'ami:', error);
      return reply.status(500).send({
        error: 'Erreur interne du serveur',
        code: 'INTERNAL_ERROR'
      });
    }
  });

  fastify.get('/search', { preHandler: [authenticateToken] }, async (request, reply) => {
    try {
      const { q: query, limit = 10 } = request.query;

      if (!query || query.length < 2) {
        return reply.status(400).send({
          error: 'Requête trop courte',
          details: 'Minimum 2 caractères requis pour la recherche',
          code: 'QUERY_TOO_SHORT'
        });
      }

      const searchLimit = Math.min(parseInt(limit), 50);

      const users = db.prepare(`
        SELECT 
          id, username, display_name, avatar_url,
          CASE 
            WHEN id IN (
              SELECT CASE WHEN user_id = ? THEN friend_id ELSE user_id END
              FROM friends 
              WHERE (user_id = ? OR friend_id = ?) AND status = 'accepted'
            ) THEN 'friend'
            WHEN id IN (
              SELECT CASE WHEN user_id = ? THEN friend_id ELSE user_id END
              FROM friends 
              WHERE (user_id = ? OR friend_id = ?) AND status = 'pending'
            ) THEN 'pending'
            ELSE 'none'
          END as friendship_status
        FROM users 
        WHERE (username LIKE ? OR display_name LIKE ?) 
        AND id != ? 
        ORDER BY 
          CASE WHEN username = ? THEN 1
               WHEN username LIKE ? THEN 2
               WHEN display_name LIKE ? THEN 3
               ELSE 4 END,
          username ASC
        LIMIT ?
      `).all(
        request.user.userId, request.user.userId, request.user.userId,
        request.user.userId, request.user.userId, request.user.userId,
        `%${query}%`, `%${query}%`,
        request.user.userId,
        query, `${query}%`, `${query}%`,
        searchLimit
      );

      return reply.send({
        query: query,
        results: users,
        count: users.length
      });

    } catch (error) {
      fastify.log.error('❌ Erreur lors de la recherche d\'utilisateurs:', error);
      return reply.status(500).send({
        error: 'Erreur interne du serveur',
        code: 'INTERNAL_ERROR'
      });
    }
  });

  fastify.get('/stats', { preHandler: [authenticateToken] }, async (request, reply) => {
    try {
      const userId = request.user.userId;

      const stats = db.prepare(`
        SELECT 
          u.username,
          u.display_name,
          u.avatar_url,
          u.email,
          u.status,
          u.is_admin,
          u.two_factor_enabled,
          u.created_at,
          COUNT(DISTINCT f.id) as total_friends,
          COUNT(DISTINCT CASE WHEN g.player1_id = ? OR g.player2_id = ? THEN g.id END) as total_games,
          COUNT(DISTINCT CASE 
            WHEN (g.player1_id = ? AND g.player1_score > g.player2_score) OR
                 (g.player2_id = ? AND g.player2_score > g.player1_score) 
            THEN g.id END) as games_won,
          COUNT(DISTINCT CASE WHEN t.creator_id = ? THEN t.id END) as tournaments_created,
          COUNT(DISTINCT tp.tournament_id) as tournaments_joined,
          COUNT(DISTINCT CASE WHEN tp.final_position = 1 THEN tp.tournament_id END) as tournaments_won
        FROM users u
        LEFT JOIN friends f ON (f.user_id = ? OR f.friend_id = ?) AND f.status = 'accepted'
        LEFT JOIN games g ON (g.player1_id = ? OR g.player2_id = ?) AND g.status = 'completed'
        LEFT JOIN tournaments t ON t.creator_id = ?
        LEFT JOIN tournament_participants tp ON tp.user_id = ?
        WHERE u.id = ?
      `).get(
        userId, userId, userId, userId, userId, 
        userId, userId, userId, userId, userId, userId, userId
      );

      const recentGames = [];

      const winrate = stats.total_games > 0 ? 
        Math.round((stats.games_won / stats.total_games) * 100) : 0;

      return reply.send({
        stats: {
          ...stats,
          winrate: winrate
        },
        recentGames: recentGames
      });

    } catch (error) {
      fastify.log.error('❌ Erreur lors de la récupération des statistiques:', error);
      return reply.status(500).send({
        error: 'Erreur interne du serveur',
        code: 'INTERNAL_ERROR'
      });
    }
  });
}

module.exports = userRoutes;
