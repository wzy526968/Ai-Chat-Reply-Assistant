import { buildReplyPrompt } from "@/lib/prompt";
import { sanitizeReplies } from "@/lib/safety";
import type { ReplyRequest, ReplyResponse } from "@/types/chat";

function buildMockReplies(input: ReplyRequest) {
  const goal = input.goal.trim() || "自然接话";

  return sanitizeReplies([
    `我大概明白你的意思了，我想先按${goal}这个方向回你。`,
    `这件事我收到了，我们顺着${goal}来聊会更合适。`,
    `我先不急着下结论，不过可以朝${goal}这个方向回复。`,
  ]);
}

function getKeyValidationError(apiKey: string) {
  const trimmed = apiKey.trim();

  if (!trimmed) {
    return "OPENAI_API_KEY 为空，当前无法连接真实模型。";
  }

  if (trimmed.includes("...")) {
    return "OPENAI_API_KEY 看起来还是占位值，不能包含省略号。请填入完整真实密钥。";
  }

  if (trimmed.length < 20) {
    return "OPENAI_API_KEY 看起来不完整，请确认你填的是后台复制出来的整串真实密钥。";
  }

  return null;
}

function getUpstreamErrorMessage(status: number, details: string) {
  if (status === 401) {
    return "上游鉴权失败（401）。请检查 OPENAI_API_KEY 是否完整、有效，或是否已被废弃。";
  }

  if (status === 403) {
    return "上游拒绝访问（403）。请检查账号权限、项目配置或网关限制。";
  }

  if (status === 404) {
    return "上游地址或模型不存在（404）。请检查 OPENAI_BASE_URL 和 OPENAI_MODEL。";
  }

  if (status === 429) {
    return "上游限流或额度不足（429）。请稍后重试，并检查账户配额。";
  }

  return `模型请求失败（${status}）。${details || "请检查上游返回信息。"} `;
}

export async function generateReplies(input: ReplyRequest): Promise<ReplyResponse> {
  const apiKey = process.env.OPENAI_API_KEY;
  const baseUrl = process.env.OPENAI_BASE_URL || "https://api.openai.com/v1";
  const model = process.env.OPENAI_MODEL || "gpt-4.1-mini";

  if (!apiKey) {
    return {
      replies: buildMockReplies(input),
      note: "OPENAI_API_KEY 未配置，当前返回的是本地演示文案。",
    };
  }

  const keyValidationError = getKeyValidationError(apiKey);

  if (keyValidationError) {
    throw new Error(keyValidationError);
  }

  let response: Response;

  try {
    response = await fetch(`${baseUrl}/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
        temperature: 0.8,
        response_format: { type: "json_object" },
        messages: [
          {
            role: "system",
            content: "你是一个严格按要求返回 JSON 的中文聊天回复助手。",
          },
          {
            role: "user",
            content: buildReplyPrompt(input),
          },
        ],
      }),
    });
  } catch {
    throw new Error("无法连接到模型服务。请检查网络、代理设置或 OPENAI_BASE_URL 是否可访问。");
  }

  if (!response.ok) {
    const details = await response.text();
    throw new Error(getUpstreamErrorMessage(response.status, details));
  }

  const data = await response.json();
  const content = data.choices?.[0]?.message?.content;

  if (!content) {
    throw new Error("Model returned empty content.");
  }

  const parsed = JSON.parse(content) as ReplyResponse;
  const replies = sanitizeReplies(Array.isArray(parsed.replies) ? parsed.replies : []);

  return {
    replies,
    note: parsed.note,
  };
}
