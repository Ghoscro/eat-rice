# eat-rice installer (Windows PowerShell)
# 用法: .\install.ps1 [-Target claude|workbuddy|both]
param(
    [string]$Target = "both"
)

$ErrorActionPreference = "Stop"
$Src = $PSScriptRoot

if (-not (Get-Command node -ErrorAction SilentlyContinue)) {
    Write-Host "❌ 需要 Node.js >= 16" -ForegroundColor Red; exit 1
}

function Install-One {
    param([string]$Root, [string]$Name)
    $SkillDir = Join-Path $Root "skills\eat-rice"
    New-Item -ItemType Directory -Force -Path "$SkillDir\hooks" | Out-Null
    Write-Host "📦 $Name`: 安装到 $SkillDir"
    Copy-Item "$Src\SKILL.md" "$SkillDir\SKILL.md" -Force
    Copy-Item "$Src\hooks\eat-rice-nudge.cjs" "$SkillDir\hooks\eat-rice-nudge.cjs" -Force
    if (Test-Path "$Src\LICENSE") { Copy-Item "$Src\LICENSE" "$SkillDir\LICENSE" -Force }

    $SettingsPath = Join-Path $Root "settings.json"
    $HookCmd = "node $SkillDir\hooks\eat-rice-nudge.cjs"
    $code = @'
const fs = require("fs");
const settingsPath = process.argv[1], hookCmd = process.argv[2];
let s = {};
try { s = JSON.parse(fs.readFileSync(settingsPath, "utf8")); } catch { s = {}; }
s.hooks = s.hooks || {};
const entry = { hooks: [{ type: "command", command: hookCmd, timeout: 15 }] };
const exists = (s.hooks.PostToolUse || []).some(g =>
  (g.hooks || []).some(h => (h.command || "").includes("eat-rice-nudge.cjs")));
if (!exists) {
  s.hooks.PostToolUse = (s.hooks.PostToolUse || []).concat(entry);
  fs.writeFileSync(settingsPath, JSON.stringify(s, null, 2));
  console.log("   OK hooks.PostToolUse 已写入 " + settingsPath);
} else {
  console.log("   OK hooks 已配置过，跳过");
}
'@
    node -e $code $SettingsPath $HookCmd
}

if ($Target -in @("claude", "both"))  { Install-One "$env:USERPROFILE\.claude" "Claude Code" }
if ($Target -in @("workbuddy", "both")) { Install-One "$env:USERPROFILE\.workbuddy" "WorkBuddy" }

Write-Host ""
Write-Host "🍚 安装完成！新开一个会话即生效。"
Write-Host "   验证: 让 agent 连续干 8+ 轮工具调用的活，看它会不会说'我去吃个饭🍚'"
Write-Host "   手动触发: 直接说 '去吃饭吧' / '干饭去'"
