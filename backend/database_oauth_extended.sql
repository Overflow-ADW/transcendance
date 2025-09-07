-- Mise à jour de la base de données pour OAuth étendu

-- Table pour les logs OAuth (audit trail)
CREATE TABLE IF NOT EXISTS oauth_logs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER,
  action TEXT NOT NULL, -- 'login', 'link', 'unlink', 'refresh', 'bulk_unlink'
  provider TEXT NOT NULL,
  details TEXT, -- JSON avec IP, user agent, etc.
  timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
  ip_address TEXT,
  user_agent TEXT,
  FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
);

-- Index pour optimiser les requêtes de logs
CREATE INDEX IF NOT EXISTS idx_oauth_logs_user ON oauth_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_oauth_logs_timestamp ON oauth_logs(timestamp);
CREATE INDEX IF NOT EXISTS idx_oauth_logs_action ON oauth_logs(action);
CREATE INDEX IF NOT EXISTS idx_oauth_logs_provider ON oauth_logs(provider);

-- Mise à jour de la table oauth_providers pour supporter plus de données
ALTER TABLE oauth_providers ADD COLUMN additional_data TEXT; -- JSON pour données spécifiques par provider
ALTER TABLE oauth_providers ADD COLUMN last_used DATETIME;
ALTER TABLE oauth_providers ADD COLUMN refresh_token TEXT; -- Pour les providers qui le supportent
ALTER TABLE oauth_providers ADD COLUMN token_expires_at DATETIME;

-- Index pour optimiser les nouvelles colonnes
CREATE INDEX IF NOT EXISTS idx_oauth_providers_last_used ON oauth_providers(last_used);

-- Table pour les tentatives de connexion OAuth (sécurité)
CREATE TABLE IF NOT EXISTS oauth_attempts (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  ip_address TEXT NOT NULL,
  provider TEXT NOT NULL,
  attempt_type TEXT NOT NULL, -- 'success', 'failure', 'blocked'
  details TEXT, -- JSON avec informations sur la tentative
  timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_oauth_attempts_ip ON oauth_attempts(ip_address);
CREATE INDEX IF NOT EXISTS idx_oauth_attempts_timestamp ON oauth_attempts(timestamp);

-- Table pour les sessions OAuth temporaires (pour les flows complexes)
CREATE TABLE IF NOT EXISTS oauth_sessions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  session_token TEXT UNIQUE NOT NULL,
  user_id INTEGER,
  provider TEXT NOT NULL,
  state TEXT NOT NULL,
  mode TEXT DEFAULT 'login', -- 'login', 'link', 'refresh'
  data TEXT, -- JSON avec données temporaires
  expires_at DATETIME NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_oauth_sessions_token ON oauth_sessions(session_token);
CREATE INDEX IF NOT EXISTS idx_oauth_sessions_expires ON oauth_sessions(expires_at);

-- Nettoyage automatique des sessions expirées (sera géré par un cron job)
-- DELETE FROM oauth_sessions WHERE expires_at < datetime('now');

-- Vue pour les statistiques OAuth
CREATE VIEW IF NOT EXISTS oauth_stats AS
SELECT 
  provider,
  COUNT(*) as total_connections,
  COUNT(DISTINCT user_id) as unique_users,
  MIN(linked_at) as first_connection,
  MAX(linked_at) as last_connection,
  COUNT(CASE WHEN last_used > datetime('now', '-30 days') THEN 1 END) as active_last_30_days
FROM oauth_providers
GROUP BY provider;

-- Vue pour les utilisateurs avec multiples providers
CREATE VIEW IF NOT EXISTS multi_provider_users AS
SELECT 
  user_id,
  COUNT(*) as provider_count,
  GROUP_CONCAT(provider) as providers,
  MIN(linked_at) as first_oauth_connection,
  MAX(linked_at) as last_oauth_connection
FROM oauth_providers
GROUP BY user_id
HAVING provider_count > 1;

-- Insertion de données de test pour les logs (optionnel)
INSERT OR IGNORE INTO oauth_logs (user_id, action, provider, details, timestamp) VALUES 
(1, 'login', 'google', '{"ip": "127.0.0.1", "success": true}', datetime('now', '-1 day')),
(1, 'link', 'github', '{"ip": "127.0.0.1", "success": true}', datetime('now', '-2 hours')),
(2, 'login', 'github', '{"ip": "192.168.1.100", "success": true}', datetime('now', '-30 minutes'));

-- Trigger pour mettre à jour last_used automatiquement lors des connexions
CREATE TRIGGER IF NOT EXISTS update_oauth_last_used 
AFTER INSERT ON oauth_logs
WHEN NEW.action = 'login'
BEGIN
  UPDATE oauth_providers 
  SET last_used = NEW.timestamp
  WHERE user_id = NEW.user_id AND provider = NEW.provider;
END;
