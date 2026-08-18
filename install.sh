#!/usr/bin/env bash
# eat-rice installer (macOS / Linux / Git Bash)
# 用法: bash install.sh [--target=claude|workbuddy|both]
set -euo pipefail

SRC="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
TARGET="both"
for arg in "$@"; do
  case "$arg" in
    --target=*) TARGET="${arg#--target=}" ;;
  esac
done

command -v node >/dev/null 2>&1 || { echo "❌ 需要 Node.js >= 16"; exit 1; }

install_one() {
  local ROOT="$1" NAME="$2"
  # Git Bash/MSYS：归一化为混合斜杠（C:/x/y），防参数路径被 MSYS 转换破坏
  case "$(uname -s)" in
    MINGW*|MSYS*|CYGWIN*) ROOT="$(cygpath -m "$ROOT")" ;;
  esac
  local SKILL_DIR="$ROOT/skills/eat-rice"
  mkdir -p "$SKILL_DIR/hooks"
  echo "📦 $NAME: 安装到 $SKILL_DIR"
  cp "$SRC/SKILL.md" "$SKILL_DIR/SKILL.md"
  cp "$SRC/hooks/eat-rice-nudge.cjs" "$SKILL_DIR/hooks/eat-rice-nudge.cjs"
  [ -f "$SRC/LICENSE" ] && cp "$SRC/LICENSE" "$SKILL_DIR/LICENSE"

  # 用 node 安全合并 settings.json 的 hooks.PostToolUse
  HOOK_CMD="node $SKILL_DIR/hooks/eat-rice-nudge.cjs"
  node -e '
    const fs = require("fs"), path = require("path");
    const settingsPath = process.argv[1], hookCmd = process.argv[2];
    let s = null;
    if (fs.existsSync(settingsPath)) {
      try { s = JSON.parse(fs.readFileSync(settingsPath, "utf8")); }
      catch (e) {
        console.error("   ❌ settings.json 解析失败（" + e.message + "）——为保护原文件，已跳过写入。请手动修复后重试。");
        process.exit(1);
      }
    }
    if (s === null) s = {};
    s.hooks = s.hooks || {};
    const entry = { hooks: [{ type: "command", command: hookCmd, timeout: 15 }] };
    const exists = (s.hooks.PostToolUse || []).some(g =>
      (g.hooks || []).some(h => (h.command || "").includes("eat-rice-nudge.cjs")));
    if (!exists) {
      s.hooks.PostToolUse = (s.hooks.PostToolUse || []).concat(entry);
      fs.mkdirSync(path.dirname(settingsPath), { recursive: true });
      fs.writeFileSync(settingsPath, JSON.stringify(s, null, 2));
      console.log("   ✅ hooks.PostToolUse 已写入 " + settingsPath);
    } else {
      console.log("   ✅ hooks 已配置过，跳过");
    }
  ' "$ROOT/settings.json" "$HOOK_CMD"
}

[ "$TARGET" = "claude" ] || [ "$TARGET" = "both" ] && install_one "$HOME/.claude" "Claude Code"
[ "$TARGET" = "workbuddy" ] || [ "$TARGET" = "both" ] && install_one "$HOME/.workbuddy" "WorkBuddy"

echo ""
echo "🍚 安装完成！新开一个会话即生效。"
echo "   验证: 让 agent 连续干 8+ 轮工具调用的活，看它会不会说'我去吃个饭🍚'"
echo "   手动触发: 直接说 '去吃饭吧' / '干饭去'"
