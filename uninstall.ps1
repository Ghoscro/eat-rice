# eat-rice uninstaller (Windows PowerShell)
# 用法: .\uninstall.ps1 [-Target claude|workbuddy|both] [-Purge]
param(
    [string]$Target = "both",
    [switch]$Purge
)

$ErrorActionPreference = "Stop"

function Remove-One {
    param([string]$Root, [string]$Name)
    $SettingsPath = Join-Path $Root "settings.json"
    if (Test-Path $SettingsPath) {
        $code = @'
const fs = require("fs");
const p = process.argv[1];
let s;
try { s = JSON.parse(fs.readFileSync(p, "utf8")); } catch { process.exit(0); }
if (!s.hooks || !s.hooks.PostToolUse) process.exit(0);
s.hooks.PostToolUse = s.hooks.PostToolUse.filter(g =>
  !(g.hooks || []).some(h => (h.command || "").includes("eat-rice-nudge.cjs")));
if (s.hooks.PostToolUse.length === 0) delete s.hooks.PostToolUse;
if (Object.keys(s.hooks).length === 0) delete s.hooks;
fs.writeFileSync(p, JSON.stringify(s, null, 2));
console.log("   OK 已移除 eat-rice hook: " + p);
'@
        node -e $code $SettingsPath
    }
    $SkillDir = Join-Path $Root "skills\eat-rice"
    if ($Purge -and (Test-Path $SkillDir)) {
        Remove-Item $SkillDir -Recurse -Force -Confirm:$false
        Write-Host "   删除 $SkillDir"
    } elseif (Test-Path $SkillDir) {
        Write-Host "   skill 目录保留：$SkillDir（加 -Purge 一并删除）"
    }
    Write-Host "   $Name 完成"
}

if ($Target -in @("claude", "both"))  { Remove-One "$env:USERPROFILE\.claude" "Claude Code" }
if ($Target -in @("workbuddy", "both")) { Remove-One "$env:USERPROFILE\.workbuddy" "WorkBuddy" }

Write-Host "🍚 卸载完成。"
