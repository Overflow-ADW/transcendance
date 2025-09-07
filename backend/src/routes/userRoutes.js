// src/routes/userRoutes.js
const { authenticateToken } = require('../middleware/auth');
const bcrypt = require('bcrypt');
const Joi = require('joi');
const path = require('path');
const fs = require('fs');

// Schémas de validation
const updateProfileSchema = Joi.object({
  username: Joi.string().alphanum().min(3).max(30).optional(),
  email: Joi.string().email().optional(),
  display_name: Joi.string().min(1).max(50).optional()
});

const changePasswordSchema = Joi.object({
  currentPassword: Joi.string().required(),
  newPassword: Joi.string().min(8).pattern(new RegExp('^(?=.*[a-z])(?=.*[A-Z])(?=.*\\d)')).required()
});

const addFriendSchema = Joi.object({
  username: Joi.string().required()
});

async function userRoutes(fastify, options) {
  const db = fastify.db;

  // ========================================
  // ROUTE DE RÉCUPÉRATION DU PROFIL COMPLET
  // ========================================
  fastify.get('/profile', { preHandler: [authenticateToken] }, async (request, reply) => {
    try {
      const user = db.prepare(`
        SELECT id, username, email, display_name, avatar_url, status, 
               is_admin, two_factor_enabled, created_at, last_login,
               (SELECT COUNT(*) FROM friends WHERE (user_id = ? OR friend_id = ?) AND status = 'accepted') as friends_count,
               (SELECT COUNT(*) FROM games WHERE (player1_id = ? OR player2_id = ?) AND status = 'completed') as games_played,
               (SELECT COUNT(*) FROM games WHERE status = 'completed' AND 
                ((player1_id = ? AND winner_id = ?) OR (player2_id = ? AND winner_id = ?))) as games_won
        FROM users WHERE id = ?
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

      // Calculer le winrate
      const winrate = user.games_played > 0 ? Math.round((user.games_won / user.games_played) * 100) : 0;

      return reply.send({
        user: {
          ...user,
          winrate: winrate,
          stats: {
            friends: user.friends_count,
            gamesPlayed: user.games_played,
            gamesWon: user.games_won,
            winrate: winrate
          }
        }
      });

    } catch (error) {
      fastify.log.error('❌ Erreur lors de la récupération du profil:', error);
      return reply.status(500).send({
        error: 'Erreur interne du serveur',
        code: 'INTERNAL_ERROR'
      });
    }
  });

  // ========================================
  // ROUTE DE MISE À JOUR DU PROFIL
  // ========================================
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

      // Vérifier les conflits d'unicité
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

      // Construire la requête de mise à jour dynamiquement
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

      // Récupérer le profil mis à jour
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

  // ========================================
  // ROUTE DE CHANGEMENT DE MOT DE PASSE
  // ========================================
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

      // Récupérer le mot de passe actuel
      const user = db.prepare('SELECT password FROM users WHERE id = ?').get(userId);
      
      if (!user) {
        return reply.status(404).send({
          error: 'Utilisateur non trouvé',
          code: 'USER_NOT_FOUND'
        });
      }

      // Vérifier le mot de passe actuel
      const passwordMatch = await bcrypt.compare(currentPassword, user.password);
      
      if (!passwordMatch) {
        return reply.status(401).send({
          error: 'Mot de passe actuel incorrect',
          details: 'Veuillez vérifier votre mot de passe actuel',
          code: 'INVALID_CURRENT_PASSWORD'
        });
      }

      // Hacher le nouveau mot de passe
      const saltRounds = parseInt(process.env.BCRYPT_ROUNDS) || 12;
      const hashedNewPassword = await bcrypt.hash(newPassword, saltRounds);

      // Mettre à jour le mot de passe
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

  // ========================================
  // ROUTE D'UPLOAD D'AVATAR (BASIQUE)
  // ========================================
  fastify.post('/avatar', { preHandler: [authenticateToken] }, async (request, reply) => {
    try {
      // Pour l'instant, on simule juste l'upload
      // TODO: Implémenter multipart/form-data avec @fastify/multipart
      
      const { avatarUrl } = request.body;
      
      if (!avatarUrl) {
        return reply.status(400).send({
          error: 'URL d\'avatar requise',
          code: 'AVATAR_URL_REQUIRED'
        });
      }

      // Mettre à jour l'avatar en base
      const result = db.prepare('UPDATE users SET avatar_url = ?, updated_at = datetime(\'now\') WHERE id = ?')
        .run(avatarUrl, request.user.userId);

      if (result.changes === 0) {
        return reply.status(404).send({
          error: 'Utilisateur non trouvé',
          code: 'USER_NOT_FOUND'
        });
      }

      fastify.log.info(`📸 Avatar mis à jour pour: ${request.user.username}`);

      return reply.send({
        message: 'Avatar mis à jour avec succès',
        avatarUrl: avatarUrl,
        code: 'AVATAR_UPDATED'
      });

    } catch (error) {
      fastify.log.error('❌ Erreur lors de la mise à jour de l\'avatar:', error);
      return reply.status(500).send({
        error: 'Erreur interne du serveur',
        code: 'INTERNAL_ERROR'
      });
    }
  });

  // ========================================
  // ROUTE DE RÉCUPÉRATION DE LA LISTE D'AMIS
  // ========================================
  fastify.get('/friends', { preHandler: [authenticateToken] }, async (request, reply) => {
    try {
      const userId = request.user.userId;

      // Récupérer la liste des amis avec leurs informations et statut
      const friends = db.prepare(`
        SELECT 
          u.id,
          u.username,
          u.display_name,
          u.avatar_url,
          u.status,
          u.last_login,
          f.created_at as friends_since,
          f.status as friendship_status,
          CASE 
            WHEN u.status = 'online' AND datetime('now', '-5 minutes') <= datetime(u.last_login) THEN 'online'
            WHEN datetime('now', '-1 day') <= datetime(u.last_login) THEN 'away'
            ELSE 'offline'
          END as online_status
        FROM friends f
        JOIN users u ON (
          CASE 
            WHEN f.user_id = ? THEN u.id = f.friend_id
            ELSE u.id = f.user_id
          END
        )
        WHERE (f.user_id = ? OR f.friend_id = ?) 
        AND f.status = 'accepted'
        ORDER BY 
          CASE WHEN online_status = 'online' THEN 1
               WHEN online_status = 'away' THEN 2
               ELSE 3 END,
          u.username ASC
      `).all(userId, userId, userId);

      // Récupérer les demandes d'amitié en attente
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

  // ========================================
  // ROUTE D'AJOUT D'AMI
  // ========================================
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

      // Vérifier que l'utilisateur cible existe
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

      // Vérifier s'il existe déjà une relation d'amitié
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

      // Créer la demande d'amitié
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

  // ========================================
  // ROUTE D'ACCEPTATION DE DEMANDE D'AMITIÉ
  // ========================================
  fastify.put('/friends/:friendId/accept', { preHandler: [authenticateToken] }, async (request, reply) => {
    try {
      const friendId = parseInt(request.params.friendId);
      const userId = request.user.userId;

      if (isNaN(friendId)) {
        return reply.status(400).send({
          error: 'ID invalide',
          code: 'INVALID_FRIEND_ID'
        });
      }

      // Vérifier que la demande existe et est en attente
      const friendRequest = db.prepare(`
        SELECT f.id, f.user_id, f.friend_id, f.status, u.username as requester_username
        FROM friends f
        JOIN users u ON u.id = f.user_id
        WHERE f.id = ? AND f.friend_id = ? AND f.status = 'pending'
      `).get(friendId, userId);

      if (!friendRequest) {
        return reply.status(404).send({
          error: 'Demande non trouvée',
          details: 'Aucune demande d\'amitié en attente avec cet ID',
          code: 'REQUEST_NOT_FOUND'
        });
      }

      // Accepter la demande
      const result = db.prepare('UPDATE friends SET status = \'accepted\', accepted_at = datetime(\'now\') WHERE id = ?').run(friendId);

      if (result.changes === 0) {
        return reply.status(500).send({
          error: 'Échec de l\'acceptation',
          code: 'ACCEPT_FAILED'
        });
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

  // ========================================
  // ROUTE DE SUPPRESSION D'AMI
  // ========================================
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

      // Vérifier que la relation existe
      const friendship = db.prepare(`
        SELECT f.id, u.username as friend_username
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

      // Supprimer la relation
      const result = db.prepare('DELETE FROM friends WHERE id = ?').run(friendId);

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

  // ========================================
  // ROUTE DE RECHERCHE D'UTILISATEURS
  // ========================================
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

      const searchLimit = Math.min(parseInt(limit), 50); // Max 50 résultats

      // Rechercher des utilisateurs
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

  // ========================================
  // ROUTE DE STATISTIQUES UTILISATEUR
  // ========================================
  fastify.get('/stats', { preHandler: [authenticateToken] }, async (request, reply) => {
    try {
      const userId = request.user.userId;

      // Statistiques complètes de l'utilisateur
      const stats = db.prepare(`
        SELECT 
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

      // Dernières parties (simulé pour l'instant)
      const recentGames = [];

      // Calculer le winrate
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
