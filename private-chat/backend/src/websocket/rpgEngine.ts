type RoomActionType = "user_message" | "user_image" | "mini_action";

type PlayerState = {
  id: string;
  name: string;
  avatar: string;
  mood: string;
  xp: number;
  level: number;
  achievements: Set<string>;
  messagesSent: number;
  imagesSent: number;
  joinedAt: number;
  lastActiveAt: number;
  lastActiveRewardAt: number;
  online: boolean;
};

type RoomState = {
  players: Map<string, PlayerState>;
  engagementPoints: number;
  connectionLevel: number;
};

export type JoinProfile = {
  userId: string;
  name: string;
  avatar: string;
  mood: string;
};

export type PublicPlayer = {
  id: string;
  name: string;
  avatar: string;
  mood: string;
  xp: number;
  level: number;
  achievements: string[];
  online: boolean;
};

export type ActionResult = {
  player: PublicPlayer;
  xpGain: number;
  levelUpTo: number | null;
  achievementsUnlocked: string[];
  connectionLevelUpTo: number | null;
};

const LEVEL_THRESHOLDS = [0, 50, 120, 200, 320, 500];
const CONNECTION_LEVEL_MAX = 3;
const ACTIVE_REWARD_XP = 15;
const ACTIVE_REWARD_INTERVAL = 10 * 60 * 1000;
const LATE_NIGHT_START = 22;
const LATE_NIGHT_END = 5;
const COMPLIMENT_PATTERN =
  /\b(gostei|lindo|linda|bonit|amei|ador|cute|beautiful|awesome|great|love)\b/i;

function getLevelFromXp(xp: number): number {
  for (let index = LEVEL_THRESHOLDS.length - 1; index >= 0; index -= 1) {
    if (xp >= LEVEL_THRESHOLDS[index]) {
      return index + 1;
    }
  }

  return 1;
}

function sanitizeName(name: string): string {
  const trimmed = name.trim().slice(0, 24);
  return trimmed || "Player";
}

export class PrivateRoomRpgEngine {
  private readonly rooms = new Map<string, RoomState>();

  joinPlayer(roomId: string, profile: JoinProfile): PublicPlayer {
    const room = this.getOrCreateRoom(roomId);
    const existing = room.players.get(profile.userId);
    const now = Date.now();

    if (existing) {
      existing.name = sanitizeName(profile.name);
      existing.avatar = profile.avatar;
      existing.mood = profile.mood;
      existing.online = true;
      existing.lastActiveAt = now;
      return this.toPublicPlayer(existing);
    }

    const player: PlayerState = {
      id: profile.userId,
      name: sanitizeName(profile.name),
      avatar: profile.avatar,
      mood: profile.mood,
      xp: 0,
      level: 1,
      achievements: new Set<string>(),
      messagesSent: 0,
      imagesSent: 0,
      joinedAt: now,
      lastActiveAt: now,
      lastActiveRewardAt: now,
      online: true
    };

    room.players.set(player.id, player);
    return this.toPublicPlayer(player);
  }

  leavePlayer(roomId: string, userId: string): void {
    const room = this.rooms.get(roomId);
    if (!room) {
      return;
    }

    const player = room.players.get(userId);
    if (player) {
      player.online = false;
    }
  }

  getPlayers(roomId: string): PublicPlayer[] {
    const room = this.rooms.get(roomId);
    if (!room) {
      return [];
    }

    return [...room.players.values()].map((player) => this.toPublicPlayer(player));
  }

  getConnectionLevel(roomId: string): number {
    const room = this.rooms.get(roomId);
    return room ? room.connectionLevel : 1;
  }

  handleAction(
    roomId: string,
    userId: string,
    actionType: RoomActionType,
    content: string,
    replyToMessageId?: string
  ): ActionResult | null {
    const room = this.getOrCreateRoom(roomId);
    const player = room.players.get(userId);
    if (!player) {
      return null;
    }

    player.lastActiveAt = Date.now();

    const previousLevel = player.level;
    let xpGain = this.calculateActionXp(actionType, Boolean(replyToMessageId));
    const achievementsUnlocked: string[] = [];

    if (actionType === "user_message") {
      player.messagesSent += 1;
      achievementsUnlocked.push(...this.unlockAchievements(player, content, "message"));
    } else if (actionType === "user_image") {
      player.imagesSent += 1;
      achievementsUnlocked.push(...this.unlockAchievements(player, content, "image"));
    } else {
      achievementsUnlocked.push(...this.unlockAchievements(player, content, "mini"));
    }

    player.xp += xpGain;
    player.level = getLevelFromXp(player.xp);
    const levelUpTo = player.level > previousLevel ? player.level : null;

    const previousConnectionLevel = room.connectionLevel;
    room.engagementPoints += actionType === "user_image" ? 2 : 1;
    room.connectionLevel = Math.min(
      CONNECTION_LEVEL_MAX,
      1 + Math.floor(room.engagementPoints / 8)
    );
    const connectionLevelUpTo =
      room.connectionLevel > previousConnectionLevel ? room.connectionLevel : null;

    return {
      player: this.toPublicPlayer(player),
      xpGain,
      levelUpTo,
      achievementsUnlocked,
      connectionLevelUpTo
    };
  }

  runActiveRewardCycle(nowTimestamp = Date.now()): Array<{
    roomId: string;
    result: ActionResult;
  }> {
    const rewards: Array<{ roomId: string; result: ActionResult }> = [];

    this.rooms.forEach((room, roomId) => {
      room.players.forEach((player) => {
        if (!player.online) {
          return;
        }

        const activeRecently = nowTimestamp - player.lastActiveAt <= ACTIVE_REWARD_INTERVAL;
        const canReward = nowTimestamp - player.lastActiveRewardAt >= ACTIVE_REWARD_INTERVAL;
        if (!activeRecently || !canReward) {
          return;
        }

        player.lastActiveRewardAt = nowTimestamp;
        const previousLevel = player.level;
        player.xp += ACTIVE_REWARD_XP;
        player.level = getLevelFromXp(player.xp);
        const levelUpTo = player.level > previousLevel ? player.level : null;
        const achievementsUnlocked = this.unlockAchievements(player, "", "active");

        rewards.push({
          roomId,
          result: {
            player: this.toPublicPlayer(player),
            xpGain: ACTIVE_REWARD_XP,
            levelUpTo,
            achievementsUnlocked,
            connectionLevelUpTo: null
          }
        });
      });
    });

    return rewards;
  }

  private getOrCreateRoom(roomId: string): RoomState {
    const existing = this.rooms.get(roomId);
    if (existing) {
      return existing;
    }

    const room: RoomState = {
      players: new Map<string, PlayerState>(),
      engagementPoints: 0,
      connectionLevel: 1
    };
    this.rooms.set(roomId, room);
    return room;
  }

  private calculateActionXp(actionType: RoomActionType, hasReply: boolean): number {
    if (actionType === "user_image") {
      return 10;
    }

    if (actionType === "user_message") {
      return hasReply ? 8 : 5;
    }

    return 3;
  }

  private unlockAchievements(
    player: PlayerState,
    content: string,
    context: "message" | "image" | "mini" | "active"
  ): string[] {
    const unlocked: string[] = [];
    const now = new Date();

    if (context === "message" && player.messagesSent >= 1) {
      unlocked.push(...this.tryUnlock(player, "First Message"));
    }

    if (context === "image" && player.imagesSent >= 1) {
      unlocked.push(...this.tryUnlock(player, "First Image"));
    }

    if (context === "message" && COMPLIMENT_PATTERN.test(content)) {
      unlocked.push(...this.tryUnlock(player, "First Compliment"));
    }

    if (player.messagesSent >= 30) {
      unlocked.push(...this.tryUnlock(player, "30 Messages Sent"));
    }

    if (Date.now() - player.joinedAt >= 60 * 60 * 1000) {
      unlocked.push(...this.tryUnlock(player, "1 Hour Conversation"));
    }

    const hour = now.getHours();
    if (hour >= LATE_NIGHT_START || hour < LATE_NIGHT_END) {
      unlocked.push(...this.tryUnlock(player, "Late Night Chat"));
    }

    return unlocked;
  }

  private tryUnlock(player: PlayerState, name: string): string[] {
    if (player.achievements.has(name)) {
      return [];
    }

    player.achievements.add(name);
    return [name];
  }

  private toPublicPlayer(player: PlayerState): PublicPlayer {
    return {
      id: player.id,
      name: player.name,
      avatar: player.avatar,
      mood: player.mood,
      xp: player.xp,
      level: player.level,
      achievements: [...player.achievements],
      online: player.online
    };
  }
}
