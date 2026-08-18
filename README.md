# eat-rice 🍚

把 Agent 的“我去吃个饭”从纯表演变成真实劳动。

吃饭是一个小路由器：根据当前任务最大的缺口，选择检索、事实核查、复盘或规划；回来汇报增量，并继续主线。

## 仓库结构

```text
eat-rice/
├── SKILL.md                    # Skill 真源
├── hooks/eat-rice-nudge.cjs    # 可选：PostToolUse 自动提醒
└── references/HOOKS.md         # 可选 hook 的手动配置参考
```

仓库不提供安装脚本，也不会自动修改你的 IDE 配置。手动触发只需要 `SKILL.md`；不需要自动提醒时，不要配置 hook。

## 安装前先看风险

- Skill 会引导 Agent 做真实检索、核查、复盘或规划，可能消耗联网额度、token 和时间；每餐默认限制为检索不超过 5 次、深读不超过 3 篇。
- 可选 hook 是本地 Node.js 命令，会在每次 `PostToolUse` 后运行，并把计数状态写到 `hooks/state.json`。它不读取密钥，也不联网，但仍属于会执行的本地代码，请先自行审阅。
- `meal-log.md` 可能留下任务摘要。涉密任务只记菜色，不记内容；不想留痕时可明确要求跳过账本。
- 不同宿主的 Skill 目录和 hook 协议不同。安装 Skill 不等于自动 hook 已生效；不要把 Claude Code 的 hook 配置硬塞给 Codex、DSH 或其他不兼容宿主。
- `git pull` 会取得仓库的新版本。对稳定环境可固定到已审阅的 commit，再手动升级。

## 安装 Skill

把整个仓库放进宿主能发现的 Skill 目录。目录名保持为 `eat-rice`，并确保入口最终是：

```text
<skills-root>/eat-rice/SKILL.md
```

### 通用跨宿主位置

许多 Agent Skills 兼容宿主会扫描 `~/.agents/skills/`：

```bash
git clone https://github.com/Ghoscro/eat-rice.git ~/.agents/skills/eat-rice
```

```powershell
git clone https://github.com/Ghoscro/eat-rice.git "$env:USERPROFILE\.agents\skills\eat-rice"
```

如果你的宿主没有扫描这个目录，使用下表中的原生位置。

| 宿主 | 用户级位置 | 项目级位置 | 自动 hook |
|---|---|---|---|
| Claude Code | `~/.claude/skills/eat-rice/` | `<project>/.claude/skills/eat-rice/` | 可选，见 `references/HOOKS.md` |
| WorkBuddy | `~/.workbuddy/skills/eat-rice/` | 由当前客户端配置决定 | 兼容 Claude Code hooks 时可选 |
| Codex App / CLI | `~/.codex/skills/eat-rice/` 或 `~/.agents/skills/eat-rice/` | 由当前 Codex 版本的项目 Skill 规则决定 | 本仓库不提供 Codex 自动 hook；用手动触发 |
| DeepSeek Harness | `~/.dsh/skills/eat-rice/` 或 `~/.agents/skills/eat-rice/` | `<project>/.dsh/skills/eat-rice/` 或 `<project>/.agents/skills/eat-rice/` | 本仓库不是 DSH 插件；用手动触发 |
| Cursor | `~/.cursor/skills/eat-rice/` 或 `~/.agents/skills/eat-rice/` | `<project>/.cursor/skills/eat-rice/` 或 `<project>/.agents/skills/eat-rice/` | 不使用本仓库的 Claude Code hook 配置 |
| GitHub Copilot / VS Code Agent | `~/.copilot/skills/eat-rice/` 或 `~/.agents/skills/eat-rice/` | `<project>/.github/skills/eat-rice/` 或 `<project>/.agents/skills/eat-rice/` | 按 Copilot 自己的 hook 机制配置 |
| 其他 IDE Agent | 优先尝试 `~/.agents/skills/eat-rice/` | 优先尝试 `<project>/.agents/skills/eat-rice/` | 无兼容协议时只用手动触发 |

安装或更新后，按宿主要求重启会话，让它重新发现 Skill。

## 验证

在新会话中说：

```text
去吃饭吧，回来继续当前任务。
```

成功时，Agent 应按三幕执行：

1. 宣示这一餐路由到什么菜；
2. 完成一项对当前主线有增量的真实劳动；
3. 用“吃饱了🍚”汇报结果，并接回主线。

如果宿主看不到 Skill，先检查路径是否多套了一层目录，以及 `SKILL.md` 的文件名和 YAML frontmatter 是否完整。

## 可选自动提醒

自动提醒仅适用于支持 Claude Code 风格 `PostToolUse` hooks 的宿主。配置、风险、验证和移除方式见 [`references/HOOKS.md`](references/HOOKS.md)。

不确定是否兼容时，不配置 hook。手动说“去吃饭吧”已经能使用全部核心能力。

## 菜单

| 当前缺口 | 菜色 | 真实劳动 |
|---|---|---|
| 缺外部信息 | 🍜 麻辣烫 | 素材收集 |
| 有硬断言待验证 | 🥟 饺子 | 事实核查 |
| 刚完成一个阶段 | 🍳 蛋炒饭 | 复盘对齐 |
| 下一步不明朗 | 🍗 黄焖鸡米饭 | 规划排布 |
| 连续高强度、无单一缺口 | 🥡 沙县三件套 | 复盘 + 规划 |

## 更新与移除

更新：

```bash
git -C <skills-root>/eat-rice pull --ff-only
```

移除前，先删除宿主配置里指向 `eat-rice-nudge.cjs` 的 hook 条目；然后删除 `eat-rice` 目录。不要按模糊文件名批量删除其他 hooks。

## 参考

- [Agent Skills 开放规范：跨客户端目录约定](https://agentskills.io/client-implementation/adding-skills-support)
- [OpenAI Skills：Codex 安装方式与目录结构](https://github.com/openai/skills)
- [Anthropic Skills：Claude Code Skill / Plugin 示例](https://github.com/anthropics/skills)
- [GitHub Copilot Agent Skills](https://docs.github.com/en/copilot/how-tos/copilot-on-github/customize-copilot/customize-cloud-agent/add-skills)
- [DeepSeek Harness 本地 Skill provider](https://github.com/deepseek-ai/deepseek-harness/tree/main/packages/skill/skill-filesystem)

## License

MIT
