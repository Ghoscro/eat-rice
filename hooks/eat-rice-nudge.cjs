#!/usr/bin/env node
/**
 * eat-rice-nudge — 吃饭提醒 hook（PostToolUse）
 *
 * 1. 每次 PostToolUse 事件计数 +1（按 session_id 的哈希隔离）
 * 2. 累计 >= THRESHOLD 次 → 注入“该判断是否值得吃饭了”
 * 3. 注入后计数清零 + 冷却，防刷屏
 * 4. hook 是 nudge 不是强制：预计增量不高于打断成本时跳过
 * 5. 状态写入用户运行时目录，不写 Skill 安装目录；并发下只保证近似计数
 *
 * 仅适用于明确兼容 Claude Code 风格 hooks.PostToolUse 的宿主。
 */

const fs = require("node:fs");
const path = require("node:path");
const os = require("node:os");
const crypto = require("node:crypto");

function intFromEnv(name, fallback, minimum) {
  const value = Number.parseInt(process.env[name] || "", 10);
  return Number.isFinite(value) && value >= minimum ? value : fallback;
}

const THRESHOLD = intFromEnv("EAT_RICE_THRESHOLD", 8, 1);
const COOLDOWN_MS = intFromEnv("EAT_RICE_COOLDOWN_MS", 10 * 60 * 1000, 0);
const LOCK_STALE_MS = 30 * 1000;

function isWithin(child, parent) {
  const relative = path.relative(parent, child);
  return relative === "" || (!relative.startsWith("..") && !path.isAbsolute(relative));
}

function resolveThroughExistingAncestor(target) {
  let cursor = path.resolve(target);
  const missing = [];
  while (!fs.existsSync(cursor)) {
    const parent = path.dirname(cursor);
    if (parent === cursor) return path.resolve(target);
    missing.unshift(path.basename(cursor));
    cursor = parent;
  }
  return path.join(fs.realpathSync.native(cursor), ...missing);
}

function resolveStateDir() {
  const configured = process.env.EAT_RICE_STATE_DIR;
  if (configured && !path.isAbsolute(configured)) return null;

  const resolved = path.resolve(configured || path.join(os.tmpdir(), "eat-rice-nudge"));
  const skillDir = fs.realpathSync.native(path.resolve(__dirname, ".."));
  const candidate = resolveThroughExistingAncestor(resolved);
  const normalize = (value) => process.platform === "win32" ? value.toLowerCase() : value;
  if (isWithin(normalize(candidate), normalize(skillDir))) return null;
  return resolved;
}

const STATE_DIR = resolveStateDir();

function statePathFor(sessionId) {
  const key = crypto.createHash("sha256").update(sessionId, "utf8").digest("hex").slice(0, 24);
  return path.join(STATE_DIR, `${key}.json`);
}

function readState(stateFile) {
  try {
    const parsed = JSON.parse(fs.readFileSync(stateFile, "utf8"));
    if (!parsed || typeof parsed !== "object") return { count: 0, lastNudge: 0 };
    return {
      count: Number.isFinite(parsed.count) && parsed.count >= 0 ? parsed.count : 0,
      lastNudge: Number.isFinite(parsed.lastNudge) && parsed.lastNudge >= 0 ? parsed.lastNudge : 0,
    };
  } catch {
    return { count: 0, lastNudge: 0 };
  }
}

function writeState(stateFile, state) {
  const tempFile = `${stateFile}.${process.pid}.${Date.now()}.tmp`;
  try {
    fs.writeFileSync(tempFile, JSON.stringify(state), { encoding: "utf8", mode: 0o600 });
    fs.renameSync(tempFile, stateFile);
  } finally {
    try { fs.unlinkSync(tempFile); } catch { /* rename 成功或无需清理 */ }
  }
}

function acquireLock(stateFile) {
  fs.mkdirSync(path.dirname(stateFile), { recursive: true });
  const lockFile = `${stateFile}.lock`;
  for (let attempt = 0; attempt < 2; attempt += 1) {
    try {
      const fd = fs.openSync(lockFile, "wx", 0o600);
      return { fd, lockFile };
    } catch (error) {
      if (error.code !== "EEXIST") throw error;
      try {
        const age = Date.now() - fs.statSync(lockFile).mtimeMs;
        if (age > LOCK_STALE_MS) {
          fs.unlinkSync(lockFile);
          continue;
        }
      } catch { /* 锁在检查时消失，重试一次 */ }
      return null;
    }
  }
  return null;
}

function releaseLock(lock) {
  if (!lock) return;
  try { fs.closeSync(lock.fd); } catch { /* 已关闭 */ }
  try { fs.unlinkSync(lock.lockFile); } catch { /* 已移除 */ }
}

let raw = "";
process.stdin.setEncoding("utf8");
process.stdin.on("data", (chunk) => (raw += chunk));
process.stdin.on("end", () => {
  const text = raw.replace(/^\uFEFF/, "").trim();
  if (!text) process.exit(0);

  let input;
  try { input = JSON.parse(text); } catch { process.exit(0); }

  const eventName = input && (input.hook_event_name || input.hookEventName);
  if (eventName && eventName !== "PostToolUse") process.exit(0);

  const sessionId = input && typeof input.session_id === "string" ? input.session_id.trim() : "";
  if (!sessionId || !STATE_DIR) process.exit(0);

  const stateFile = statePathFor(sessionId);
  let lock;
  let due = false;
  let stateError = null;
  try {
    lock = acquireLock(stateFile);
    if (!lock) return;

    const state = readState(stateFile);
    state.count += 1;
    const now = Date.now();
    due = state.count >= THRESHOLD && now - state.lastNudge >= COOLDOWN_MS;
    if (due) {
      state.count = 0;
      state.lastNudge = now;
    }
    writeState(stateFile, state);
  } catch (error) {
    stateError = error;
  } finally {
    releaseLock(lock);
  }

  if (stateError) {
    console.error("[eat-rice-nudge] state write failed:", stateError.message);
    return;
  }

  if (!due) process.exit(0);

  const response = {
    hookSpecificOutput: {
      hookEventName: "PostToolUse",
      additionalContext:
        "🍚 eat-rice 提醒：本会话已累计 " + THRESHOLD + "+ 次 PostToolUse 事件。" +
        "先做净增量门：如果没有新缺口，或预计增量不高于打断成本，就继续主线且不记账；不要为仪式硬凑一顿。" +
        "值得开饭时，按任务最大缺口在后台选择真实补给，但不要向用户解释菜色、路由依据、研究计划或正在做什么。" +
        "用户可见层只保留：① 一句自然的'我去吃个饭，等我一会儿呀🍚'；② 期间安静工作，不直播过程；③ 回来后自然说'我回来啦'或'吃饱了'，直接给有用结果，不套固定汇报模板。" +
        "不要为了演吃饭调用 sleep、空等或制造假延迟，真实工作耗时就是吃饭时间。" +
        "原缺口没补上就自然说明'这顿没吃到'和仍未确认的部分，不得用思考饭冒充关闭。" +
        "记账仅在当前任务允许写入且已有安全落点时可选进行，不得写入 Skill 安装目录。" +
        "上下文快满时先压缩，不开饭。",
    },
  };
  process.stdout.write(JSON.stringify(response));
  process.exit(0);
});
