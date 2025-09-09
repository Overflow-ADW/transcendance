// cleanup-test-user.js
const path = require('path');
const sqlite3 = require('sqlite3').verbose();
const dbPath = path.join(__dirname, '../database/database.sqlite');

console.log(`Tentative d'ouverture de la base de données: ${dbPath}`);
const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error('Erreur lors de la connexion à la base de données:', err.message);
    return;
  }
  console.log('Connexion à la base de données SQLite établie.');

  // Vérifier si l'utilisateur "test" existe
  db.get('SELECT id, username FROM users WHERE username = ?', ['test'], (err, row) => {
    if (err) {
      console.error('Erreur lors de la recherche:', err.message);
      return;
    }

    if (row) {
      console.log(`Utilisateur "test" trouvé avec l'ID: ${row.id}`);
      
      // Supprimer l'utilisateur
      db.run('DELETE FROM users WHERE id = ?', [row.id], function(err) {
        if (err) {
          console.error('Erreur lors de la suppression:', err.message);
        } else {
          console.log(`Suppression effectuée: ${this.changes} ligne(s) affectée(s)`);
        }
        
        // Fermer la connexion
        db.close();
      });
    } else {
      console.log('Aucun utilisateur "test" trouvé dans la base de données.');
      
      // Recherche plus large
      db.all('SELECT id, username FROM users WHERE username LIKE ?', ['%test%'], (err, rows) => {
        if (err) {
          console.error('Erreur lors de la recherche élargie:', err.message);
        } else if (rows.length > 0) {
          console.log('Utilisateurs similaires trouvés:');
          console.table(rows);
        } else {
          console.log('Aucun utilisateur similaire trouvé.');
        }
        
        // Fermer la connexion
        db.close();
      });
    }
  });
});
