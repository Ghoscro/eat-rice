# eat-rice 🍚 — 让 Agent 的"我去吃个饭"变成真实劳动

> **饭 = 检索结果。吃饭话术 = 叙事外壳。token 花在搜索上，时间耗在搜索上——饭是真的吃了。**

## 这是什么

你的 AI agent 干活干到一半说：**"我去吃个饭🍚，回来接着干。"**

大部分 agent 的"吃饭"是纯表演——说完就愣着，或者干脆编一段"吃完了"。`eat-rice` 不一样：

```
agent：主线先放着，我去吃个饭🍚——顺路查一下这个库的最新文档，回来接着干。
（接下来的几分钟，agent 在真实地联网检索）
agent：吃饱了🍚。这次吃的是素材收集：
       - 查了：xxx 的最新版本、兼容性、迁移指南
       - 端回来的：v2.3 改了 API（来源：官方 changelog）…
       - 对主线的增量：咱们该用 X 方案而不是 Y
       - 下一口：把迁移代码补上
（然后立刻继续主线工作）
```

**"吃饭"的几分钟 = 真实检索的几分钟**。上网查资料本来就又慢又费 token——所以时间开销和 token 消耗完全自洽：agent 不是演给你看，是真去觅食了。回来端上的是真实的"饭"：给主线补的素材，或对刚产出内容的交叉验证。

## 核心特性

- 🍚 **三幕剧**：宣示吃饭 → 真实检索 → 汇报成果接回主线
- 🍱 **两种菜色**：素材收集（给下一阶段补料）/ 事实核查（对刚产出的硬断言逐条 ✅⚠️❌）
- ⚙️ **自动触发**：PostToolUse hook 计数器，连续 ≥8 轮工具调用没理你时，agent 自动"去吃饭"
- 🛡️ **反表演红线**：不许编搜索结果（端空盘子）、检索无增量就不吃（不为吃而吃）、饭量控制（查询≤5、深读≤3）
- 🔧 **零依赖搜索**：anysearch / WebSearch / WebFetch / 任何内置联网搜索都行
- 🖥️ **多客户端**：Claude Code / WorkBuddy / 任何 Claude Code 兼容客户端

## 快速开始

### 依赖

- [Node.js](https://nodejs.org) ≥ 16（hook 脚本用）
- 一个支持 hooks 的 Claude Code 系客户端（仅自动触发需要；纯手动触发可不装 hook）

### 一键安装

**macOS / Linux / Git Bash：**

```bash
git clone https://github.com/Ghoscro/eat-rice.git /tmp/eat-rice
bash /tmp/eat-rice/install.sh
```

**Windows PowerShell：**

```powershell
git clone https://github.com/Ghoscro/eat-rice.git $env:TEMP\eat-rice
& "$env:TEMP\eat-rice\install.ps1"
```

安装脚本会：
1. 把 skill 复制到你客户端的用户级 skills 目录（自动检测 Claude Code `~/.claude/skills` / WorkBuddy `~/.workbuddy/skills`，也可 `--target` 指定）
2. 向对应 `settings.json` 安全合并 `hooks.PostToolUse` 配置（不会动你已有的 hook）

### 手动安装（如果你更喜欢自己动手）

1. 复制本仓库到你的 skills 目录：

```bash
# Claude Code
git clone https://github.com/Ghoscro/eat-rice.git ~/.claude/skills/eat-rice
# WorkBuddy
git clone https://github.com/Ghoscro/eat-rice.git ~/.workbuddy/skills/eat-rice
```

2. 在你客户端的 `settings.json`（Claude Code：`~/.claude/settings.json`；WorkBuddy：`~/.workbuddy/settings.json`）中加入：

```json
{
  "hooks": {
    "PostToolUse": [
      {
        "hooks": [
          {
            "type": "command",
            "command": "node <你的skills目录>/eat-rice/hooks/eat-rice-nudge.cjs",
            "timeout": 15
          }
        ]
      }
    ]
  }
}
```

> 只想要手动触发（说"去吃饭吧"才吃）？跳过第 2 步即可，skill 本身就是完整可用的。

## 验证安装

```bash
# hook 冒烟测试：连跑 8 次应输出一段 JSON（第 8 次触发）
for i in 1 2 3 4 5 6 7 8; do
  echo '{"session_id":"smoke-test"}' | node ~/.claude/skills/eat-rice/hooks/eat-rice-nudge.cjs
done
rm ~/.claude/skills/eat-rice/hooks/state.json
```

然后开一个新会话，随便让 agent 干个连续使用工具 8 轮以上的活——你会看到它自己说"我去吃个饭🍚"，然后真的去查资料，回来汇报"吃饱了🍚"并继续干活。

## 配置

hook 支持两个环境变量（在 `settings.json` 的 `env` 字段或系统环境变量里设置）：

| 变量 | 默认 | 说明 |
|---|---|---|
| `EAT_RICE_THRESHOLD` | `8` | 连续多少轮工具调用触发"吃饭" |
| `EAT_RICE_COOLDOWN_MIN` | `10` | 两次"吃饭"提醒的最小间隔（分钟） |

想更勤快地吃：`EAT_RICE_THRESHOLD=5`。想少吃点：`EAT_RICE_COOLDOWN_MIN=30`。

## 工作原理

```
你 ←—— 对话 ——→ Agent
                   │
                   ├─ 连续 N 轮工具调用（PostToolUse hook 计数）
                   │
                   ▼ 阈值命中
              【第一幕·宣示】"我去吃个饭🍚"
                   │
              【第二幕·真实的饭】联网检索
                   ├─ 菜色A：素材收集（≤5 查询 + ≤3 深读）
                   └─ 菜色B：事实核查（硬断言逐条 ✅⚠️❌）
                   │
              【第三幕·回归】"吃饱了🍚" + 汇报 + 立刻继续主线
```

hook 是 **nudge 不是强制**：注入的提醒保留了判断余地——若当前检索对主线无明确增量、或刚吃过，agent 会跳过本次（反表演原则）。毕竟每 8 轮必吃一次，就成另一种表演了。

## FAQ

**Q：没有 anysearch 能用吗？**
能。第二幕只要求"联网检索"，WebSearch / WebFetch / 任何内置搜索工具都可以，skill 会自动用当前环境可用的。

**Q：不想自动触发，只想手动玩？**
不装 hook 就行。说"去吃饭吧"/"吃个饭再继续"/"干饭去"，agent 也会进三幕剧。

**Q：agent 会不会借吃饭摸鱼、编搜索结果？**
红线第一条就是"不许端空盘子编饭"：查不到必须如实说"这家店没这个菜"，虚构搜索结果 = 端空盘子。饭量也有硬上限（查询≤5、深读≤3），一顿撑不死上下文。

**Q：卸载？**

```bash
bash ~/.claude/skills/eat-rice/uninstall.sh   # 或 uninstall.ps1（Windows）
```

会精确移除 hook 配置（不动你其他 hook），并询问是否删除 skill 目录。

## License

MIT
