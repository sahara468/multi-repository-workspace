## Why

企业微服务架构下，一个业务能力通常分布在多个独立代码仓库中。随着 AI 编程工具（Claude Code、Copilot、Cursor）的快速发展，开发人员的能力边界正在被大幅放大——未来一个开发人员 + AI 将同时负责 10~20 个微服务的设计、开发与维护。但当前研发工具仍然以单仓库为中心，导致：

1. **代码仓管理高度碎片化**——开发人员需要手动 clone 多个仓库、同步分支、频繁切换上下文，认知成本极高
2. **规格与代码完全割裂**——PRD、架构图、技术设计、API 定义散落在不同系统，文档与代码长期漂移，AI 无法获取完整上下文
3. **现有 SDD 工具为单仓库视角**——一个需求影响多个服务时，缺乏跨服务的设计与规格管理能力
4. **AI 缺乏 Workspace 级上下文**——没有服务拓扑、跨服务接口、业务域上下文，AI 输出天然碎片化

软件开发的核心范式正在从"通过系统拆分让人类管理复杂度"转向"借助 AI 让人类重新掌控系统整体复杂度"。这要求一个新的研发主入口：**Workspace 替代 Repo，成为 AI 时代研发的操作系统**。

## What Changes

- 新增 **多代码仓工作空间平台（MRW）**：一个 CLI 工具集，用于将多个微服务代码仓库统一管理为一个完整的业务工程空间
- 新增 **workspace.yaml**：Workspace 定义文件，声明业务域、服务列表、仓库引用
- 新增 **多仓库统一管理能力**：init / sync / status / branch / checkout 等命令，自动 clone 仓库到 `.mrw/state/repos/`
- 新增 **Workspace 级 Spec 管理**：跨服务的交互规格、入口服务能力描述、架构约束的统一管理
- 新增 **OpenSpec 跨服务扩展**：在 OpenSpec 基础上扩展跨服务变更管理（proposal / design / tasks 按 Service 分解）
- 核心操作边界：MRW 负责 Workspace 层（Spec / Design / 分支管理），单仓库代码开发通过 `cd .mrw/state/repos/<service>` 切换后使用 Claude Code

## Capabilities

### New Capabilities

- `workspace-management`: Workspace 的创建、初始化、服务注册、仓库同步与状态查看
- `branch-orchestration`: 跨仓库分支管理——统一创建/切换分支，支持全量和指定服务两种模式
- `workspace-spec`: Workspace 级规格管理——跨服务交互规格、入口服务能力、架构约束的创建/查看/列表
- `cross-service-change`: 基于 OpenSpec 扩展的跨服务变更管理——跨服务提案、设计、任务分解

### Modified Capabilities

<!-- 无现有 Spec 需要修改 -->

## Impact

- **新增代码**：独立的 Node.js/TypeScript CLI 项目（`mrw` 命令）
- **仓库结构**：Workspace 根目录作为 Git 仓库，`workspace.yaml` 进 Git 版本管理，`.mrw/state/` 不进 Git
- **依赖 OpenSpec**：MRW 的跨服务变更管理基于 OpenSpec 的 schema 扩展，非替代关系
- **用户工作流变化**：开发人员从"单仓库 IDE"切换到"Workspace CLI + 单仓库 Claude Code"的两层模式
- **AI 交互方式**：Workspace 级上下文通过手动复制粘贴传递给 AI，不内建自动化上下文注入
- **协作方式**：团队通过 Git 共享 Workspace（workspace.yaml + specs/ + .mrw/changes/）
