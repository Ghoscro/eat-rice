# 可选 PostToolUse Hook 配置

本页只是一份配置参考，不会自动修改任何文件。

## 风险边界

- 仅用于明确支持 Claude Code 风格 `hooks.PostToolUse` 的宿主。
- hook 会在每次工具调用后启动一次 Node.js。状态默认写入系统临时目录下的 `eat-rice-nudge/`，不会写入 Skill 安装目录。
- 它不联网、不读取项目文件或环境密钥；输入只解析事件名和 `session_id`，session ID 会先哈希再用于状态文件名。
- 每个 session 使用短锁；竞争事件宁可少记，也不重复提醒。它仍只是提醒器，不是精确审计器。
- 修改 `settings.json` 前先备份，并保留已有 hooks。不要整段覆盖配置文件。

## 配置示例

将 `<absolute-path>` 换成当前安装目录的绝对路径：

```json
{
  "hooks": {
    "PostToolUse": [
      {
        "hooks": [
          {
            "type": "command",
            "command": "node \"<absolute-path>/eat-rice/hooks/eat-rice-nudge.cjs\"",
            "timeout": 15
          }
        ]
      }
    ]
  }
}
```

Claude Code 的用户级配置通常是 `~/.claude/settings.json`；WorkBuddy 的位置以当前客户端实际配置为准。

默认阈值为累计 8 次 `PostToolUse`，两次提醒至少间隔 10 分钟。可用环境变量 `EAT_RICE_THRESHOLD`、`EAT_RICE_COOLDOWN_MS` 和绝对路径 `EAT_RICE_STATE_DIR` 覆盖；相对状态路径或指向 Skill 安装目录的路径会 fail-open，不落状态。

## 独立冒烟

macOS / Linux：

```bash
for i in 1 2 3 4 5 6 7 8; do
  echo '{"session_id":"eat-rice-smoke"}' | node hooks/eat-rice-nudge.cjs
done
```

PowerShell：

```powershell
1..8 | ForEach-Object {
  '{"session_id":"eat-rice-smoke"}' | node .\hooks\eat-rice-nudge.cjs
}
```

默认配置下，前七次静默，第八次输出一个 `hookSpecificOutput` JSON。输出只提醒 Agent 判断是否值得开饭，并要求把菜色和路由留在后台；它不会强制每次都开饭。

## 移除

从宿主 `settings.json` 中精确删除 `command` 指向 `eat-rice-nudge.cjs` 的那一个 hook。不要删除整个 `PostToolUse` 数组，因为其中可能还有其他工具。

若要清除计数状态，删除系统临时目录中的 `eat-rice-nudge/`，或删除你通过 `EAT_RICE_STATE_DIR` 明确配置的状态目录。先核对绝对路径，不要按模糊名称批量删除其他临时文件。
