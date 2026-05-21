import { NextResponse } from "next/server";
import { generateReplies } from "@/lib/model";
import type { ReplyRequest } from "@/types/chat";

function isValidPayload(body: unknown): body is ReplyRequest {
  if (!body || typeof body !== "object") {
    return false;
  }

  const candidate = body as Partial<ReplyRequest>;

  return (
    typeof candidate.goal === "string" &&
    typeof candidate.scene === "string" &&
    typeof candidate.tone === "string" &&
    Array.isArray(candidate.messages)
  );
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as unknown;

    if (!isValidPayload(body)) {
      return NextResponse.json({ error: "请求参数不完整。" }, { status: 400 });
    }

    const result = await generateReplies(body);

    return NextResponse.json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : "服务暂时不可用。";

    return NextResponse.json({ error: message }, { status: 500 });
  }
}
