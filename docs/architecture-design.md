# MRW 架构设计文档（Architecture Design）

> 版本：1.0
> 最后更新：2026-04-28
> 状态：Draft

---

# 一、架构总览

## 1.1 系统形态

MRW 是一个**纯 CLI 工具集**，无后台进程，无守护服务。每次命令执行时实时读取文件系统状态。

**两种工作模式：**

| 模式 | 初始化方式 | 特点 |
|------|-----------|------|
| **普通模式** | `mrw init` | 交互式初始化，通过 services.yaml 导入服务，支持 service add/remove/update/import |
| **设计驱动模式** | `mrw init --from-arch <repo-url>` | 从服务架构设计仓库初始化，设计仓库是服务信息的设计源，service add/remove 被禁止，只能通过 service import 更新 |

**设计驱动模式的工作区目录结构：**

```
.mrw/                         # MRW 内部状态（gitignored）
xxx-service-arch/             # 架构设计仓库（克隆到工作区根目录）
  services.yaml               # 服务和代码仓信息
  specs/                      # Workspace 级规格
    capabilities/             # 服务关键能力规格
    entries/                  # 服务操作入口规格
  arch/                       # 架构设计文档
repos/                        # 克隆的服务代码仓
  service1-xxx/
  service2-xxx/
workspace.yaml                # 工作区配置
```

**普通模式的目录结构：**

```
.mrw/                         # MRW 内部状态（gitignored）
repos/                        # 克隆的服务代码仓
  service1-xxx/
workspace.yaml                # 工作区配置
```

```
┌─────────────────────────────────────────────────────────────┐
│                       用户终端                               │
│                                                             │
│   mrw init     mrw sync    mrw status    mrw spec ...      │
│       │            │           │             │              │
│       ▼            ▼           ▼             ▼              │
│  ┌──────────────────────────────────────────────────────┐  │
│  │              MRW CLI (Node.js)                       │  │
│  │                                                      │  │
│  │   ┌────────────┐  ┌────────────┐  ┌──────────────┐  │  │
│  │   │ Workspace  │  │ Git        │  │ Spec/Change  │  │  │
│  │   │ Module     │  │ Operations │  │ Module       │  │  │
│  │   └────────────┘  └────────────┘  └──────────────┘  │  │
│  │         │               │                │           │  │
│  │         ▼               ▼                ▼           │  │
│  │   ┌──────────────────────────────────────────────┐  │  │
│  │   │            File System Layer                  │  │  │
│  │   │                                              │  │  │
│  │   │  workspace.yaml    specs/    .mrw/           │  │  │
│  │   └──────────────────────────────────────────────┘  │  │
│  └──────────────────────────────────────────────────────┘  │
│                                                             │
│   ┌──────────────────────────────────────────────────────┐ │
│   │           repos/                                    │ │
│   │                                                     │ │
│   │   service-a/   service-b/   service-c/  ...         │ │
│   │   (git repos, 用户 cd 进去后使用 Claude Code 开发)   │ │
│   └──────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────┘
```

## 1.2 架构原则

| 原则 | 说明 |
|------|------|
| **无状态 CLI** | 每次命令独立执行，不依赖后台进程或持久连接 |
| **文件系统即数据库** | workspace.yaml 是配置源，JSON 文件是缓存，无需数据库 |
| **Git 原生协作** | Workspace 定义、Spec、Change 通过 Git 协同，不另建同步机制 |
| **两层操作边界** | MRW 管 Workspace 层，单仓库开发交给 Claude Code |
| **OpenSpec 扩展而非替代** | 跨服务变更管理基于 OpenSpec schema 扩展 |

---

# 二、模块划分

```
src/
├── cli/                        # CLI 命令定义与注册
│   ├── index.ts                # 主入口，commander 注册
│   ├── init.ts                 # mrw init 命令
│   ├── sync.ts                 # mrw sync 命令
│   ├── status.ts               # mrw status 命令
│   ├── branch.ts               # mrw branch 命令
│   ├── checkout.ts             # mrw checkout 命令
│   ├── spec.ts                 # mrw spec 子命令
│   └── change.ts               # mrw change 子命令
│
├── core/                       # 核心业务逻辑
│   ├── workspace/              # Workspace 管理逻辑
│   │   ├── config.ts           # workspace.yaml 读写与校验
│   │   ├── types.ts            # Workspace/Service 类型定义
│   │   ├── initializer.ts      # Workspace 初始化逻辑
│   │   └── status.ts           # Workspace 状态聚合
│   │
│   ├── git/                    # Git 操作封装
│   │   ├── clone.ts            # 仓库 clone 管理
│   │   ├── sync.ts             # 仓库 pull/fetch
│   │   ├── branch.ts           # 分支创建/切换
│   │   └── status.ts           # 仓库状态检测（未提交变更等）
│   │
│   ├── spec/                   # Spec 管理逻辑
│   │   ├── reader.ts           # Spec 文件读取与 frontmatter 解析
│   │   ├── writer.ts           # Spec 文件创建与模板生成
│   │   └── indexer.ts          # Spec 与服务的关联索引
│   │
│   └── change/                 # 跨服务变更管理逻辑
│       ├── proposal.ts         # 变更提案创建与校验
│       ├── design.ts           # 设计文档模板生成
│       └── tasks.ts            # 任务分解模板生成
│
├── infra/                      # 基础设施层
│   ├── fs.ts                   # 文件系统操作工具
│   ├── cache.ts                # JSON 缓存读写
│   ├── template.ts             # 模板引擎（Markdown 模板填充）
│   └── ui.ts                   # 终端 UI 工具（chalk/ora/inquirer）
│
└── templates/                  # 内置模板文件
    ├── workspace.yaml.hbs      # workspace.yaml 模板
    ├── spec-capability.md.hbs  # Capability Spec 模板
    ├── spec-entry.md.hbs       # Entry Point Spec 模板
    ├── spec-constraint.md.hbs  # Constraint Spec 模板
    ├── change-proposal.md.hbs  # Change Proposal 模板
    ├── change-design.md.hbs    # Change Design 模板
    └── change-tasks.md.hbs     # Change Tasks 模板
```

## 2.1 模块依赖关系

```
┌──────────┐     ┌──────────┐     ┌──────────┐
│   cli/   │────▶│  core/   │────▶│  infra/  │
│  命令层  │     │  业务层  │     │ 基础设施 │
└──────────┘     └──────────┘     └──────────┘
     │                │
     │           ┌────┴────┐
     │           ▼         ▼
     │    ┌──────────┐ ┌──────────┐
     │    │  core/   │ │  core/   │
     │    │workspace │ │  spec/   │
     │    └──────────┘ └──────────┘
     │           │                │
     │           ▼                ▼
     │    ┌──────────┐     ┌──────────┐
     │    │  core/   │     │  core/   │
     │    │   git/   │     │ change/  │
     │    └──────────┘     └──────────┘
     │           │                │
     │           │    ┌───────────┘
     │           │    │  change 依赖 spec + workspace
     │           ▼    ▼
     │    ┌──────────────┐
     │    │   infra/     │
     │    │ fs/cache/ui  │
     │    └──────────────┘
     │
     └─── cli 只依赖 core，不直接依赖 infra
```

**依赖规则**：
- `cli/` → `core/`（命令层调用业务层）
- `core/` → `infra/`（业务层使用基础设施）
- `core/` 内部模块可互相引用（git/ 被 workspace/ 和 branch/ 使用）
- `cli/` 不直接引用 `infra/`

---

# 三、核心数据模型

## 3.1 TypeScript 类型定义

```typescript
// === Workspace 配置 ===

interface WorkspaceConfig {
  version: string;
  workspace: WorkspaceInfo;
  services: Record<string, ServiceConfig>;
  arch?: ArchConfig;     // 设计驱动模式时存在
}

interface WorkspaceInfo {
  name: string;
  description?: string;
  domain?: string;
}

interface ArchConfig {
  repo: string;          // 架构设计仓库 URL
  branch: string;        // 追踪分支
}

interface ServiceConfig {
  repo: string;          // Git 仓库 URL
  branch: string;        // 默认追踪分支
  language?: string;     // 主要开发语言
  description?: string;  // 服务描述
  path?: string;         // 单仓内子目录
}

// === 运行时状态 ===

interface WorkspaceState {
  name: string;
  services: Record<string, ServiceState>;
}

interface ServiceState {
  cloned: boolean;
  currentBranch: string;
  defaultBranch: string;
  hasUncommittedChanges: boolean;
  lastSyncedAt?: string;  // ISO 8601
  syncStatus: 'synced' | 'behind' | 'ahead' | 'diverged' | 'error' | 'not-cloned';
}

// === Spec ===

interface SpecFile {
  name: string;
  type: 'capability' | 'entry' | 'constraint';
  path: string;
  involves?: string[];   // 关联的服务名称列表
}

interface SpecFrontmatter {
  name: string;
  involves?: string[];
  [key: string]: unknown;
}

// === Change ===

interface ChangeInfo {
  name: string;
  path: string;
  hasProposal: boolean;
  hasDesign: boolean;
  hasTasks: boolean;
  affectedServices: string[];
}
```

## 3.2 数据流向

```
workspace.yaml ───读取──▶ WorkspaceConfig ───使用──▶ 所有命令
                                                     │
                                                     ▼
repos/ ──git操作──▶ ServiceState ──聚合──▶ status/branch/checkout
                                                     │
                                                     ▼
<arch-repo>/ ──git操作──▶ ArchState ──聚合──▶ status/branch/checkout (设计驱动模式)
                                                     │
                                                     ▼
specs/ ──扫描+解析──▶ SpecFile[] ──使用──▶ spec list/show
                                                     │
                                                     ▼
.mrw/changes/ ──扫描──▶ ChangeInfo[] ──使用──▶ change list
                                                     │
                                                     ▼
.mrw/state/index/ ──读写──▶ JSON Cache ──使用──▶ 依赖分析(V2)
```

---

# 四、关键技术决策

## 4.1 CLI 框架选型：Commander.js

| 选项 | 优势 | 劣势 |
|------|------|------|
| **Commander.js** | 轻量、TypeScript 友好、子命令支持好 | 需自行处理交互提示 |
| Yargs | 功能丰富、自动生成帮助 | 配置冗长、类型支持较弱 |
| Cliffy | Deno 原生、类型强 | Node.js 生态兼容性 |

**选择 Commander.js**：轻量够用，子命令结构与 MRW 的命令层级（`mrw spec list`、`mrw change propose`）天然匹配。

## 4.2 Git 操作库：simple-git

| 选项 | 优势 | 劣势 |
|------|------|------|
| **simple-git** | Promise/await 友好、API 丰富、轻量 | 偶尔复杂操作需 fallback 到 shell |
| isomorphic-git | 纯 JS 实现、无 git 二进制依赖 | 性能差、部分功能不支持 |
| nodegit | libgit2 绑定、性能好 | 原生编译复杂、安装易失败 |

**选择 simple-git**：需要本地 git 二进制（开发机器必然有），API 覆盖 clone/pull/branch/checkout/status 等所有需求。

## 4.3 YAML 解析：js-yaml

标准选择，TypeScript 类型通过手动定义接口保障，不依赖运行时 schema 校验。

## 4.4 交互提示：inquirer / @inquirer/prompts

用于 `mrw init` 的交互式引导。选择 `@inquirer/prompts`（inquirer v9+ 的模块化版本），按需引入更轻量。

## 4.5 模板引擎：Handlebars

用于生成 Spec 文件和 Change 文件的 Markdown 模板。轻量、逻辑少、适合静态内容生成。

## 4.6 终端 UI：chalk + ora

- **chalk**：终端彩色输出
- **ora**：异步操作时的 spinner 提示（sync/clone 等耗时操作）

---

# 五、命令执行流程

## 5.1 mrw init 流程

### 普通模式

```
用户执行 mrw init
       │
       ▼
  检测当前目录是否已有 workspace.yaml
       │
       ├── 已有 → 提示"已初始化"，退出
       │
       └── 没有 → 继续
              │
              ▼
       交互提示：workspace name
              │
              ▼
       交互提示：description
              │
              ▼
       交互提示：domain
              │
              ▼
       交互提示：添加 service（循环）
       │  ├── name
       │  ├── repo URL
       │  ├── branch
       │  ├── language (optional)
       │  ├── description (optional)
       │  └── 是否继续添加？
              │
              ▼
       生成目录结构：
       ├── workspace.yaml
       ├── repos/
       └── .gitignore（含 .mrw/）
              │
              ▼
       输出成功信息
```

### 设计驱动模式

```
用户执行 mrw init --from-arch <repo-url> [--arch-branch <branch>]
       │
       ▼
  检测当前目录是否已有 workspace.yaml
       │
       ├── 已有 → 提示"已初始化"，退出
       │
       └── 没有 → 继续
              │
              ▼
  git clone 架构设计仓库到 <cwd>/<repo-name>/
              │
              ▼
  校验架构仓库：
  ├── services.yaml 存在？ → 否 → 删除克隆目录，报错退出
  └── specs/arch/ 存在？ → 否 → 警告但继续
              │
              ▼
  导入 services.yaml 中的服务到 workspace config
              │
              ▼
  生成目录结构：
  ├── workspace.yaml（含 arch 字段）
  ├── <arch-repo>/          # 架构设计仓库
  │   ├── services.yaml
  │   ├── specs/
  │   └── arch/
  ├── repos/                # 空，等待 mrw sync 克隆
  └── .gitignore（含 .mrw/）
              │
              ▼
  提示运行 mrw sync 克隆服务代码仓
```

## 5.2 mrw sync 流程

```
用户执行 mrw sync [service-name]
       │
       ▼
  读取 workspace.yaml → WorkspaceConfig
       │
       ▼
  确定目标服务列表
       ├── 有 service-name 参数 → 只处理该服务
       └── 无参数 → 处理所有服务
              │
              ▼
  （设计驱动模式）先处理架构设计仓库：
       │
       ├── <arch-repo>/ 不存在 → git clone
       │     ├── 成功 → ✅
       │     └── 失败 → ❌ 记录错误
       │
       └── <arch-repo>/ 已存在 → git pull
             ├── 有未提交变更 → ⚠️ 跳过，警告
             ├── 成功 → ✅
             └── 失败 → ❌ 记录错误
              │
              ▼
  对每个服务仓库执行：
       │
       ├── repos/<name>/ 不存在 → git clone
       │     ├── 成功 → ✅
       │     └── 失败 → ❌ 记录错误
       │
       └── repos/<name>/ 已存在 → git pull
             ├── 有未提交变更 → ⚠️ 跳过，警告
             ├── 成功 → ✅
             └── 失败 → ❌ 记录错误
              │
              ▼
  汇总输出结果表格
```

## 5.3 mrw change propose 流程

```
用户执行 mrw change propose refund-capability
       │
       ▼
  检测 .mrw/changes/refund-capability/ 是否已存在
       │
       ├── 已有 → 提示"变更已存在"，退出
       │
       └── 没有 → 继续
              │
              ▼
  创建目录：.mrw/changes/refund-capability/
              │
              ▼
  生成 proposal.md（模板填充）：
  ├── 概述段
  ├── 涉及服务表（从 workspace.yaml 读取服务列表，供用户填写影响类型和优先级）
  ├── 跨服务影响章节
  ├── 依赖拓扑章节
  └── 拆分策略章节
              │
              ▼
  输出文件路径，提示用户编辑完善
```

---

# 六、缓存与索引设计

## 6.1 JSON 缓存结构

```
.mrw/state/index/
├── topology.json       # 服务拓扑索引
├── dependencies.json   # 依赖关系索引
└── last-sync.json      # 最后同步时间记录
```

### topology.json

```json
{
  "version": 1,
  "updatedAt": "2026-04-28T10:00:00Z",
  "services": {
    "order-service": {
      "calls": ["payment-service", "inventory-service"],
      "publishes": ["order.created", "order.cancelled"],
      "subscribes": ["payment.completed"]
    }
  }
}
```

### dependencies.json

```json
{
  "version": 1,
  "updatedAt": "2026-04-28T10:00:00Z",
  "edges": [
    {
      "from": "order-service",
      "to": "payment-service",
      "type": "sync-api"
    }
  ]
}
```

## 6.2 缓存策略

- 缓存为可选优化，MRW 核心功能不依赖缓存
- 缓存文件可在任何时候安全删除，下次命令时重新生成
- MVP 阶段缓存主要用于 `mrw status` 的性能优化
- 缓存更新时机：`mrw sync` 执行后

---

# 七、错误处理策略

## 7.1 错误分类

| 错误类型 | 示例 | 处理方式 |
|----------|------|----------|
| **配置错误** | workspace.yaml 格式错误、缺少必填字段 | 立即报错，提示修正位置 |
| **Git 操作错误** | clone 失败、pull 冲突 | 记录错误，跳过该服务，汇总展示 |
| **文件系统错误** | 目录不存在、权限不足 | 立即报错，提示操作建议 |
| **用户输入错误** | 服务名不存在、变更名已存在 | 友好提示，不中断流程 |

## 7.2 多仓库操作的容错

跨仓库操作（sync/branch/checkout）对每个服务独立执行，单个服务失败不影响其他服务。最终汇总展示成功/失败/跳过的服务列表。

```
$ mrw sync
✅ order-service     — Already up to date
✅ payment-service   — Pulled 3 new commits
⚠️  inventory-service — Skipped (uncommitted changes)
❌ notification-service — Failed: authentication error

3 succeeded, 1 skipped, 1 failed
```

---

# 八、构建与分发

## 8.1 项目配置

```
package.json
├── name: "mrw"
├── bin: { "mrw": "./dist/index.js" }
├── type: "module"
├── engines: { "node": ">=18.0.0" }
└── scripts:
    ├── build: "esbuild src/cli/index.ts --bundle --platform=node --outfile=dist/index.js"
    ├── dev: "tsx src/cli/index.ts"
    └── test: "vitest"
```

## 8.2 分发方式

| 方式 | 说明 |
|------|------|
| **npm** | `npm install -g mrw`，主分发渠道 |
| **npx** | `npx mrw init`，免安装试用 |
| **GitHub Release** | 提供平台特定二进制（通过 pkg 或 sea 打包） |

## 8.3 开发依赖

| 包 | 用途 |
|----|------|
| commander | CLI 框架 |
| simple-git | Git 操作 |
| js-yaml | YAML 解析 |
| handlebars | 模板引擎 |
| chalk | 终端彩色输出 |
| ora | 终端 spinner |
| @inquirer/prompts | 交互提示 |
| gray-matter | Markdown frontmatter 解析 |
| esbuild | 构建 |
| tsx | 开发运行 |
| vitest | 测试 |
| typescript | 类型系统 |

---

# 九、性能考量

## 9.1 多仓库并行操作

`mrw sync` 和 `mrw branch create/checkout` 等批量操作应并行执行，避免串行等待。

```typescript
// 伪代码
const results = await Promise.allSettled(
  services.map(service => syncService(service))
);
```

## 9.2 大量服务场景

当 Workspace 包含 20+ 服务时：
- `mrw sync` 并行 clone 可能消耗大量网络和磁盘 IO → 考虑并发限制（如最多 5 个并行）
- `mrw status` 需要检查每个仓库的 git status → 利用 JSON 缓存减少重复计算
- 仓库目录深度嵌套在 `.mrw/state/repos/` 下 → 无性能问题，Git 操作基于仓库内部 `.git`

---

# 十、安全考量

| 场景 | 风险 | 缓解措施 |
|------|------|----------|
| Git 仓库 URL | workspace.yaml 中包含仓库地址，可能含认证信息 | 文档提醒使用 SSH 协议，避免 HTTPS + token |
| 仓库 clone | 不受信任的仓库可能包含恶意代码 | MRW 只 clone workspace.yaml 中声明的仓库，责任在配置者 |
| 未提交变更 | 跨仓库分支操作可能丢失工作 | 有未提交变更的服务自动跳过并警告 |
| 缓存数据 | JSON 缓存可能过时 | 缓存为可选优化，可安全删除重建 |

---

# 十一、测试策略

| 测试类型 | 范围 | 工具 |
|----------|------|------|
| **单元测试** | core/ 各模块的业务逻辑 | vitest |
| **集成测试** | CLI 命令的端到端流程 | vitest + child_process |
| **临时 Fixture** | 测试时创建临时 Workspace + 临时 Git 仓库 | tmp-promise + simple-git |

集成测试模式：

```
1. 创建临时目录
2. 创建若干临时 git 仓库（作为 mock 服务仓库）
3. 执行 mrw init（指定 mock 仓库路径）
4. 执行 mrw sync / status / branch 等命令
5. 断言输出和文件系统状态
6. 清理临时目录
```
