#!/usr/bin/env node
/**
 * eat-rice-nudge — 吃饭自动触发 hook（PostToolUse）
 *
 * 机制：
 * 1. 每次 PostToolUse 事件计数 +1（按 session_id 隔离）
 * 2. 连续 >= THRESHOLD 轮工具调用未与用户对话 → 向 agent 注入
 *    additionalContext："该吃饭了"，agent 按 eat-rice skill 三幕剧执行
 * 3. 注入后计数清零 + 冷却 COOLDOWN_MS，防刷屏
 * 4. hook 是 nudge 不是强制：context 里保留"检索无增量可跳过"的判断余地
 *
 * 可调参数（环境变量）：
 *   EAT_RICE_THRESHOLD    连续多少轮工具调用触发，默认 8
 *   EAT_RICE_COOLDOWN_MIN 两次提醒最小间隔（分钟），默认 10
 *
 * 兼容 Claude Code 系客户端（~/.claude/settings.json）与 WorkBuddy（~/.workbuddy/settings.json）。
 */

const fs = require("node:fs");
const path = require("node:path");

const THRESHOLD = parseInt(process.env.EAT_RICE_THRESHOLD || "8", 10) || 8;
const COOLDOWN_MS = (parseInt(process.env.EAT_RICE_COOLDOWN_MIN || "10", 10) || 10) * 60 * 1000;

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
        "按 eat-rice skill（skills/eat-rice/SKILL.md）进入吃饭流程：" +
        "① 宣示'我去吃个饭🍚'（1-2 句，说清吃什么菜）→ " +
        "② 用可用搜索工具跑任务相关检索（菜色A 补素材 查询≤5 / 菜色B 核查产出事实）→ " +
        "③ 汇报'吃饱了🍚'并立刻接回主线。" +
        "判断余地：若当前检索对主线无明确增量、或 5 轮内刚吃过，可跳过本次（反表演原则，不为吃而吃）。",
    },
  };
  process.stdout.write(JSON.stringify(response));
  process.exit(0);
});
