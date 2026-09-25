# ft_transcendence

A collaborative **full-stack Pong platform** built as part of the 42 curriculum.

The project goes well beyond a browser game: it combines a Babylon.js 3D Pong experience with authentication, two-factor security, profiles, friends, statistics, match history, tournaments and a containerized frontend/backend architecture.

> Portfolio version of a project developed by Florent, Younes and Topaze.

## Screenshots

### Pong gameplay

<p align="center">
  <img src="screenshots/pong-vs-ai.png" alt="ft_transcendence Pong match against the hard AI" width="95%">
</p>

### Player profile and statistics

<p align="center">
  <img src="screenshots/profile-statistics.png" alt="ft_transcendence player profile with statistics and recent match history" width="95%">
</p>

### Match history

<p align="center">
  <img src="screenshots/match-history.png" alt="ft_transcendence persisted match history" width="95%">
</p>

## Features

### Pong and game modes

The game is rendered with **Babylon.js** and uses a real 3D scene rather than a simple DOM or canvas representation.

Implemented gameplay includes:

- classic player-versus-player Pong;
- AI opponents with **Easy, Medium and Hard** difficulty levels;
- a local multiplayer variant with an additional center paddle;
- tournament flows with a bracket view;
- score tracking and persisted match results;
- configurable ball speed and collision behavior;
- glow layers, particle effects and other visual feedback.

The AI uses different reaction times, prediction precision and positioning error depending on the selected difficulty.

### Accounts and social features

The web application around the game includes:

- local user registration and authentication;
- JWT access and refresh tokens;
- customizable profiles and avatars;
- friend relationships;
- player statistics;
- persisted match history;
- tournament data;
- protected administration routes for user management.

### Two-factor authentication

Two-factor authentication is implemented with **TOTP**.

The setup flow generates a QR code for authenticator applications and validates six-digit codes before activation. Recovery codes are generated, stored as hashes and can be consumed as backup authentication codes.

### OAuth

The active backend integrates **Google** and **GitHub OAuth2** when the corresponding provider credentials are configured.

The repository also contains additional provider-related work, but OAuth depends on external application credentials and correctly configured callback URLs, so it is optional for running the core project locally.

## Technology stack

### Frontend

- **Next.js 15**
- **React 19**
- **TypeScript**
- **Tailwind CSS**
- **Babylon.js 8** for the Pong scene, effects and gameplay
- Nginx for serving the production frontend

### Backend

- **Node.js**
- **Fastify 4**
- **SQLite** through `better-sqlite3`
- JWT authentication with refresh tokens
- bcrypt password hashing
- Joi request validation
- TOTP through `speakeasy`
- QR-code generation for 2FA
- multipart uploads for avatars

### Security and infrastructure

- Docker and Docker Compose
- Nginx reverse proxy
- local HTTPS with self-signed certificates
- CORS configuration
- API rate limiting
- Helmet security headers
- persisted Docker volumes for database data and uploads

## Architecture

```text
browser
   │
   ▼
Nginx / Next.js frontend
   │
   ├── profiles / friends / statistics
   ├── tournaments / history
   └── Babylon.js Pong client
   │
   ▼
Fastify API
   │
   ├── authentication / JWT / OAuth
   ├── 2FA
   ├── users / social data
   ├── games / match history
   ├── tournaments
   └── admin routes
   │
   ▼
SQLite
```

The frontend and backend are separate Docker services on the same network. Nginx serves the exported frontend over HTTPS and proxies API and uploaded-file requests to the Fastify backend.

## Project structure

```text
transcendance/
├── frontend/
│   ├── src/
│   │   ├── app/             # Next.js routes
│   │   ├── components/      # Shared UI components
│   │   ├── views/           # Application views
│   │   ├── game/
│   │   │   ├── game/        # Pong scene and main game logic
│   │   │   ├── modes/       # Game-mode implementations
│   │   │   └── utils/       # Physics, AI, controls and configuration
│   │   └── lib_front/       # Frontend helpers, types and state
│   ├── Dockerfile
│   └── nginx.conf
│
├── backend/
│   ├── src/
│   │   ├── routes/          # Auth, users, games, tournaments, 2FA, admin
│   │   ├── middleware/      # Authentication and route guards
│   │   ├── utils/           # JWT, OAuth and 2FA utilities
│   │   └── db.js            # SQLite initialization
│   └── Dockerfile
│
└── docker-compose.yml
```

## Request flow

A typical authenticated action crosses several layers:

```text
UI interaction
     ↓
frontend state / view
     ↓
HTTPS request
     ↓
Nginx reverse proxy
     ↓
Fastify route
     ↓
authentication / validation
     ↓
SQLite
     ↓
JSON response
     ↓
updated UI
```

The Pong experience adds another independent subsystem on the frontend: Babylon.js owns the real-time scene, controls, ball movement, collision logic, AI behavior and visual effects, while completed games are written back into the application data model.

## Main API areas

The backend is organized around the following route groups:

```text
/api/auth
/api/users
/api/games
/api/tournaments
/api/2fa
/api/admin
```

It also exposes a health endpoint used to check the backend and database connection.

## Running with Docker

### Prerequisites

- Docker Desktop or Docker Engine
- Docker Compose
- a modern browser

Create a local `backend/.env` containing the required secrets and application settings. At minimum, authentication requires a JWT secret and session configuration. OAuth credentials can be left out if those providers are not needed.

Then build and start the stack:

```bash
docker compose up --build
```

The frontend is exposed at:

```text
https://localhost:8080
```

The local Nginx container uses a self-signed certificate, so the browser may display a certificate warning on first access.

To run in the background:

```bash
docker compose up --build -d
```

Stop the stack with:

```bash
docker compose down
```

Application data and uploads are stored in Docker volumes and therefore survive normal container recreation.

## Why this project mattered

Earlier 42 projects often isolate one core problem: processes, concurrency, networking, parsing or graphics.

ft_transcendence is different because several independent systems have to behave as **one product**.

The game engine has to coexist with authentication and account state. Match results have to become persistent statistics. Security mechanisms have to fit into the user flow. Frontend and backend interfaces have to remain compatible, and all of it has to run consistently inside the containerized environment.

The challenge is therefore not only implementing features, but **integrating them without losing coherence**.

It was also a substantial collaboration exercise: responsibilities were split between several developers while sharing data models, APIs, frontend behavior and deployment constraints.

## What this project demonstrates

- full-stack application architecture;
- frontend/backend API integration;
- 3D browser rendering with Babylon.js;
- game-state and collision logic;
- configurable AI behavior;
- authentication and authorization;
- JWT and refresh-token flows;
- TOTP-based 2FA with recovery codes;
- persistent relational application data;
- security middleware and request validation;
- Dockerized multi-service deployment;
- collaborative development across a large shared codebase.

---

Part of my developer portfolio: **[github.com/Overflow-ADW](https://github.com/Overflow-ADW)**  
Professional work: **[Avenue du Web](https://avenueduweb.be)**
