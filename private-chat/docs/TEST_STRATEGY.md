# Test Strategy

Este projeto utiliza TDD.

---

# Test Types

1 Unit Tests
2 Integration Tests
3 WebSocket Tests

---

# Test Framework

Vitest

---

# Unit Tests

Testar:

services
validators
utils

Exemplo:

roomService.test.ts

---

# Integration Tests

Testar:

API endpoints

Ferramenta:

supertest

---

# WebSocket Tests

Simular múltiplos usuários.

Testar:

- conexão
- broadcast
- limite de usuários

---

# Coverage

Meta mínima:

80%

---

# Test Data

Utilizar banco SQLite em memória.

DATABASE_URL=:memory: