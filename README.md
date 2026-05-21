# AI Chat Reply Assistant

一个面向微信 / QQ 聊天场景的半自动回复助手原型。

你手动贴入最近几轮聊天上下文，选择场景、语气和目标后，页面会生成 3 条更自然的候选回复。当前版本保留“人工确认后发送”的模式，不做自动代发。

## 技术栈

- `Next.js 16`
- `React 19`
- `TypeScript`
- `Tailwind CSS 4`
- `Electron`
- `OpenAI-compatible API`
- `localStorage`

## 当前能力

- `Next.js + TypeScript + App Router` 项目骨架
- 聊天场景与语气切换
- 用户偏好本地保存
- 聊天历史本地保存与切换
- `/api/reply` 接口
- 未配置模型密钥时的本地 mock 返回
- 基础敏感关键词拦截
- Electron 悬浮窗桌面壳

## Web 版启动

先安装依赖：

```bash
npm install
```

然后启动开发环境：

```bash
npm run dev
```

启动成功后，在浏览器里打开：

```txt
http://localhost:3000
```

如果 `3000` 端口被占用，Next.js 会自动换到 `3001` 或其他端口，以终端里显示的 `Local:` 地址为准。

## Electron 悬浮窗启动

先启动网页开发服务：

```bash
npm run dev
```

再开一个新的终端窗口，进入同一个项目目录后运行：

```bash
npm run electron
```

说明：

- Electron 会打开一个默认置顶的小窗
- 小窗默认加载 `http://localhost:3000/?shell=electron`
- 如果网页服务没启动，Electron 会显示一个带说明的兜底页面
- 如果网页服务跑在 `3001`，可以这样启动：

```bash
ELECTRON_START_URL=http://localhost:3001/?shell=electron npm run electron
```

## 如何接入真实模型

先复制环境变量模板：

```bash
cp .env.example .env.local
```

然后编辑 `.env.local`：

```env
OPENAI_API_KEY=你的 DeepSeek 或 OpenAI 兼容 API 密钥
OPENAI_MODEL=deepseek-chat
OPENAI_BASE_URL=https://api.deepseek.com
```

说明：

- 变量名叫 `OPENAI_*`，但可以接任何兼容 OpenAI 协议的服务
- `OPENAI_API_KEY` 不填时，页面会走 mock 文案，方便前端联调
- `OPENAI_MODEL` 可以换成你自己的可用模型
- `OPENAI_BASE_URL` 可以填 OpenAI 官方地址，也可以填 DeepSeek 或你自己的兼容网关

## 数据保存方式

当前版本的历史记录和用户偏好保存在浏览器本地存储里：

- `reply-assistant.preferences`
- `reply-assistant.conversations`
- `reply-assistant.activeConversationId`

这意味着：

- 同一浏览器下刷新后不会丢
- 换浏览器、清理站点数据后会消失
- Electron 版会使用自己的本地会话存储

## 常用命令

```bash
npm run dev
npm run build
npm run lint
npm run electron
```

## 主要文件

- `src/app/page.tsx`
  首页入口
- `src/components/reply-assistant-shell.tsx`
  客户端壳组件
- `src/components/reply-assistant.tsx`
  主界面和交互逻辑
- `src/lib/conversation.ts`
  默认数据、本地存储 key 和对话帮助函数
- `src/app/api/reply/route.ts`
  生成回复的接口
- `src/lib/model.ts`
  模型调用与 mock 兜底
- `src/lib/prompt.ts`
  提示词拼接
- `src/lib/safety.ts`
  风险过滤
- `electron/main.cjs`
  Electron 主进程
- `electron/preload.cjs`
  Electron 预加载桥接
