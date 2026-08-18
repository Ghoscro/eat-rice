# 可选 PostToolUse Hook 配置

本页只是一份配置参考，不会自动修改任何文件。

## 风险边界

- 仅用于明确支持 Claude Code 风格 `hooks.PostToolUse` 的宿主。
- hook 会在每次工具调用后启动一次 Node.js，并在同目录写入 `state.json` 计数。
- 它不联网、不读取项目文件或环境密钥；输入只解析 `session_id`。
- 并发工具调用可能让计数少记或晚触发；它只是提醒器，不是精确审计器。
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

默认阈值为累计 8 次 `PostToolUse`，两次提醒至少间隔 10 分钟。需要改动时直接审阅并修改 hook 顶部的两个常量，避免为这个小工具再引入一层配置系统。

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

默认配置下，前七次静默，第八次输出一个 `hookSpecificOutput` JSON。测试后可以删除 `hooks/state.json`。

## 移除

从宿主 `settings.json` 中精确删除 `command` 指向 `eat-rice-nudge.cjs` 的那一个 hook。不要删除整个 `PostToolUse` 数组，因为其中可能还有其他工具。

最后删除本 Skill 的 `hooks/state.json` 即可清除计数状态。
