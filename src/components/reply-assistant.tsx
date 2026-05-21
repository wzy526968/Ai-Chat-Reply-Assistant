"use client";

import { useEffect, useState } from "react";
import {
  createConversation,
  defaultPreferences,
  deriveConversationTitle,
  safeJsonParse,
  starterNote,
  STORAGE_KEYS,
} from "@/lib/conversation";
import type {
  ConversationRecord,
  ReplyRequest,
  ReplyResponse,
  Scene,
  Tone,
  UserPreferences,
} from "@/types/chat";

const sceneOptions: Array<{ value: Scene; label: string; hint: string }> = [
  { value: "friend", label: "朋友", hint: "自然接话，不端着" },
  { value: "coworker", label: "同事", hint: "清楚稳妥，不过分热络" },
  { value: "client", label: "客户", hint: "有分寸，显得靠谱" },
  { value: "dating", label: "暧昧对象", hint: "轻松有温度，不过界" },
];

const toneOptions: Array<{ value: Tone; label: string }> = [
  { value: "natural", label: "自然" },
  { value: "polite", label: "礼貌" },
  { value: "humorous", label: "幽默" },
  { value: "firm", label: "坚定" },
];

function getInitialState() {
  if (typeof window === "undefined") {
    const fallbackConversation = createConversation(defaultPreferences);

    return {
      preferences: defaultPreferences,
      conversations: [fallbackConversation],
      activeConversationId: fallbackConversation.id,
      isElectron: false,
    };
  }

  const searchParams = new URLSearchParams(window.location.search);
  const isElectron =
    Boolean(window.electronShell?.isElectron) || searchParams.get("shell") === "electron";

  const storedPreferences = safeJsonParse<Partial<UserPreferences>>(
    window.localStorage.getItem(STORAGE_KEYS.preferences),
    {},
  );
  const preferences = { ...defaultPreferences, ...storedPreferences };
  const storedConversations = safeJsonParse<ConversationRecord[]>(
    window.localStorage.getItem(STORAGE_KEYS.conversations),
    [],
  );
  const conversations =
    storedConversations.length > 0 ? storedConversations : [createConversation(preferences)];
  const storedActiveConversationId = window.localStorage.getItem(STORAGE_KEYS.activeConversationId);

  return {
    preferences,
    conversations,
    activeConversationId:
      storedActiveConversationId &&
      conversations.some((conversation) => conversation.id === storedActiveConversationId)
        ? storedActiveConversationId
        : conversations[0].id,
    isElectron,
  };
}

function parseMessages(rawText: string): ReplyRequest["messages"] {
  return rawText
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const normalized = line.replace("：", ":");
      const [speaker, ...rest] = normalized.split(":");
      const content = rest.join(":").trim();

      if (!content) {
        return null;
      }

      return {
        role: speaker.includes("我") ? ("user" as const) : ("other" as const),
        content,
      };
    })
    .filter((message): message is NonNullable<typeof message> => Boolean(message));
}

function formatTimestamp(value: string) {
  return new Intl.DateTimeFormat("zh-CN", {
    month: "numeric",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

export function ReplyAssistant() {
  const [initialState] = useState(getInitialState);
  const [preferences, setPreferences] = useState<UserPreferences>(initialState.preferences);
  const [conversations, setConversations] = useState<ConversationRecord[]>(initialState.conversations);
  const [activeConversationId, setActiveConversationId] = useState(initialState.activeConversationId);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [copyNotice, setCopyNotice] = useState("");
  const [isElectron] = useState(initialState.isElectron);
  const [isPinned, setIsPinned] = useState(true);

  const activeConversation =
    conversations.find((conversation) => conversation.id === activeConversationId) ?? conversations[0];

  useEffect(() => {
    window.localStorage.setItem(STORAGE_KEYS.preferences, JSON.stringify(preferences));
  }, [preferences]);

  useEffect(() => {
    window.localStorage.setItem(STORAGE_KEYS.conversations, JSON.stringify(conversations));
  }, [conversations]);

  useEffect(() => {
    window.localStorage.setItem(STORAGE_KEYS.activeConversationId, activeConversationId);
  }, [activeConversationId]);

  function updateActiveConversation(patch: Partial<ConversationRecord>) {
    if (!activeConversation) {
      return;
    }

    setConversations((current) =>
      current.map((conversation) =>
        conversation.id === activeConversation.id
          ? {
              ...conversation,
              ...patch,
              updatedAt: patch.updatedAt ?? new Date().toISOString(),
            }
          : conversation,
      ),
    );
  }

  function createNewConversation() {
    const conversation = createConversation(preferences);
    setConversations((current) => [conversation, ...current]);
    setActiveConversationId(conversation.id);
    setError("");
    setCopyNotice("");
  }

  function deleteConversation(conversationId: string) {
    const remaining = conversations.filter((conversation) => conversation.id !== conversationId);

    if (remaining.length === 0) {
      const conversation = createConversation(preferences);
      setConversations([conversation]);
      setActiveConversationId(conversation.id);
    } else {
      setConversations(remaining);
      if (activeConversationId === conversationId) {
        setActiveConversationId(remaining[0].id);
      }
    }

    if (activeConversationId === conversationId) {
      setError("");
      setCopyNotice("");
    }
  }

  async function handleGenerate() {
    if (!activeConversation) {
      return;
    }

    setLoading(true);
    setError("");
    setCopyNotice("");

    try {
      const payload: ReplyRequest = {
        scene: activeConversation.scene,
        tone: activeConversation.tone,
        goal: activeConversation.goal,
        messages: parseMessages(activeConversation.context),
        preferenceNote: `${preferences.displayName}的表达偏好：${preferences.preferenceNote}`,
        signature: preferences.signature,
      };

      const response = await fetch("/api/reply", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      const data = (await response.json()) as ReplyResponse & { error?: string };

      if (!response.ok) {
        throw new Error(data.error || "生成失败，请稍后重试。");
      }

      updateActiveConversation({
        title:
          activeConversation.title === "新的对话" || !activeConversation.title.trim()
            ? deriveConversationTitle(activeConversation.context)
            : activeConversation.title,
        replies: data.replies,
        note: data.note || "已根据当前场景生成候选回复。",
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "生成失败，请稍后重试。");
    } finally {
      setLoading(false);
    }
  }

  async function copyReply(reply: string) {
    try {
      await navigator.clipboard.writeText(reply);
      setCopyNotice("已复制到剪贴板。");
      window.setTimeout(() => setCopyNotice(""), 1800);
    } catch {
      setCopyNotice("复制失败，请手动选择文本。");
    }
  }

  async function togglePinned() {
    if (!window.electronShell?.setPinned) {
      return;
    }

    const nextPinned = await window.electronShell.setPinned(!isPinned);
    setIsPinned(nextPinned);
  }

  if (!activeConversation) {
    return null;
  }

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-7xl flex-col px-4 py-6 sm:px-6 lg:px-8">
      <section className="relative overflow-hidden rounded-[32px] border border-line bg-paper shadow-[0_24px_80px_rgba(84,54,30,0.12)] backdrop-blur xl:min-h-[calc(100vh-3rem)]">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(191,90,54,0.16),transparent_26%),linear-gradient(135deg,rgba(255,255,255,0.28),transparent_42%)]" />
        <div className="relative grid gap-6 p-4 sm:p-6 xl:grid-cols-[1.2fr_0.95fr] xl:p-8">
          <div className="space-y-6">
            <div className="space-y-4 rounded-[26px] border border-line bg-paper-strong p-5 sm:p-7">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <span className="inline-flex rounded-full bg-accent-soft px-3 py-1 text-sm font-medium text-accent-strong">
                  AI Chat Reply Assistant
                </span>
                {isElectron ? (
                  <div className="flex items-center gap-2">
                    <span className="rounded-full border border-line bg-white/80 px-3 py-1 text-xs text-muted">
                      悬浮窗模式
                    </span>
                    <button
                      type="button"
                      onClick={togglePinned}
                      className="rounded-full border border-line bg-white/80 px-3 py-1 text-xs text-muted transition hover:border-accent/40"
                    >
                      {isPinned ? "取消置顶" : "置顶窗口"}
                    </button>
                    <button
                      type="button"
                      onClick={() => window.electronShell?.minimize?.()}
                      className="rounded-full border border-line bg-white/80 px-3 py-1 text-xs text-muted transition hover:border-accent/40"
                    >
                      最小化
                    </button>
                    <button
                      type="button"
                      onClick={() => window.electronShell?.close?.()}
                      className="rounded-full border border-line bg-white/80 px-3 py-1 text-xs text-muted transition hover:border-accent/40"
                    >
                      关闭
                    </button>
                  </div>
                ) : null}
              </div>

              <div className="space-y-3">
                <h1 className="max-w-2xl text-3xl font-semibold tracking-tight sm:text-5xl">
                  生成更像真人的候选回复，
                  <br />
                  并把聊天习惯记下来
                </h1>
                <p className="max-w-2xl text-sm leading-7 text-muted sm:text-base">
                  这一版已经能在本地保存聊天历史、用户偏好和最近结果，下一步你就可以把它作为桌面悬浮窗长期挂着用了。
                </p>
              </div>

              <div className="grid gap-3 text-sm text-muted sm:grid-cols-3">
                <div className="rounded-2xl border border-line bg-white/70 p-4">
                  <p className="font-medium text-foreground">历史可回看</p>
                  <p className="mt-1 leading-6">生成过的对话会自动保存在本机浏览器里。</p>
                </div>
                <div className="rounded-2xl border border-line bg-white/70 p-4">
                  <p className="font-medium text-foreground">偏好会记住</p>
                  <p className="mt-1 leading-6">下次打开时沿用你的常用场景、风格和语气偏好。</p>
                </div>
                <div className="rounded-2xl border border-line bg-white/70 p-4">
                  <p className="font-medium text-foreground">桌面可悬浮</p>
                  <p className="mt-1 leading-6">Electron 版会以置顶小窗运行，适合边聊边用。</p>
                </div>
              </div>
            </div>

            <div className="grid gap-4 rounded-[26px] border border-line bg-paper-strong p-5 sm:p-7">
              <div className="grid gap-4 sm:grid-cols-[1fr_1fr]">
                <div>
                  <label htmlFor="title" className="mb-2 block text-sm font-medium">
                    对话标题
                  </label>
                  <input
                    id="title"
                    value={activeConversation.title}
                    onChange={(event) => updateActiveConversation({ title: event.target.value })}
                    placeholder="比如：周末饭局 / 客户催进度"
                    className="w-full rounded-2xl border border-line bg-white/80 px-4 py-3 outline-none transition focus:border-accent"
                  />
                </div>
                <div>
                  <label htmlFor="goal" className="mb-2 block text-sm font-medium">
                    本轮目标
                  </label>
                  <input
                    id="goal"
                    value={activeConversation.goal}
                    onChange={(event) => updateActiveConversation({ goal: event.target.value })}
                    placeholder="比如：礼貌拒绝、推进约时间、缓和语气"
                    className="w-full rounded-2xl border border-line bg-white/80 px-4 py-3 outline-none transition focus:border-accent"
                  />
                </div>
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium">聊天场景</label>
                <div className="grid gap-3 sm:grid-cols-2">
                  {sceneOptions.map((option) => {
                    const active = option.value === activeConversation.scene;

                    return (
                      <button
                        key={option.value}
                        type="button"
                        onClick={() => {
                          updateActiveConversation({ scene: option.value });
                          setPreferences((current) => ({ ...current, preferredScene: option.value }));
                        }}
                        className={`rounded-2xl border px-4 py-3 text-left transition ${
                          active
                            ? "border-accent bg-accent-soft text-foreground"
                            : "border-line bg-white/70 hover:border-accent/40"
                        }`}
                      >
                        <div className="font-medium">{option.label}</div>
                        <div className="mt-1 text-sm text-muted">{option.hint}</div>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium">回复语气</label>
                <div className="flex flex-wrap gap-2">
                  {toneOptions.map((option) => {
                    const active = option.value === activeConversation.tone;

                    return (
                      <button
                        key={option.value}
                        type="button"
                        onClick={() => {
                          updateActiveConversation({ tone: option.value });
                          setPreferences((current) => ({ ...current, preferredTone: option.value }));
                        }}
                        className={`rounded-full border px-4 py-2 text-sm transition ${
                          active
                            ? "border-accent bg-accent text-white"
                            : "border-line bg-white/70 text-foreground hover:border-accent/40"
                        }`}
                      >
                        {option.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div>
                <label htmlFor="context" className="mb-2 block text-sm font-medium">
                  最近聊天上下文
                </label>
                <textarea
                  id="context"
                  value={activeConversation.context}
                  onChange={(event) => updateActiveConversation({ context: event.target.value })}
                  rows={isElectron ? 6 : 8}
                  placeholder="每行一条，建议用“对方：”和“我：”开头"
                  className="w-full rounded-[22px] border border-line bg-white/80 px-4 py-3 leading-7 outline-none transition focus:border-accent"
                />
                <p className="mt-2 text-xs leading-6 text-muted">
                  输入格式示例：`对方：周末见吗？` / `我：这周有点忙`
                </p>
              </div>

              <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                <button
                  type="button"
                  onClick={handleGenerate}
                  disabled={loading}
                  className="inline-flex items-center justify-center rounded-full bg-accent px-5 py-3 font-medium text-white transition hover:bg-accent-strong disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {loading ? "生成中..." : "生成 3 条候选回复"}
                </button>
                <button
                  type="button"
                  onClick={createNewConversation}
                  className="inline-flex items-center justify-center rounded-full border border-line bg-white/70 px-5 py-3 font-medium text-foreground transition hover:border-accent/40"
                >
                  新建对话
                </button>
                <p className="text-sm text-muted">
                  本地已保存 {conversations.length} 条对话
                </p>
              </div>
            </div>
          </div>

          <aside className="space-y-4">
            <div className="rounded-[26px] border border-line bg-[#fffaf4] p-5 sm:p-7">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-sm font-medium text-muted">候选回复</p>
                  <h2 className="mt-1 text-2xl font-semibold">可以直接发的版本</h2>
                </div>
                <div className="rounded-full border border-line bg-white px-3 py-1 text-xs text-muted">
                  {sceneOptions.find((item) => item.value === activeConversation.scene)?.label} /{" "}
                  {toneOptions.find((item) => item.value === activeConversation.tone)?.label}
                </div>
              </div>

              <div className="mt-4 space-y-3">
                {activeConversation.replies.map((reply, index) => (
                  <div
                    key={`${reply}-${index}`}
                    className="rounded-[22px] border border-line bg-white p-4 shadow-[0_10px_24px_rgba(84,54,30,0.06)]"
                  >
                    <div className="mb-2 flex items-center justify-between text-xs text-muted">
                      <span>候选 {index + 1}</span>
                      <button
                        type="button"
                        onClick={() => copyReply(reply)}
                        className="rounded-full border border-line px-3 py-1 transition hover:border-accent/40 hover:text-accent-strong"
                      >
                        复制
                      </button>
                    </div>
                    <p className="text-[15px] leading-7 text-foreground">{reply}</p>
                  </div>
                ))}
              </div>

              <div className="mt-4 rounded-[22px] border border-dashed border-line bg-white/65 p-4 text-sm leading-7 text-muted">
                <p>{activeConversation.note || starterNote}</p>
                {copyNotice ? <p className="mt-2 text-accent-strong">{copyNotice}</p> : null}
                {error ? <p className="mt-2 text-[#a13b2a]">{error}</p> : null}
              </div>
            </div>

            <div className="rounded-[26px] border border-line bg-paper-strong p-5 sm:p-7">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-medium text-muted">用户偏好</p>
                  <h2 className="mt-1 text-2xl font-semibold">长期记忆</h2>
                </div>
                <span className="rounded-full bg-accent-soft px-3 py-1 text-xs text-accent-strong">
                  自动保存
                </span>
              </div>

              <div className="mt-4 space-y-4">
                <div>
                  <label htmlFor="displayName" className="mb-2 block text-sm font-medium">
                    你的称呼
                  </label>
                  <input
                    id="displayName"
                    value={preferences.displayName}
                    onChange={(event) =>
                      setPreferences((current) => ({ ...current, displayName: event.target.value }))
                    }
                    placeholder="比如：我 / 小王 / 阿泽"
                    className="w-full rounded-2xl border border-line bg-white/80 px-4 py-3 outline-none transition focus:border-accent"
                  />
                </div>

                <div>
                  <label htmlFor="defaultGoal" className="mb-2 block text-sm font-medium">
                    新对话默认目标
                  </label>
                  <input
                    id="defaultGoal"
                    value={preferences.defaultGoal}
                    onChange={(event) =>
                      setPreferences((current) => ({ ...current, defaultGoal: event.target.value }))
                    }
                    placeholder="比如：先礼貌再明确"
                    className="w-full rounded-2xl border border-line bg-white/80 px-4 py-3 outline-none transition focus:border-accent"
                  />
                </div>

                <div>
                  <label htmlFor="preferenceNote" className="mb-2 block text-sm font-medium">
                    风格偏好备注
                  </label>
                  <textarea
                    id="preferenceNote"
                    value={preferences.preferenceNote}
                    onChange={(event) =>
                      setPreferences((current) => ({ ...current, preferenceNote: event.target.value }))
                    }
                    rows={3}
                    placeholder="比如：别太油，像熟人聊天，少用感叹号"
                    className="w-full rounded-[22px] border border-line bg-white/80 px-4 py-3 leading-7 outline-none transition focus:border-accent"
                  />
                </div>

                <div>
                  <label htmlFor="signature" className="mb-2 block text-sm font-medium">
                    常用收尾
                  </label>
                  <input
                    id="signature"
                    value={preferences.signature}
                    onChange={(event) =>
                      setPreferences((current) => ({ ...current, signature: event.target.value }))
                    }
                    placeholder="比如：有空再约 / 你先忙"
                    className="w-full rounded-2xl border border-line bg-white/80 px-4 py-3 outline-none transition focus:border-accent"
                  />
                </div>
              </div>
            </div>

            <div className="rounded-[26px] border border-line bg-paper-strong p-5 sm:p-7">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-medium text-muted">聊天历史</p>
                  <h2 className="mt-1 text-2xl font-semibold">最近保存</h2>
                </div>
                <button
                  type="button"
                  onClick={createNewConversation}
                  className="rounded-full border border-line bg-white/80 px-3 py-2 text-xs font-medium text-foreground transition hover:border-accent/40"
                >
                  新建
                </button>
              </div>

              <div className="mt-4 space-y-3">
                {conversations.map((conversation) => {
                  const active = conversation.id === activeConversationId;

                  return (
                    <div
                      key={conversation.id}
                      className={`rounded-[22px] border p-4 transition ${
                        active ? "border-accent bg-accent-soft/60" : "border-line bg-white/75"
                      }`}
                    >
                      <button
                        type="button"
                        onClick={() => {
                          setActiveConversationId(conversation.id);
                          setError("");
                          setCopyNotice("");
                        }}
                        className="w-full text-left"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <p className="font-medium text-foreground">{conversation.title}</p>
                            <p className="mt-1 text-sm text-muted">
                              {sceneOptions.find((item) => item.value === conversation.scene)?.label} /{" "}
                              {toneOptions.find((item) => item.value === conversation.tone)?.label}
                            </p>
                          </div>
                          <span className="text-xs text-muted">{formatTimestamp(conversation.updatedAt)}</span>
                        </div>
                        <p className="mt-3 line-clamp-2 text-sm leading-6 text-muted">
                          {conversation.context}
                        </p>
                      </button>
                      <div className="mt-3 flex justify-end">
                        <button
                          type="button"
                          onClick={() => deleteConversation(conversation.id)}
                          className="rounded-full border border-line px-3 py-1 text-xs text-muted transition hover:border-[#a13b2a]/40 hover:text-[#a13b2a]"
                        >
                          删除
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </aside>
        </div>
      </section>
    </main>
  );
}
