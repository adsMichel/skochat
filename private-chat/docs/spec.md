# Private Rooms Chat - Spec

## 1. Objetivo

Criar uma aplicação web simples de chat privado baseada em link.

Usuário abre o site, cria uma sala e recebe um link único.

Somente quem possui o link pode acessar a sala.

O sistema deve ser simples o suficiente para ser mantido por um time pequeno (1 dev + IA).

Capacidade alvo: 1000 usuários simultâneos.

---

# 2. Funcionalidades

## 2.1 Criar sala

Usuário abre a página inicial.

Pode criar uma sala definindo:

- limite de participantes
- tempo de expiração das mensagens
- permitir envio de imagens (sim/não)

Ao criar a sala o sistema gera:

roomId = uuid

Link:

/room/{roomId}

---

## 2.2 Entrar na sala

Usuário acessa o link.

Sistema verifica:

- sala existe
- limite de participantes
- sala não expirada

Se válido → conecta no websocket.

---

## 2.3 Chat em tempo real

Mensagens enviadas via WebSocket.

Tipos de mensagem:

text
image
system

Exemplo payload:

{
"type": "message",
"roomId": "...",
"userId": "...",
"content": "Olá"
}

---

## 2.4 Envio de imagem

Upload via endpoint:

POST /upload

Arquivo armazenado em:

/storage/images

Retorna URL da imagem.

---

## 2.5 Expiração de mensagens

Sala pode definir:

- 10 minutos
- 1 hora
- 24 horas
- nunca

Worker remove mensagens expiradas.

---

## 2.6 Limite de usuários

Criador define:

2
3
5
10
20

Servidor controla via Redis.

---

## 2.7 Privacidade

Requisitos:

- salas não listadas
- links aleatórios
- sem indexação
- sem busca

---

## 2.8 Expiração da sala

Sala pode expirar após:

24h
48h
7 dias

Após isso:

- websocket bloqueado
- mensagens removidas

---

# 3. Requisitos não funcionais

- até 1000 usuários simultâneos
- latência < 200ms
- deploy simples
- custo baixo

---

# 4. Segurança

- rate limit
- limite upload imagem
- verificação MIME
- evitar spam

---

# 5. Métricas

- salas criadas
- usuários conectados
- mensagens enviadas