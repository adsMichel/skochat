# Project Rules

Este projeto prioriza simplicidade operacional.

Princípios:

1 - Código simples
2 - Infra simples
3 - Deploy simples

---

# Stack

Backend

Node.js
Fastify
WebSocket (ws)

Frontend

Vanilla JS
Vite

Infra

Docker
Redis
SQLite
Nginx

---

# Monorepo Structure

project/

backend/
frontend/
infra/
docs/

---

# Backend Structure

backend/src

controllers
services
repositories
websocket
workers
utils

---

# Frontend Structure

frontend/src

pages
components
services
state

---

# Naming Conventions

camelCase

Classes:

PascalCase

Constants:

UPPER_CASE

---

# Environment Variables

.env

PORT
REDIS_URL
DATABASE_URL
UPLOAD_PATH

---

# Logs

Todos logs devem usar:

pino