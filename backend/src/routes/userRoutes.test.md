// Test manuel des routes utilisateur
// Vous pouvez utiliser ces exemples avec curl ou Postman

// 1. Enregistrement d'un nouvel utilisateur
// POST http://localhost:3000/api/users/register
// Content-Type: application/json
// Body:
/*
{
  "username": "testuser",
  "email": "test@example.com",
  "password": "motdepasse123"
}
*/

// 2. Connexion d'un utilisateur
// POST http://localhost:3000/api/users/login
// Content-Type: application/json
// Body:
/*
{
  "username": "testuser",
  "password": "motdepasse123"
}
*/

// 3. Vérification d'un token
// POST http://localhost:3000/api/users/verify
// Content-Type: application/json
// Body:
/*
{
  "token": "your-jwt-token-here"
}
*/

// 4. Récupération du profil utilisateur (route protégée)
// GET http://localhost:3000/api/users/profile
// Authorization: Bearer your-jwt-token-here

// Exemples de commandes curl pour tester :

// Enregistrement :
// curl -X POST http://localhost:3000/api/users/register \
//   -H "Content-Type: application/json" \
//   -d '{"username":"testuser","email":"test@example.com","password":"motdepasse123"}'

// Connexion :
// curl -X POST http://localhost:3000/api/users/login \
//   -H "Content-Type: application/json" \
//   -d '{"username":"testuser","password":"motdepasse123"}'

// Profil (remplacez YOUR_TOKEN par le token reçu) :
// curl -X GET http://localhost:3000/api/users/profile \
//   -H "Authorization: Bearer YOUR_TOKEN"
