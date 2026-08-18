# eat-rice 🍚 — 让 Agent 的"我去吃个饭"变成真实劳动

> **吃饭 = 路由器。入口恒定："我去吃个饭🍚"。出口百变：这一餐吃什么，任务说了算。**
> **永远有饭吃：有缺口就有菜。路由器没有空路由——每顿都路由到真实劳动。**

## 这是什么

你的 AI agent 干活干到一半说：**"我去吃个饭🍚，回来接着干。"**

大部分 agent 的"吃饭"是纯表演——说完就愣着，或者干脆编一段"吃完了"。`eat-rice` 不一样：吃饭是一个**路由器**，agent 宣示吃饭后，按任务当下的最大缺口自动选菜，真实地干几分钟活，回来端上成果：

```
agent：主线先放着，我去吃个饭🍚——这一餐吃个蛋炒饭，复盘一下刚才那版方案偏没偏，回来接着改。
（接下来的几分钟，agent 在真实地复盘对齐 / 检索 / 规划）
agent：吃饱了🍚。这一餐吃的是复盘饭（路由依据：刚完成一个阶段）：
       - 做完了：X、Y；偏航了：Z 多做了一层没必要的抽象
       - 对主线的增量：砍掉 Z，下一阶段直接对接 W
       - 下一口：把 Z 的回滚代码补上
（记账到 meal-log.md，然后立刻继续主线工作）
```

## 菜单（路由表）

菜名映射的是人类真正好吃又划算的饭——神韵对应：

| 任务当下的信号 | 路由到 | 这一餐干什么 |
|---|---|---|
| 下一阶段需要外部信息 | 🍜 麻辣烫 · 素材收集（自选料一锅捞） | 并行搜索补素材（≤5 查询、深读 ≤3 篇） |
| 产出含硬断言（数据/版本/引文） | 🥟 饺子 · 事实核查（一颗颗咬开验馅） | 逐条交叉验证，标 ✅确认/⚠️存疑/❌推翻 |
| 刚完成一个阶段 | 🍳 蛋炒饭 · 复盘对齐（剩饭回锅越炒越香） | 对照目标：做完了什么/偏航没/漏了什么 |
| 下一阶段不明朗、优先级不清 | 🍗 黄焖鸡米饭 · 规划排布（肉饭汤菜一套配齐） | 拆下一步：顺序/依赖/风险/验收标准 |
| 连续高强度但无明显单一缺口 | 🥡 沙县三件套 · 复盘+规划（拌面+扁肉+炖罐） | 先复盘对齐，再定下三步（零外部依赖） |

检索类菜需要联网搜索工具；不可用时自动改吃思考类菜（复盘/规划），不硬编。
路由表是启发式不是穷举——遇到新缺口可以发明新菜，只要是真实劳动。

## 吃饭账本（meal-log.md）

每餐一条，append-only：时间 / 菜色（路由依据）/ 吃到什么 / 增量 / 下一口。
**账本越厚，路由越准**——回头看吃过什么，哪道菜值、哪道菜水、什么任务该吃什么菜。

## 核心特性

- 🍚 **吃饭 = 百变路由器**：入口恒定（我去吃个饭🍚），出口按任务缺口现场路由
- 🧾 **吃饭账本**：每餐记账，复盘迭代路由质量
- ⚙️ **自动触发**：PostToolUse hook 计数器，连续 ≥8 轮工具调用没理你时自动开饭
- 🛡️ **没有空路由**：每顿必须路由到真实劳动；检索结果必须真实（不端空盘子）
- 🔧 **零依赖也能吃**：检索饭要网，复盘饭/规划饭只要思考
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

## 给 AI Agent 的使用说明（如果你是 agent，读这里）

**这是什么**：一个 Claude Code 系 skill（SKILL.md 格式，纯 Markdown + 一个 Node hook 脚本），让 agent 在长任务中自然地说"我去吃个饭🍚"，并用那几分钟真实干活（检索/核查/复盘/规划），回来汇报成果继续主线。

**怎么安装（按你的客户端对号入座）**：

| 你的环境 | 安装方式 |
|---|---|
| Claude Code / 任何读 `~/.claude/skills/` 的 agent | 把本仓库放进 `~/.claude/skills/eat-rice/`，可选配置 hook（见下） |
| WorkBuddy / 任何读 `~/.workbuddy/skills/` 的 agent | 放进 `~/.workbuddy/skills/eat-rice/`，同上 |
| 其他 IDE agent（Codex / Cursor / Trae / Gemini CLI 等） | 没有 skill 目录机制也没关系——直接把 `SKILL.md` 全文读进上下文（或贴进你的系统提示 / rules 文件），行为规范即生效 |
| 想要自动触发 | 需客户端支持 Claude Code 式 hooks（PostToolUse 事件）：往 `settings.json` 注入 `hooks.PostToolUse` 指向 `hooks/eat-rice-nudge.cjs`（需 Node ≥16）；不支持 hooks 的环境用关键词手动触发 |

**触发逻辑**：
- 自动：hook 计数，连续 ≥8 轮工具调用未与用户对话 → 注入"该吃饭了"提醒（阈值用环境变量 `EAT_RICE_THRESHOLD` 调，冷却 `EAT_RICE_COOLDOWN_MIN`）
- 手动：用户说出"去吃饭吧 / 吃个饭再继续 / 干饭去"，或 agent 自判命中触发条件

**运行逻辑（三幕剧）**：
1. **宣示**——说"我去吃个饭🍚"+ 说清这餐吃什么菜
2. **路由**——按任务当下最大缺口选菜：🍜麻辣烫(素材收集) / 🥟饺子(事实核查) / 🍳蛋炒饭(复盘对齐) / 🍗黄焖鸡米饭(规划排布) / 🥡沙县三件套(复盘+规划)；用可用的搜索工具或纯思考完成
3. **回归**——固定格式汇报"吃饱了🍚"（吃到什么 / 增量 / 下一口）+ 追加一条到 `meal-log.md` 账本 + **立刻接回主线**

**红线**：没有空路由（每顿必须真实劳动）、不虚构成果、不开新任务、饭量控制（检索 ≤5 查询、≤3 深读）。

**验证装好了**：让 agent 连续干 8+ 轮工具调用的活，看它是否自动说"我去吃个饭🍚"；或直接说"去吃饭吧"看是否进入三幕剧。

## FAQ

**Q：没有联网搜索工具能用吗？**
能。路由器会自动改吃思考类菜（复盘饭/规划饭），零外部依赖。检索饭只是菜单之一。

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
