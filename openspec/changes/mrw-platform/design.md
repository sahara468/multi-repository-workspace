## Context

当前企业微服务架构下，一个业务能力（如"订单履约"）通常涉及 5-10 个独立代码仓库。开发人员需要手动 clone、手动同步分支、在多个项目间频繁切换。更关键的是，跨服务的规格（Spec）、设计（Design）、变更（Change）缺乏统一管理，导致文档与代码漂移、AI 缺乏 Workspace 级上下文。

现有工具（Nx/Bazel 解决构建编排、VS Code Multi-Root 解决编辑器视图、OpenSpec 解决单仓库 SDD）均未覆盖"多仓库 + Spec + AI Context"的统一管理需求。

MRW 定位为纯 CLI 工具集（无后台进程），使用 TypeScript/Node.js 开发，开源项目形式推广。核心操作边界：MRW 负责 Workspace 层管理，单仓库代码开发通过 `cd .mrw/state/repos/<service>` 切换后使用 Claude Code。

## Goals / Non-Goals

**Goals:**

- 提供统一的 Workspace 定义（workspace.yaml），将多个微服务仓库组织为一个业务工程空间
- 提供多仓库管理命令（init / sync / status / branch / checkout），降低多仓库操作的认知成本
- 提供 Workspace 级 Spec 管理，统一管理跨服务交互规格、入口服务能力描述、架构约束
- 基于 OpenSpec 扩展跨服务变更管理，支持跨服务提案、设计、任务分解
- 通过 Git 实现团队协作（workspace.yaml + specs/ + .mrw/changes/ 进 Git）
- 仓库自动 clone 到 `.mrw/state/repos/`，Workspace 自包含

**Non-Goals:**

- 不替代 Claude Code 在单仓库中的代码开发角色
- 不做 AI 上下文自动注入（MVP 阶段手动复制粘贴）
- 不做后台服务 / 索引服务 / 持久化守护进程
- 不改变现有服务边界，仅做统一视图
- 不做 Spec 变更审核流程内建（仅做流程约定）
- 不做构建编排（非 Bazel/Nx 竞品）
- 不做 Spec 内容模板强制定义（后续逐步完善）
- 不做 Change 生命周期状态机（后续单独设计）

## Decisions

### D1: 纯 CLI 工具集，无后台进程

**选择**：纯 CLI，每次命令实时读取文件系统状态

**替代方案**：后台服务 + CLI 前端（LSP 模式），有持久索引和状态管理

**理由**：MVP 阶段降低架构复杂度，CLI 足以满足核心需求。多仓库操作（git clone/pull/branch）本身不需要持久索引。后续如需要（如跨服务依赖分析缓存），可演进为有后台模式。

### D2: 仓库自动 clone 到 `.mrw/state/repos/`

**选择**：MRW 自动 clone 仓库到 Workspace 内的 `.mrw/state/repos/<service-name>/`

**替代方案**：仓库保持在用户原有位置，workspace.yaml 引用本地路径

**理由**：Workspace 自包含，多人协作时路径一致，MRW 可以统一管理分支状态。用户不需要手动管理仓库位置。

### D3: 两层操作模式，无 enter/exit 命令

**选择**：MRW 负责 Workspace 层操作，用户 `cd .mrw/state/repos/<service>` 切换单仓库开发

**替代方案**：MRW 内建 `mrw enter/exit` 命令管理上下文切换

**理由**：`cd` 是最自然的切换方式，不需要额外抽象。MRW 不替代单仓库内的开发工具链。

### D4: Topology 用文字描述，不在 yaml 中声明

**选择**：服务拓扑在 `specs/topology.md` 中以 Markdown 文字描述

**替代方案**：在 workspace.yaml 中用结构化 YAML 声明拓扑关系（calls/events/dependencies）

**理由**：MVP 阶段拓扑描述更灵活，避免 yaml 结构过于复杂。自动发现拓扑属于 V2 能力，手动维护 yaml 拓扑成本高且容易过时。

### D5: Spec 格式采用 Markdown + YAML（类 OpenSpec 轻量风格）

**选择**：Spec 文件使用 Markdown 格式，可内嵌 YAML frontmatter 存储元数据

**替代方案**：代码即 Spec（可执行 Schema）、结构化 DSL + Markdown 混合

**理由**：与 OpenSpec 风格一致，开发者友好，Git 原生，AI 可直接消费。Spec 内容模板暂不强制定义，后续逐步完善。

### D6: workspace.yaml 进 Git，`.mrw/state/` 不进 Git

**选择**：workspace.yaml 和 specs/ 和 .mrw/changes/ 进 Git 版本管理，`.mrw/state/`（repos/、index/、branches.yaml 等）加入 .gitignore

**理由**：团队通过 Git 共享 Workspace 定义和 Spec，但仓库 clone 数据和运行时状态不应进 Git。

### D7: 基于 OpenSpec 扩展跨服务变更，非替代

**选择**：MRW 的跨服务变更管理（`.mrw/changes/`）基于 OpenSpec 的 schema 扩展，保留 OpenSpec 的 proposal/design/specs/tasks 结构，增加跨服务维度（按 Service 分解 tasks、跨服务影响分析）

**替代方案**：完全自建变更管理系统；或直接使用 OpenSpec 不做扩展

**理由**：OpenSpec 已有成熟的 SDD 流程和结构，MRW 在其上扩展跨服务维度是最合理的方式，避免重复造轮子。

### D8: TypeScript / Node.js 开发

**选择**：MRW CLI 使用 TypeScript + Node.js 开发

**替代方案**：Go（单二进制分发）、Python

**理由**：与 OpenSpec 技术栈一致，便于集成和扩展；Node.js 生态丰富（yargs/commander 等 CLI 框架、simple-git 等 Git 操作库）。

### D9: JSON 缓存用于依赖分析数据

**选择**：使用 JSON 文件缓存拓扑索引、依赖关系等数据，存放在 `.mrw/state/index/`

**替代方案**：SQLite 持久化存储；或每次实时计算

**理由**：JSON 缓存简单够用，无需数据库依赖。MVP 阶段依赖分析需求有限，JSON 足以满足。

### D10: 服务注册从 YAML 文件批量导入，非交互式循环添加

**选择**：`mrw init` 不再交互式循环逐个添加 service，而是从用户提供的 `services.yaml`（或通过 `--services-file` 指定路径）批量导入。初始化后，通过 `mrw service add/remove/update` 子命令管理服务注册的增删改。

**替代方案**：init 时 inquirer 循环交互式添加（原方案）

**理由**：
- 企业场景下服务数量通常 5-20 个，循环交互效率极低，且无法复用已有服务清单
- YAML 文件可团队共享、版本管理，符合"配置即代码"理念
- 增删改场景需要独立命令支持，而非每次重新 init
- `services.yaml` 格式与 `workspace.yaml` 中的 `services` 段保持一致，降低学习成本

**services.yaml 格式**：
```yaml
services:
  order-service:
    repo: https://github.com/org/order-service.git
    branch: main
    language: java
    description: 订单核心服务
  inventory-service:
    repo: https://github.com/org/inventory-service.git
    branch: main
    language: go
    description: 库存管理服务
```

**服务管理命令**：
- `mrw service add <name> --repo <url> --branch <name>` — 添加单个服务
- `mrw service remove <name>` — 移除服务注册（不删除已 clone 的仓库，提示用户确认）
- `mrw service update <name> [--repo <url>] [--branch <name>] [--language <lang>] [--description <desc>]` — 更新服务属性
- `mrw service import [--file <path>]` — 从 YAML 文件批量导入/更新服务（默认 `services.yaml`）

## Risks / Trade-offs

- **[企业采纳门槛]** → MVP 以开源项目形式发布，降低试用成本；workspace.yaml 定义简洁，初始化成本低
- **[Spec 维护成本]** → Spec 模板暂不强制，允许团队按自身节奏演进；审核流程不做工具强制
- **[与 OpenSpec 耦合]** → MRW 跨服务变更基于 OpenSpec 扩展，若 OpenSpec schema 变更可能需要适配；通过保持扩展点最小化来降低耦合
- **[无后台进程的性能限制]** → 多仓库 git 操作在服务数量增长时可能变慢；可通过 JSON 缓存部分缓解，V2 考虑引入后台服务
- **[AI 上下文传递靠手动]** → MVP 阶段用户需手动复制 Workspace 级上下文给 AI；这是有意简化，V2 再做自动化
- **[多人协作的冲突风险]** → workspace.yaml 和 Spec 通过 Git 协同，但多人同时修改同一文件可能产生冲突；依赖 Git 原生合并能力
