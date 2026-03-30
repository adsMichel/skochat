import { afterEach, describe, expect, it, vi } from "vitest";
import { startMessageExpirationWorker } from "../../workers/messageExpirationWorker.js";

describe("messageExpirationWorker", () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it("runs periodic cleanup and can be stopped", async () => {
    vi.useFakeTimers();
    const deleteExpired = vi.fn().mockResolvedValue(1);
    const stop = startMessageExpirationWorker(
      {
        create: async () => {
          throw new Error("not used");
        },
        listByRoom: async () => [],
        deleteExpired
      },
      1_000
    );

    await vi.advanceTimersByTimeAsync(2_100);
    expect(deleteExpired).toHaveBeenCalledTimes(2);

    stop();
    await vi.advanceTimersByTimeAsync(2_100);
    expect(deleteExpired).toHaveBeenCalledTimes(2);
  });
});
