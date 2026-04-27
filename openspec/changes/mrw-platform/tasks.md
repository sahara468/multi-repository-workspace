## 1. 项目初始化

- [ ] 1.1 初始化 TypeScript/Node.js 项目结构（package.json、tsconfig.json、src/ 目录）
- [ ] 1.2 添加核心依赖（commander/yargs CLI 框架、simple-git、yaml 解析库、chalk/ora 终端 UI）
- [ ] 1.3 配置构建工具（esbuild 或 tsx）和 bin 入口（`mrw` 命令）
- [ ] 1.4 搭建命令注册框架（commander 子命令结构）

## 2. workspace.yaml 定义与解析

- [ ] 2.1 定义 workspace.yaml 的 TypeScript 类型/接口（version, workspace, services）
- [ ] 2.2 实现 workspace.yaml 读取与校验（必填字段验证：name, repo, branch）
- [ ] 2.3 实现 workspace.yaml 写入（序列化为 YAML）

## 3. Workspace 初始化（mrw init）

- [ ] 3.1 实现交互式 init 流程（inquirer 提示 workspace name/description/domain）
- [ ] 3.2 实现服务注册交互（循环添加 service：name/repo/branch/language/description）
- [ ] 3.3 实现目录结构创建（.mrw/state/repos/、.mrw/state/index/、.mrw/changes/、specs/capabilities/、specs/entries/、specs/constraints/）
- [ ] 3.4 实现 .gitignore 生成（添加 .mrw/state/ 条目）
- [ ] 3.5 实现 workspace.yaml 文件输出
- [ ] 3.6 实现 `--from-template` 模板初始化支持

## 4. 多仓库同步（mrw sync）

- [ ] 4.1 实现 git clone 到 .mrw/state/repos/<service-name>/ 逻辑
- [ ] 4.2 实现 git pull 更新已 clone 仓库逻辑
- [ ] 4.3 实现未提交变更检测（跳过 pull 并警告）
- [ ] 4.4 实现单服务同步（mrw sync <service-name>）
- [ ] 4.5 实现同步状态显示（每个服务的 success/failure/当前分支）

## 5. Workspace 状态查看（mrw status）

- [ ] 5.1 实现工作空间基础信息展示（name、description）
- [ ] 5.2 实现服务状态列表展示（分支、同步状态、是否 clone、未提交变更）
- [ ] 5.3 实现不同分支高亮提示（当服务处于不同分支时）

## 6. 跨仓库分支管理（mrw branch / mrw checkout）

- [ ] 6.1 实现 mrw branch create <name> 为所有已 clone 服务创建分支
- [ ] 6.2 实现 --services 参数指定服务子集
- [ ] 6.3 实现未提交变更时跳过分支创建并警告
- [ ] 6.4 实现 mrw checkout <name> 为所有已 clone 服务切换分支
- [ ] 6.5 实现 checkout 时的 --services 参数和未提交变更保护

## 7. Workspace 级 Spec 管理（mrw spec）

- [ ] 7.1 实现 mrw spec list——扫描 specs/ 目录，按类型分组展示，显示 frontmatter 中的 involves
- [ ] 7.2 实现 mrw spec show <name>——在 capabilities/entries/constraints 中查找并展示
- [ ] 7.3 实现 mrw spec create <name> --type <capability|entry|constraint>——创建含 YAML frontmatter 的 Markdown 文件
- [ ] 7.4 实现 spec frontmatter 中 involves 字段与服务名的关联解析

## 8. 跨服务变更管理（mrw change）

- [ ] 8.1 实现 mrw change propose <name>——创建 .mrw/changes/<name>/ 目录及 proposal.md 模板
- [ ] 8.2 proposal.md 模板包含：概述、涉及服务表（名称/影响类型/优先级）、跨服务影响、依赖拓扑、拆分策略
- [ ] 8.3 实现 proposal 中服务名校验（与 workspace.yaml 中的 services 对比）
- [ ] 8.4 实现 mrw change list——列出 .mrw/changes/ 下所有活跃变更
- [ ] 8.5 实现 mrw change design <name>——创建 design.md 模板（跨服务交互设计、per-service 设计范围、接口契约）
- [ ] 8.6 实现 mrw change tasks <name>——创建 tasks.md 模板（按 Service 分组任务、跨服务协调任务）

## 9. JSON 缓存与索引

- [ ] 9.1 实现 .mrw/state/index/ 下的 JSON 缓存读写工具函数
- [ ] 9.2 实现服务拓扑索引缓存（topology.json）
- [ ] 9.3 实现依赖关系索引缓存（dependencies.json）

## 10. 集成测试与文档

- [ ] 10.1 端到端测试：mrw init → mrw sync → mrw status 完整流程
- [ ] 10.2 端到端测试：mrw branch create → mrw checkout 完整流程
- [ ] 10.3 端到端测试：mrw spec create → mrw spec list → mrw spec show 完整流程
- [ ] 10.4 端到端测试：mrw change propose → design → tasks 完整流程
- [ ] 10.5 编写 README.md（安装、快速开始、命令参考）
