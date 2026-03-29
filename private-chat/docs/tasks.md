# Development Tasks

Metodologia:

- TDD
- pequenos commits
- integração contínua
- testes automatizados

---

# Milestone 1 — Base do projeto

- [ ] criar monorepo
- [ ] configurar docker
- [ ] configurar node + typescript
- [ ] configurar fastify
- [ ] configurar websocket
- [ ] configurar redis
- [ ] configurar sqlite

---

# Milestone 2 — Criação de salas

- [ ] endpoint POST /rooms
- [ ] gerar UUID da sala
- [ ] salvar no banco
- [ ] retornar link

Testes:

- criação de sala
- validação de limite

---

# Milestone 3 — Conexão WebSocket

- [ ] conectar usuário na sala
- [ ] validar limite de usuários
- [ ] broadcast de mensagens

Testes:

- conexão websocket
- broadcast correto

---

# Milestone 4 — Chat

- [ ] envio de mensagem
- [ ] recebimento em tempo real
- [ ] persistência opcional

Testes:

- envio
- recebimento
- reconexão

---

# Milestone 5 — Upload de imagem

- [ ] endpoint upload
- [ ] validação tipo arquivo
- [ ] salvar storage local

Testes:

- upload válido
- rejeição arquivos inválidos

---

# Milestone 6 — Expiração de mensagens

- [ ] job de limpeza
- [ ] redis TTL
- [ ] worker

Testes:

- mensagem expira
- limpeza correta

---

# Milestone 7 — Frontend

- [ ] tela criar sala
- [ ] tela chat
- [ ] websocket client
- [ ] envio de imagem
- [ ] contador usuários

---

# Milestone 8 — Deploy

- [ ] docker compose
- [ ] nginx reverse proxy
- [ ] variáveis de ambiente
- [ ] script deploy

---

# Milestone 9 — Observabilidade

- [ ] logs
- [ ] métricas básicas
- [ ] health check