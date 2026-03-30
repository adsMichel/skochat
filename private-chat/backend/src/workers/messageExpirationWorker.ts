import type { MessagesRepository } from "../repositories/messagesRepository.js";

export function startMessageExpirationWorker(
  messagesRepository: MessagesRepository,
  intervalMs = 60_000
): () => void {
  const timer = setInterval(() => {
    const nowIso = new Date().toISOString();
    messagesRepository.deleteExpired(nowIso).catch(() => {
      // Worker should not crash the process if cleanup fails once.
    });
  }, intervalMs);

  return () => {
    clearInterval(timer);
  };
}
