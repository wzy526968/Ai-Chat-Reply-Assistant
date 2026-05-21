"use client";

import dynamic from "next/dynamic";

const ReplyAssistant = dynamic(
  () => import("@/components/reply-assistant").then((module) => module.ReplyAssistant),
  { ssr: false },
);

export function ReplyAssistantShell() {
  return <ReplyAssistant />;
}
