import type { ReplyRequest } from "@/types/chat";

const sceneLabels = {
  friend: "朋友",
  coworker: "同事",
  client: "客户",
  dating: "暧昧对象",
} as const;

const toneLabels = {
  natural: "自然",
  polite: "礼貌",
  humorous: "幽默",
  firm: "坚定",
} as const;

export function buildReplyPrompt(input: ReplyRequest) {
  const transcript = input.messages
    .filter((message) => message.content.trim())
    .map((message) => `${message.role === "other" ? "对方" : "我"}: ${message.content.trim()}`)
    .join("\n");

  return `
你是一个聊天回复助手。
你的任务是根据聊天上下文，生成适合微信或 QQ 场景的中文回复候选。

要求：
1. 回复要自然、简洁、像真人正常表达。
2. 输出 3 条可直接发送的中文回复。
3. 结合指定场景和语气，不要过度夸张、油腻或像客服模板。
4. 尽量控制在 12 到 40 个汉字之间，必要时可以稍长一点。
5. 如果涉及转账诱导、诈骗、骚扰、违法、隐私套取或威胁内容，不要帮忙操控对方，改成安全、克制的回复。
6. 返回严格 JSON，格式为 {"replies":["...","...","..."]}，不要输出额外说明。

场景: ${sceneLabels[input.scene]}
语气: ${toneLabels[input.tone]}
目标: ${input.goal.trim()}
用户偏好: ${input.preferenceNote?.trim() || "无特别偏好"}
常用收尾: ${input.signature?.trim() || "无"}

最近对话:
${transcript || "无上下文"}
  `.trim();
}
