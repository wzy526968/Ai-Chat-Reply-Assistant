export type Scene = "friend" | "coworker" | "client" | "dating";

export type Tone = "natural" | "polite" | "humorous" | "firm";

export type ChatRole = "other" | "user";

export interface ChatMessage {
  role: ChatRole;
  content: string;
}

export interface ReplyRequest {
  scene: Scene;
  tone: Tone;
  goal: string;
  messages: ChatMessage[];
  preferenceNote?: string;
  signature?: string;
}

export interface ReplyResponse {
  replies: string[];
  note?: string;
}

export interface UserPreferences {
  displayName: string;
  preferredScene: Scene;
  preferredTone: Tone;
  defaultGoal: string;
  preferenceNote: string;
  signature: string;
}

export interface ConversationRecord {
  id: string;
  title: string;
  scene: Scene;
  tone: Tone;
  goal: string;
  context: string;
  replies: string[];
  note: string;
  createdAt: string;
  updatedAt: string;
}
