# ft_transcendence

A full-stack web application built as part of the 42 curriculum, centered around a Pong experience and the surrounding product features: authentication, profiles, social interactions, tournaments and account security.

> Portfolio version of a collaborative project developed by Florent, Younes and Topaze.

## Highlights

- Next.js / React frontend written in TypeScript
- Fastify backend with SQLite persistence
- Local authentication with JWT-based sessions
- OAuth integration
- Two-factor authentication (2FA)
- User profiles, friends and match history
- Tournament flows and multiple game modes
- Pong rendering/gameplay built with Babylon.js
- Docker Compose setup for frontend and backend

## Stack

**Frontend:** Next.js 15, React 19, TypeScript, Tailwind CSS, Babylon.js  
**Backend:** Node.js, Fastify, SQLite, JWT, bcrypt  
**Infrastructure:** Docker, Docker Compose, Nginx

## Architecture

```text
transcendance/
├── frontend/        # Next.js application and game client
├── backend/         # Fastify API, authentication and persistence
└── docker-compose.yml
```

The frontend and backend run as separate services on the same Docker network. Application data and uploads are persisted through Docker volumes.

## Running the project

The repository intentionally does not commit private environment files.

1. Configure the backend environment, including a strong `JWT_SECRET`.
2. Copy and adapt `frontend/.env.example`.
3. Add OAuth credentials only for the providers you want to enable.
4. Start the stack:

```bash
docker compose up --build
```

The frontend is exposed through HTTPS on port `8080`; the backend service listens on port `3000`.

## What this project demonstrates

This project brings together application architecture, authentication and security, persistence, frontend state and UI, game development, API design and containerized deployment in one larger codebase.

It was also an exercise in collaboration: splitting responsibilities, integrating several subsystems and keeping a shared application coherent as features accumulated.

---

Part of my developer portfolio: **[github.com/Overflow-ADW](https://github.com/Overflow-ADW)**  
Professional work: **[Avenue du Web](https://avenueduweb.be)**
