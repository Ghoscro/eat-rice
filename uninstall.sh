#!/usr/bin/env bash
# eat-rice uninstaller (macOS / Linux / Git Bash)
# 用法: bash uninstall.sh [--target=claude|workbuddy|both] [--purge]
set -euo pipefail

TARGET="both"; PURGE=""
for arg in "$@"; do
  case "$arg" in
    --target=*) TARGET="${arg#--target=}" ;;
    --purge) PURGE=1 ;;
  esac
done

remove_one() {
  local ROOT="$1" NAME="$2"
  # Git Bash/MSYS：归一化为混合斜杠，防参数路径被 MSYS 转换破坏
  case "$(uname -s)" in
    MINGW*|MSYS*|CYGWIN*) ROOT="$(cygpath -m "$ROOT")" ;;
  esac
  local SETTINGS="$ROOT/settings.json"
  if [ -f "$SETTINGS" ]; then
    node -e '
      const fs = require("fs");
      const p = process.argv[1];
      let s;
      try { s = JSON.parse(fs.readFileSync(p, "utf8")); }
      catch (e) { console.error("   ❌ settings.json 解析失败，已跳过（不动原文件）: " + e.message); process.exit(0); }
      if (!s.hooks || !s.hooks.PostToolUse) process.exit(0);
      const before = s.hooks.PostToolUse.length;
      s.hooks.PostToolUse = s.hooks.PostToolUse.filter(g =>
        !(g.hooks || []).some(h => (h.command || "").includes("eat-rice-nudge.cjs")));
      if (s.hooks.PostToolUse.length === 0) delete s.hooks.PostToolUse;
      if (Object.keys(s.hooks).length === 0) delete s.hooks;
      fs.writeFileSync(p, JSON.stringify(s, null, 2));
      console.log("   ✅ " + p + " 已移除 eat-rice hook（" + before + " → " + (s.hooks?.PostToolUse?.length ?? 0) + " 组）");
    ' "$SETTINGS" || true
  fi
  local SKILL_DIR="$ROOT/skills/eat-rice"
  if [ "$PURGE" ] && [ -d "$SKILL_DIR" ]; then
    rm -rf "$SKILL_DIR" && echo "   🗑️  已删除 $SKILL_DIR"
  elif [ -d "$SKILL_DIR" ]; then
    echo "   📁 skill 目录保留：$SKILL_DIR（加 --purge 一并删除）"
  fi
  echo "   $NAME 完成"
}

[ "$TARGET" = "claude" ] || [ "$TARGET" = "both" ] && remove_one "$HOME/.claude" "Claude Code"
[ "$TARGET" = "workbuddy" ] || [ "$TARGET" = "both" ] && remove_one "$HOME/.workbuddy" "WorkBuddy"

echo "🍚 卸载完成。"
