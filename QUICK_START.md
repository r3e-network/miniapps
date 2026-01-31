# Neo N3 MiniApps 快速入门指南

**项目:** Neo N3 MiniApps  
**版本:** 1.0.0  
**最后更新:** 2026-01-30

---

## 1. 项目概述

### 1.1 项目简介

Neo N3 MiniApps 是一个包含52个微型应用程序的集合，每个应用都构建在Neo N3区块链之上。这些应用涵盖DeFi、游戏、社交工具、治理等多个领域，为用户提供丰富的区块链交互体验。

### 1.2 技术栈

| 类别 | 技术 |
|------|------|
| 前端框架 | Vue 3 + TypeScript |
| 构建工具 | Vite + Turbo |
| 包管理 | pnpm (monorepo) |
| 区块链SDK | @neo/uniapp-sdk |
| 样式方案 | SCSS + CSS Variables |
| 响应式设计 | ResponsiveLayout组件 |

### 1.3 核心特性

- **统一架构**: 所有应用遵循相同的技术栈和代码规范
- **响应式设计**: 支持桌面端和移动端的统一用户体验
- **安全性**: 32个智能合约已完成安全审计和权限限制
- **文档完整**: 100%应用README覆盖率，8个核心合约完成NatSpec文档
- **测试覆盖**: 75%的测试覆盖率

---

## 2. 环境准备

### 2.1 系统要求

| 要求 | 最低版本 | 推荐版本 |
|------|----------|----------|
| Node.js | 18.0.0 | 20.x LTS |
| pnpm | 8.0.0 | 8.x |
| Git | 2.0.0 | 最新版本 |
| 操作系统 | Windows 10/macOS/Linux | 最新的稳定版本 |

### 2.2 安装 Node.js 和 pnpm

**使用 nvm 安装 Node.js (macOS/Linux):**

```bash
# 安装 nvm (如果尚未安装)
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.0/install.sh | bash

# 安装并使用 Node.js 20.x
nvm install 20
nvm use 20

# 验证安装
node --version  # 应显示 v20.x.x
npm --version   # 应显示 10.x.x
```

**使用 nvm-windows 安装 Node.js (Windows):**

```powershell
# 安装 nvm-windows
choco install nvm -y

# 安装并使用 Node.js 20.x
nvm install 20
nvm use 20

# 验证安装
node --version
npm --version
```

**安装 pnpm:**

```bash
# 使用 npm 全局安装
npm install -g pnpm@8.x

# 验证安装
pnpm --version
```

### 2.3 配置开发环境

**Git 配置:**

```bash
# 设置用户名和邮箱
git config --global user.name "Your Name"
git config --global user.email "your.email@example.com"

# 启用 Git credential helper (可选)
git config --global credential.helper store

# 设置默认分支名为 main
git config --global init.defaultBranch main
```

**VS Code 设置 (推荐):**

```json
// .vscode/settings.json
{
  "typescript.preferences.importModuleSpecifier": "non-relative",
  "vue.inlayHints.propertyDeclaration": true,
  "editor.formatOnSave": true,
  "editor.codeActionsOnSave": {
    "source.fixAll.eslint": true,
    "source.organizeImports": true
  },
  "files.associations": {
    "*.vue": "vue"
  }
}
```

---

## 3. 项目设置

### 3.1 克隆仓库

```bash
# 克隆项目
git clone https://github.com/your-org/neo-n3-miniapps.git
cd neo-n3-miniapps

# 切换到主分支
git checkout main

# 拉取最新更改
git pull origin main
```

### 3.2 安装依赖

```bash
# 安装所有依赖
pnpm install

# 如果遇到权限问题
pnpm install --no-audit

# 验证安装
pnpm list --depth=0
```

### 3.3 环境配置

```bash
# 复制环境变量模板
cp .env.example .env.local

# 编辑环境变量
# 主要配置项:
# - NEO_RPC_URL: NEO区块链RPC节点地址
# - NEO_WSS_URL: NEO区块链WebSocket地址
# - NETWORK: network (mainnet/testnet)
```

### 3.4 验证安装

```bash
# 运行类型检查
pnpm typecheck

# 运行 lint
pnpm lint

# 运行测试
pnpm test

# 尝试构建一个应用
pnpm --filter breakup-contract build
```

---

## 4. 项目结构

### 4.1 目录结构

```
neo-n3-miniapps/
├── apps/                      # 52个微型应用
│   ├── breakup-contract/      # 分手合约
│   ├── burn-league/           # 燃烧联盟
│   ├── coin-flip/             # 硬币翻转
│   ├── daily-checkin/         # 每日签到
│   └── ...                    # 其他48个应用
├── _shared/                   # 共享组件和工具
│   ├── components/            # 共享Vue组件
│   │   ├── ResponsiveLayout.vue
│   │   ├── NeoCard.vue
│   │   ├── NeoButton.vue
│   │   └── ...
│   ├── composables/           # 共享组合式函数
│   ├── utils/                 # 共享工具函数
│   └── styles/                # 共享样式
├── contracts/                 # 智能合约源码
│   ├── MiniAppBurnLeague.cs
│   ├── MiniAppClaim.cs
│   └── ...
├── docs/                      # 项目文档
├── scripts/                   # 构建和部署脚本
├── config/                    # 项目配置
├── public/                    # 静态资源
├── package.json              # 根包配置
├── pnpm-workspace.yaml       # Monorepo配置
├── turbo.json                # Turbo构建配置
└── README.md                 # 项目说明
```

### 4.2 应用结构模板

每个应用遵循以下结构:

```
apps/[app-name]/
├── src/                      # 源代码
│   ├── pages/               # 页面组件
│   │   └── index/
│   │       ├── index.vue
│   │       └── index.test.ts
│   ├── components/          # 应用级组件
│   ├── composables/         # 应用级组合式函数
│   ├── utils/               # 应用级工具函数
│   ├── App.vue              # 应用根组件
│   └── main.ts              # 应用入口
├── tests/                   # 测试文件
├── contracts/               # 智能合约(如果有)
├── public/                  # 静态资源
├── package.json            # 应用包配置
├── vite.config.ts          # Vite配置
├── catalog-info.yaml       # 应用目录配置
└── README.md               # 应用说明
```

### 4.3 关键文件说明

| 文件 | 用途 |
|------|------|
| `apps/*/package.json` | 定义应用依赖和脚本 |
| `apps/*/vite.config.ts` | Vite构建配置 |
| `apps/*/catalog-info.yaml` | Backstage目录配置 |
| `_shared/components/*.vue` | 跨应用共享组件 |
| `contracts/*.cs` | Neo N3智能合约 |

---

## 5. 开发工作流

### 5.1 日常开发流程

```bash
# 1. 创建功能分支
git checkout -b feature/your-feature-name

# 2. 进行开发工作
# 编辑代码、添加功能、修复bug

# 3. 运行测试
pnpm test

# 4. 运行 lint 和格式化
pnpm lint
pnpm format

# 5. 提交更改
git add .
git commit -m "feat: 添加新功能描述"

# 6. 推送分支
git push origin feature/your-feature-name
```

### 5.2 运行单个应用

```bash
# 开发模式运行指定应用
pnpm --filter [app-name] dev

# 构建指定应用
pnpm --filter [app-name] build

# 测试指定应用
pnpm --filter [app-name] test

# 类型检查指定应用
pnpm --filter [app-name] typecheck
```

示例:

```bash
# 运行 coin-flip 应用
pnpm --filter coin-flip dev

# 构建 burn-league 应用
pnpm --filter burn-league build
```

### 5.3 运行所有应用

```bash
# 开发模式运行所有应用
pnpm dev

# 构建所有应用
pnpm build

# 测试所有应用
pnpm test

# 类型检查所有应用
pnpm typecheck

# Lint 所有应用
pnpm lint
```

### 5.4 代码规范

**遵循的规范:**

- **TypeScript**: 严格模式，启用 `noImplicitAny`
- **Vue 3**: 使用 Composition API + `<script setup>`
- **命名规范**:
  - 组件: PascalCase (如 `NeoCard.vue`)
  - 文件: kebab-case (如 `my-component.vue`)
  - 变量: camelCase (如 `isLoading`)
  - 常量: UPPER_SNAKE_CASE (如 `MAX_RETRIES`)
- **提交信息**: 使用 Conventional Commits 格式

**提交信息格式:**

```
<type>(<scope>): <description>

[optional body]

[optional footer]
```

类型列表:
- `feat`: 新功能
- `fix`: 修复bug
- `docs`: 文档更新
- `style`: 代码格式(不影响功能)
- `refactor`: 重构
- `test`: 测试相关
- `chore`: 构建工具或辅助工具的变更

示例:

```
feat(coin-flip): 添加游戏历史记录功能

- 显示最近10次游戏结果
- 支持按时间筛选
- 修复重新进入漏洞

Closes #123
```

---

## 6. 测试指南

### 6.1 测试命令

```bash
# 运行所有测试
pnpm test

# 运行指定应用的测试
pnpm --filter [app-name] test

# 运行测试并生成覆盖率报告
pnpm test:coverage

# 运行测试并监听变化
pnpm test:watch
```

### 6.2 测试结构

```
apps/[app-name]/
├── tests/
│   └── *.spec.ts            # 集成测试
├── src/
│   └── pages/
│       └── index/
│           └── index.test.ts  # 组件测试
└── vitest.config.ts         # Vitest配置
```

### 6.3 编写测试

**组件测试示例:**

```typescript
import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import MyComponent from './MyComponent.vue'

describe('MyComponent', () => {
  it('renders properly', () => {
    const wrapper = mount(MyComponent, {
      props: {
        title: 'Hello World'
      }
    })
    expect(wrapper.text()).toContain('Hello World')
  })

  it('emits event on click', async () => {
    const wrapper = mount(MyComponent)
    await wrapper.find('button').trigger('click')
    expect(wrapper.emitted()).toHaveProperty('click')
  })
})
```

### 6.4 测试最佳实践

- 每个功能至少有一个测试
- 测试应该快速执行
- 使用有意义的测试描述
- 遵循 AAA 模式 (Arrange, Act, Assert)
- 避免测试实现细节

---

## 7. 智能合约开发

### 7.1 合约结构

```csharp
using Neo.SmartContract.Framework;
using Neo.SmartContract.Framework.Services;

namespace MiniAppExample
{
    [ContractPermission("*", "*")]
    public class MiniAppExample : SmartContract
    {
        // 合约方法
        public static bool SomeMethod(byte[] arg)
        {
            // 实现逻辑
            return true;
        }
    }
}
```

### 7.2 合约编译

```bash
# 编译所有合约
pnpm contracts:build

# 编译指定合约
pnpm contracts:build --filter MiniAppBurnLeague
```

### 7.3 合约部署

```bash
# 部署合约到测试网
pnpm contracts:deploy --network testnet

# 部署合约到主网
pnpm contracts:deploy --network mainnet
```

### 7.4 合约权限

遵循最小权限原则:

```csharp
// ✅ 正确: 限制为 GAS 和 NEO 代币
[ContractPermission("0xd2a4cff31913016155e38e474a2c06d08be276cf", "*")]

// ❌ 错误: 过度权限
[ContractPermission("*", "*")]
```

---

## 8. 部署指南

### 8.1 构建应用

```bash
# 构建所有应用
pnpm build

# 构建指定应用
pnpm --filter [app-name] build

# 构建并部署到 CDN
pnpm build:deploy
```

### 8.2 CDN 部署

项目使用 R2 CDN 进行静态资源分发:

```bash
# 部署所有应用到 CDN
pnpm deploy:cdn

# 部署指定应用
pnpm --filter [app-name] deploy:cdn
```

### 8.3 环境配置

| 环境 | 配置值 | 用途 |
|------|--------|------|
| testnet | `testnet` | 开发测试 |
| mainnet | `mainnet` | 生产部署 |

### 8.4 部署检查清单

- [ ] 所有测试通过
- [ ] 类型检查无错误
- [ ] Lint 检查通过
- [ ] 构建成功
- [ ] 环境变量配置正确
- [ ] CDN 缓存已更新

---

## 9. 常见问题

### 9.1 安装问题

**问题: pnpm install 失败**

```bash
# 清除缓存并重新安装
rm -rf node_modules pnpm-store
pnpm install

# 如果使用 Node 版本不兼容
nvm use 20
pnpm install
```

**问题: 类型错误**

```bash
# 运行类型检查
pnpm typecheck

# 修复缺失的类型
pnpm install -D @types/node
```

### 9.2 构建问题

**问题: 构建超时**

```bash
# 增加超时时间
pnpm build --timeout 900000
```

**问题: 内存不足**

```bash
# 增加 Node 内存限制
export NODE_OPTIONS="--max-old-space-size=4096"
pnpm build
```

### 9.3 运行问题

**问题: 应用无法连接到区块链**

```bash
# 检查环境变量
cat .env.local | grep NEO

# 测试 RPC 连接
curl -X POST https://rpc.testnet.neo.org:20331 \
  -H "Content-Type: application/json" \
  -d '{"jsonrpc": "2.0", "method": "getblockcount", "params": [], "id": 1}'
```

### 9.4 Git 问题

**问题: 合并冲突**

```bash
# 查看冲突文件
git status

# 使用 IDE 或手动解决冲突
# 然后提交解决
git add .
git commit -m "fix: 解决合并冲突"
```

**问题: 忘记创建分支直接提交**

```bash
# 创建新分支并保存提交
git branch feature/your-branch-name
git checkout feature/your-branch-name

# 重置主分支
git checkout main
git reset --hard origin/main
```

---

## 10. 资源链接

### 10.1 文档资源

| 资源 | 链接 |
|------|------|
| 项目架构 | [ARCHITECTURE.md](./ARCHITECTURE.md) |
| 开发指南 | [DEVELOPMENT.md](./DEVELOPMENT.md) |
| 部署指南 | [DEPLOYMENT.md](./DEPLOYMENT.md) |
| 代码规范 | [STANDARDS.md](./STANDARDS.md) |
| 安全审计 | [SECURITY_AUDIT_REPORT.md](./SECURITY_AUDIT_REPORT.md) |
| 40轮审查报告 | [40_ROUND_REVIEW_REPORT.md](./40_ROUND_REVIEW_REPORT.md) |

### 10.2 外部资源

| 资源 | 链接 |
|------|------|
| Neo 文档 | https://docs.neo.org/ |
| Vue 3 文档 | https://vuejs.org/ |
| TypeScript 文档 | https://www.typescriptlang.org/ |
| Vite 文档 | https://vitejs.dev/ |
| Neo SDK | https://github.com/neo-ngd/neo-devpack-dotnet |

### 10.3 社区支持

- **GitHub Issues**: 报告bug或请求功能
- **GitHub Discussions**: 讨论问题和想法
- **Discord**: 加入社区频道

---

## 11. 下一步学习

1. **阅读项目文档**
   - 了解整体架构和设计模式
   - 熟悉共享组件的使用

2. **探索示例应用**
   - 选择一个简单的应用作为起点
   - 理解代码结构和最佳实践

3. **开始开发**
   - 创建你的第一个功能分支
   - 实现一个小功能并提交PR

4. **参与代码审查**
   - 学习如何审查他人的代码
   - 参与社区讨论和反馈

---

**祝你在 Neo N3 MiniApps 项目中开发愉快!**

如有问题,请参考常见问题部分或联系团队成员。
