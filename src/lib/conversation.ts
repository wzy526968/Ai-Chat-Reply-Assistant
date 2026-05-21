import type { ConversationRecord, UserPreferences } from "@/types/chat";

export const starterContext = `对方：周末一起出来吃饭吗？
我：这周有点忙
对方：那周日晚上呢？`;

export const starterReplies = [
  "这周末可能不太行，我这边事情有点多，改天我请你吃。",
  "想去的，不过这周末确实排满了，我们下周再约怎么样？",
  "这次先欠着，我这周抽不开身，下次提前喊我。",
];

export const starterNote = "现在展示的是示例回复，接上模型后会按上下文实时生成。";

export const defaultPreferences: UserPreferences = {
  displayName: "我",
  preferredScene: "friend",
  preferredTone: "natural",
  defaultGoal: "礼貌拒绝周末聚会",
  preferenceNote: "自然一点，别像客服模板，尽量短句。",
  signature: "需要的话可以带一点熟悉感收尾。",
};

export const STORAGE_KEYS = {
  preferences: "reply-assistant.preferences",
  conversations: "reply-assistant.conversations",
  activeConversationId: "reply-assistant.activeConversationId",
} as const;

export function safeJsonParse<T>(value: string | null, fallback: T) {
  if (!value) {
    return fallback;
  }

  try {
    return JSON.parse(value) as T;
  } catch {
    return fallback;
  }
}

export function createConversation(preferences: UserPreferences): ConversationRecord {
  const now = new Date().toISOString();

  return {
    id: globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(16).slice(2)}`,
    title: "新的对话",
    scene: preferences.preferredScene,
    tone: preferences.preferredTone,
    goal: preferences.defaultGoal,
    context: starterContext,
    replies: starterReplies,
    note: starterNote,
    createdAt: now,
    updatedAt: now,
  };
}

export function deriveConversationTitle(context: string, fallback = "新的对话") {
  const firstLine = context
    .split("\n")
    .map((line) => line.trim())
    .find(Boolean);

  if (!firstLine) {
    return fallback;
  }

  const normalized = firstLine.replace(/^对方[:：]\s*/, "").replace(/^我[:：]\s*/, "");
  return normalized.slice(0, 18) || fallback;
}
