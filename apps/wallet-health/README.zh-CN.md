# 钱包健康小程序

钱包健康是一个前端工具，帮助 Neo 用户检查钱包连接、余额和安全习惯。
清单状态仅保存在本地设备，不依赖链上合约。

## 功能
- Neo N3 连接状态
- NEO/GAS 余额检查
- 安全清单（本地保存）
- 风险等级与可执行建议

## 使用流程
1. 连接钱包并确认 Neo N3 网络。
2. 查看余额并预留足够 GAS 手续费。
3. 完成安全清单并查看评分。
4. 定期复查保持钱包健康。

## 开发说明
- 入口：`src/pages/index/index.vue`
- 文档：`src/pages/docs/index.vue`
- i18n：`src/locale/messages.ts`
- 资源：`src/static/logo.png`、`src/static/banner.png`
