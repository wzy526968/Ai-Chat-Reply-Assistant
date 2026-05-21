const blockedKeywords = [
  "转账",
  "验证码",
  "借钱",
  "裸聊",
  "威胁",
  "诈骗",
  "洗钱",
  "代付",
  "隐私",
];

export function detectRisk(text: string) {
  return blockedKeywords.some((keyword) => text.includes(keyword));
}

export function sanitizeReplies(replies: string[]) {
  const cleaned = replies
    .map((reply) => reply.trim())
    .filter(Boolean)
    .filter((reply) => !detectRisk(reply));

  if (cleaned.length >= 3) {
    return cleaned.slice(0, 3);
  }

  return [
    ...cleaned,
    "这个话题我不太方便继续聊，我们换个轻松点的话题吧。",
    "这件事我想先确认清楚，再决定怎么回复更合适。",
    "先别急着下结论，我们晚点再好好说。",
  ].slice(0, 3);
}
