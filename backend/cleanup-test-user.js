// cleanup-test-user.js
const db = require('./src/db');

try {
  console.log('Tentative de suppression de l\'utilisateur "test"...');
  
  // Vérifier si l'utilisateur existe
  const user = db.prepare('SELECT id, username FROM users WHERE username = ?').get('test');
  
  if (user) {
    console.log(`Utilisateur "test" trouvé avec l'ID: ${user.id}`);
    
    // Supprimer l'utilisateur
    const result = db.prepare('DELETE FROM users WHERE id = ?').run(user.id);
    
    console.log(`Suppression effectuée: ${result.changes} ligne(s) affectée(s)`);
  } else {
    console.log('Aucun utilisateur "test" trouvé dans la table users');
    
    // Recherche plus large pour voir si le nom est utilisé ailleurs
    console.log('Recherche du nom "test" dans d\'autres champs...');
    
    const usernameQuery = db.prepare('SELECT id, username FROM users WHERE username LIKE ?').all('%test%');
    if (usernameQuery.length > 0) {
      console.log('Utilisateurs similaires trouvés:');
      console.table(usernameQuery);
    } else {
      console.log('Aucun nom similaire trouvé');
    }
  }
  
  console.log('Opération terminée');
} catch (err) {
  console.error('Erreur lors de l\'accès à la base de données:', err);
}
