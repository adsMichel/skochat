# AI Development Guidelines

Este projeto segue práticas inspiradas em Extreme Programming.

O agente de IA deve seguir estas regras obrigatoriamente.

---

# Development Process

1. Sempre seguir TDD.

Fluxo obrigatório:

write test
run test
fail
implement code
run test
pass
refactor

Nunca escrever código sem teste antes.

---

# Commits

Commits devem ser pequenos.

Formato:

type(scope): description

Exemplos:

feat(chat): add websocket message broadcast
fix(room): validate max users
test(upload): add image upload validation

---

# Code Style

- código simples
- evitar abstrações desnecessárias
- evitar overengineering
- preferir funções pequenas

---

# Architecture Rules

Não violar camadas:

controllers
services
repositories
infrastructure

Nunca acessar banco diretamente no controller.

---

# File Size Limits

Arquivos devem ter no máximo:

300 linhas

Funções no máximo:

30 linhas

---

# Testing

Cobertura mínima:

80%

Testes obrigatórios para:

- endpoints
- websocket events
- serviços de domínio

---

# Security

Sempre validar:

- inputs
- uploads
- websocket payloads

---

# Performance

Sistema precisa suportar:

1000 usuários simultâneos.

Evitar:

- loops pesados
- queries não indexadas