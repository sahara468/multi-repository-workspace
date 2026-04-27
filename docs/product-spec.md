# MRW 产品规格设计文档（Product Specification）

> 版本：1.0
> 最后更新：2026-04-28
> 状态：Draft

---

# 一、产品概述

## 1.1 产品名称

多代码仓工作空间平台（Multi-Repository Workspace Platform，简称 MRW）

## 1.2 产品定位

面向 AI 原生微服务研发的 CLI 工具集，将多个微服务代码仓库统一管理为一个完整的业务工程空间。

## 1.3 核心价值主张

**用 Workspace 替代 Repo，成为 AI 时代研发的主入口。**

软件工程的核心范式正在从"通过系统拆分让人类管理复杂度"转向"借助 AI 让人类重新掌控系统整体复杂度"。MRW 正是面向这一范式转变的基础设施。

## 1.4 不做什么

MRW 明确不是：
- 不是另一个构建编排工具（非 Nx/Bazel 竞品）
- 不替代 Claude Code 在单仓库中的代码开发角色
- 不改变现有微服务边界，仅做统一视图
- 不是 IDE 插件，是独立 CLI 工具

---

# 二、用户画像

## 2.1 全栈 AI 开发者

| 属性 | 描述 |
|------|------|
| 典型特征 | 一个人负责 5+ 微服务，使用 Claude Code 做主要开发 |
| 核心痛点 | 多仓库频繁切换、上下文切换成本高、跨服务理解困难 |
| 期望收益 | 一个命令管理所有仓库的分支/同步，统一查看跨服务 Spec |

## 2.2 技术 Leader / 架构师

| 属性 | 描述 |
|------|------|
| 典型特征 | 需要全局视图做架构决策，理解变更的跨服务影响 |
| 核心痛点 | 架构决策缺乏完整上下文，变更影响分析靠人工梳理 |
| 期望收益 | Workspace 级拓扑视图，跨服务变更影响自动关联 |

## 2.3 AI Agent

| 属性 | 描述 |
|------|------|
| 典型特征 | 需要 Workspace 级 Context 做跨服务变更，需要 Spec 指导代码生成 |
| 核心痛点 | Fragmented context 导致低质量输出 |
| 期望收益 | 结构化的跨服务上下文（拓扑、Spec、约束），可消费的 Markdown 输出 |

---

# 三、核心概念

## 3.1 概念模型

```
┌────────────────────────────────────────────────────────────┐
│                     Workspace                               │
│                                                            │
│   定义：一个业务能力 = 一个 Workspace                        │
│                                                            │
│   ┌──────────┐  ┌──────────┐  ┌──────────┐                │
│   │ Service  │  │ Service  │  │ Service  │                │
│   │ (Repo)   │  │ (Repo)   │  │ (Repo)   │                │
│   │ 代码 +   │  │ 代码 +   │  │ 代码 +   │                │
│   │ 单服务   │  │ 单服务   │  │ 单服务   │                │
│   │ Spec     │  │ Spec     │  │ Spec     │                │
│   └──────────┘  └──────────┘  └──────────┘                │
│        ▲              ▲             ▲                      │
│        └──────────────┼─────────────┘                      │
│                       │                                    │
│              ┌────────▼────────┐                           │
│              │ Workspace Spec  │                           │
│              │                 │                           │
│              │ • 跨服务交互    │                           │
│              │ • 入口服务能力  │                           │
│              │ • 架构约束      │                           │
│              └─────────────────┘                           │
│                                                            │
│   ┌─────────────────────────────────────────┐              │
│   │         Workspace Design (Change)        │              │
│   │ • 跨服务变更提案                         │              │
│   │ • 跨服务设计                             │              │
│   │ • 按 Service 分解的任务                  │              │
│   └─────────────────────────────────────────┘              │
│                                                            │
└────────────────────────────────────────────────────────────┘
```

## 3.2 操作边界

```
MRW Workspace 层负责：              单仓库上下文负责：
─────────────────────              ──────────────────
• 管理哪些仓库属于 Workspace       • 具体代码编写/修改
• Workspace 级 Spec               • 单服务测试
• 跨服务 Design（Change）          • 单服务 CI/CD
• 分支同步管理                     • 单服务内部重构
• 变更影响关联                     • 单服务内部 Spec/Design
```

切换方式：用户直接 `cd .mrw/state/repos/<service>` 进入单仓库，无需额外命令。

## 3.3 核心概念定义

| 概念 | 定义 |
|------|------|
| **Workspace** | 一个业务能力的研发空间，包含多个微服务仓库和统一的 Spec/Design |
| **Service** | Workspace 中注册的一个微服务，对应一个 Git 仓库 |
| **Workspace Spec** | Workspace 级规格，描述跨服务交互、入口服务能力、架构约束 |
| **Capability Spec** | 一种 Workspace Spec 类型，描述一个跨多个服务的业务能力 |
| **Entry Point Spec** | 一种 Workspace Spec 类型，描述入口服务对外暴露的能力 |
| **Constraint Spec** | 一种 Workspace Spec 类型，描述架构层面的硬性约束规则 |
| **Change** | 一个跨服务变更，基于 OpenSpec 扩展，包含 proposal/design/tasks |

---

# 四、功能规格

## 4.1 能力分层

```
┌─────────────────────────────────────────────────────┐
│  MVP（没有就不能用）                                  │
│  ├── 多代码仓统一管理                                │
│  ├── 规格与设计统一管理                              │
│  └── Workspace 级 AI Context（手动复制粘贴）          │
│                                                     │
│  V2（有了更好用）                                    │
│  ├── 跨服务依赖分析                                  │
│  └── AI 驱动的增量式规格生成                          │
│                                                     │
│  V3（生态级能力）                                    │
│  ├── 多服务联合设计工作流                             │
│  └── 面向分布式系统的 SDD                             │
└─────────────────────────────────────────────────────┘
```

## 4.2 MVP 功能清单

### 4.2.1 多仓库管理

| 命令 | 功能 | 说明 |
|------|------|------|
| `mrw init` | 交互式创建 Workspace | 提示 workspace name/description/domain，循环添加 service |
| `mrw init --from-template <name>` | 从模板创建 | 预置常用业务域模板 |
| `mrw sync` | 同步所有仓库 | clone 未 clone 的仓库，pull 已 clone 的仓库 |
| `mrw sync <service>` | 同步单个仓库 | 只操作指定服务 |
| `mrw status` | 查看 Workspace 状态 | 服务列表、分支、同步状态、未提交变更 |

### 4.2.2 跨仓库分支管理

| 命令 | 功能 | 说明 |
|------|------|------|
| `mrw branch create <name>` | 为所有服务创建分支 | 支持 `--services s1,s2` 指定子集 |
| `mrw checkout <name>` | 切换所有服务的分支 | 支持 `--services s1,s2` 指定子集 |

**安全机制**：有未提交变更的服务自动跳过并警告，不会丢失工作区内容。

### 4.2.3 Workspace 级 Spec 管理

| 命令 | 功能 | 说明 |
|------|------|------|
| `mrw spec list` | 列出所有 Workspace 级规格 | 按类型分组（capabilities/entries/constraints），显示 involves |
| `mrw spec show <name>` | 查看指定规格 | 在各类型目录中查找 |
| `mrw spec create <name> --type <type>` | 创建规格 | type 可选 capability/entry/constraint |

**Spec 目录结构**：

```
specs/
├── capabilities/        # 跨服务交互能力规格
│   ├── order-creation.md
│   └── refund.md
├── entries/             # 入口服务能力描述
│   └── order-service-api.md
├── constraints/         # 架构约束
│   └── architecture-rules.md
└── topology.md          # 服务拓扑文字描述
```

**Spec 格式**：Markdown + YAML frontmatter

```markdown
---
name: refund
involves: [order-service, payment-service, notification-service, workflow-engine]
---

# 退款能力

## 概述
...
```

**Topology 格式**：纯 Markdown 文字描述，不用 YAML 声明。

### 4.2.4 跨服务变更管理（OpenSpec 扩展）

| 命令 | 功能 | 说明 |
|------|------|------|
| `mrw change propose <name>` | 创建跨服务变更提案 | 生成含涉及服务表、影响分析的 proposal.md |
| `mrw change list` | 列出活跃变更 | 展示 .mrw/changes/ 下所有变更 |
| `mrw change design <name>` | 创建/编辑跨服务设计 | 生成含跨服务交互、接口契约的 design.md |
| `mrw change tasks <name>` | 创建/查看跨服务任务 | 按 Service 分组生成 tasks.md |

**Change 目录结构**：

```
.mrw/changes/
└── refund-capability/
    ├── proposal.md          # 跨服务变更提案
    ├── design.md            # 跨服务设计
    ├── specs/               # 各服务的变更影响规格
    │   ├── order-impact.md
    │   └── payment-impact.md
    └── tasks.md             # 按 Service 分解的任务
```

**与 OpenSpec 的关系**：MRW 的 Change 目录结构与 OpenSpec 的 change schema 兼容，在其上扩展了跨服务维度（按 Service 分解 tasks、per-service impact spec）。

---

# 五、Workspace 定义格式

## 5.1 workspace.yaml

```yaml
version: "1.0"

workspace:
  name: order-fulfillment
  description: 订单履约业务域

services:
  order-service:
    repo: git@github.com:myorg/order-service.git
    branch: main
    language: java
    description: 订单核心服务

  payment-service:
    repo: git@github.com:myorg/payment-service.git
    branch: main
    language: java
    description: 支付与结算服务

  notification-service:
    repo: git@github.com:myorg/notification-service.git
    branch: main
    language: typescript
    description: 消息通知服务
```

**字段说明**：

| 字段 | 必填 | 说明 |
|------|------|------|
| `version` | 是 | workspace.yaml 格式版本，当前为 "1.0" |
| `workspace.name` | 是 | Workspace 名称，kebab-case |
| `workspace.description` | 否 | 业务域描述 |
| `workspace.domain` | 否 | 业务域标签，用于分类 |
| `services.<name>.repo` | 是 | Git 仓库 URL |
| `services.<name>.branch` | 是 | 追踪的默认分支 |
| `services.<name>.language` | 否 | 主要开发语言 |
| `services.<name>.description` | 否 | 服务描述 |

## 5.2 Workspace 目录结构

```
<workspace-root>/
├── workspace.yaml                # Workspace 定义（Git 跟踪）
├── specs/                        # Workspace 级规格（Git 跟踪）
│   ├── capabilities/
│   ├── entries/
│   ├── constraints/
│   └── topology.md
├── .mrw/                         # MRW 工作目录
│   ├── state/                    # 运行时状态（Git 不跟踪）
│   │   ├── repos/                # 克隆的服务仓库
│   │   │   ├── order-service/
│   │   │   ├── payment-service/
│   │   │   └── notification-service/
│   │   └── index/                # 索引缓存（Git 不跟踪）
│   │       ├── topology.json
│   │       └── dependencies.json
│   └── changes/                  # 跨服务变更（Git 跟踪）
│       └── refund-capability/
│           ├── proposal.md
│           ├── design.md
│           ├── specs/
│           └── tasks.md
├── .gitignore                    # 包含 .mrw/state/
└── README.md
```

**Git 跟踪策略**：

| 路径 | 是否 Git 跟踪 | 原因 |
|------|---------------|------|
| `workspace.yaml` | 是 | 团队共享 Workspace 定义 |
| `specs/` | 是 | 团队共享规格 |
| `.mrw/changes/` | 是 | 团队共享变更管理 |
| `.mrw/state/repos/` | 否 | 仓库数据不应进 Git |
| `.mrw/state/index/` | 否 | 运行时缓存，本地生成 |

---

# 六、AI 交互方式

MVP 阶段采用最简方式：用户手动从 Workspace 文件中复制所需上下文粘贴到 Claude Code 对话中。

MRW 不内建自动化上下文注入，不做 `mrw context` 命令。原因：
- MVP 阶段优先验证核心功能价值
- 手动方式虽然不便，但让用户明确感知传递了什么上下文
- V2 阶段再考虑自动化方案

---

# 七、协作模式

## 7.1 团队协作

Workspace 根目录作为一个 Git 仓库管理。团队成员通过 Git 共享：
- workspace.yaml（服务列表定义）
- specs/（Workspace 级规格）
- .mrw/changes/（跨服务变更）

`.mrw/state/` 不进 Git，每个团队成员在本地 `mrw sync` 获取仓库数据。

## 7.2 Spec 审核

Spec 变更的审核由 CTO / 架构 Leader 负责通过 Git PR 流程完成。MRW 不内建审核命令，不强制流程。

## 7.3 Change 生命周期

Change 的生命周期状态机不在 MVP 中内建，后续单独设计。当前 Change 通过目录是否存在来标识活跃状态。

---

# 八、版本演进路线

```
MVP                              V2                           V3
┌────────────────────┐    ┌────────────────────┐    ┌────────────────────┐
│ • 多仓库管理        │    │ • 跨服务依赖分析    │    │ • 多服务联合设计    │
│ • Spec 管理        │──▶ │ • AI 增量规格生成   │──▶ │   工作流           │
│ • OpenSpec 跨服务  │    │ • AI 上下文自动     │    │ • 分布式系统 SDD   │
│   变更扩展          │    │   注入              │    │ • 生态集成         │
└────────────────────┘    └────────────────────┘    └────────────────────┘
```
