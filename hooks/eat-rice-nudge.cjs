#!/usr/bin/env node
/**
 * eat-rice-nudge — 吃饭自动触发 hook（PostToolUse）
 *
 * 路径：sakurabot/skills/eat-rice/hooks/eat-rice-nudge.cjs
 *
 * 机制：
 * 1. 每次 PostToolUse 事件计数 +1（按 session_id 隔离）
 * 2. 连续 >= THRESHOLD 轮工具调用未与用户对话 → 向 agent 注入
 *    additionalContext："该吃饭了"，agent 按 eat-rice skill 三幕剧执行
 * 3. 注入后计数清零 + 冷却 COOLDOWN_MS，防刷屏
 * 4. hook 是 nudge 不是强制：context 里保留"检索无增量可跳过"的判断余地
 *
 * 由 WorkBuddy（~/.workbuddy/settings.json）与 cc-haha（~/.claude/settings.json）
 * 的 hooks.PostToolUse 调用。脚本在本 skill 目录内 = 家的一部分，git 可管。
 */

const fs = require("node:fs");
const path = require("node:path");

const THRESHOLD = 8;        // 连续 N 轮工具调用 → 提醒吃饭
const COOLDOWN_MS = 10 * 60 * 1000; // 两次提醒最小间隔 10 分钟

const STATE_FILE = path.join(__dirname, "state.json");

let raw = "";
process.stdin.setEncoding("utf8");
process.stdin.on("data", (c) => (raw += c));
process.stdin.on("end", () => {
  let input = {};
  try { input = raw.trim() ? JSON.parse(raw) : {}; } catch { /* 健壮：坏输入不崩 */ }

  const sessionId = (input.session_id || "unknown").slice(0, 32);

  let state = {};
  try { state = JSON.parse(fs.readFileSync(STATE_FILE, "utf8")); } catch { /* 首次运行 */ }

  const s = state[sessionId] || { count: 0, lastNudge: 0 };
  s.count += 1;

  const now = Date.now();
  const due = s.count >= THRESHOLD && now - s.lastNudge >= COOLDOWN_MS;

  if (due) {
    s.count = 0;
    s.lastNudge = now;
  }
  state[sessionId] = s;
  try { fs.writeFileSync(STATE_FILE, JSON.stringify(state)); } catch (e) {
    console.error("[eat-rice-nudge] state write failed:", e.message);
  }

  if (!due) { process.exit(0); } // 静默放行

  const response = {
    hookSpecificOutput: {
      hookEventName: "PostToolUse",
      additionalContext:
        "🍚 eat-rice 自动触发：本会话已连续 " + THRESHOLD + "+ 轮工具调用未与用户对话。" +
        "按 eat-rice skill（skills/eat-rice/SKILL.md）进入吃饭流程——吃饭是路由器，按任务当下最大缺口选菜：" +
        "① 宣示'我去吃个饭🍚'（说清路由到什么菜）→ " +
        "② 吃真实的一餐：🍜检索饭(缺外部信息) / 🔍核查饭(产出有硬断言) / 🥗复盘饭(刚完成阶段) / 🍱规划饭(下步不明) / 🍚复盘+规划套餐(无明显单一缺口) → " +
        "③ 汇报'吃饱了🍚'+ 记 meal-log.md 账本 + 立刻接回主线。" +
        "没有空路由：每顿必须路由到真实劳动；唯一不开饭的情形是上下文快满（先压缩）。",
    },
  };
  process.stdout.write(JSON.stringify(response));
  process.exit(0);
});
