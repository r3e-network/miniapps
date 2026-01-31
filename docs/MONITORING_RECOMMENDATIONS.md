# 生产环境监控配置

## 监控建议实施

### 1. Cloudflare Analytics（已内置）

Cloudflare R2自动提供:
- 请求数统计
- 带宽使用
- 错误率监控
- 访问地理分布

查看地址: https://dash.cloudflare.com/{account-id}/r2/buckets/miniapps

### 2. 推荐：Sentry错误追踪

```bash
# 安装Sentry SDK
pnpm add @sentry/vue

# 在App.vue中初始化
import * as Sentry from "@sentry/vue";

Sentry.init({
  app,
  dsn: "YOUR_SENTRY_DSN",
  environment: "production",
  tracesSampleRate: 0.1,
});
```

### 3. 推荐：Lighthouse CI性能监控

```bash
# 安装
npm install -g @lhci/cli

# 配置 lighthouserc.js
module.exports = {
  ci: {
    collect: {
      url: [
        'https://your-cdn.com/miniapps/coin-flip/index.html',
        'https://your-cdn.com/miniapps/lottery/index.html',
      ],
      numberOfRuns: 3,
    },
    assert: {
      preset: 'lighthouse:recommended',
    },
  },
};
```

### 4. 推荐：Uptime监控

使用UptimeRobot (https://uptimerobot.com):
- 监控所有52个应用的可用性
- 设置5分钟检查间隔
- 配置Discord/Email告警

### 5. 健康检查端点

建议添加健康检查:
```javascript
// scripts/health-check.js
const apps = ['coin-flip', 'lottery', 'neoburger', ...];

async function checkHealth() {
  for (const app of apps) {
    const url = `https://cdn.example.com/miniapps/${app}/index.html`;
    try {
      const res = await fetch(url);
      console.log(`${app}: ${res.status === 200 ? '✅' : '❌'}`);
    } catch (e) {
      console.log(`${app}: ❌ ${e.message}`);
    }
  }
}
```

---

## 执行检查清单

- [ ] 注册Sentry账号并获取DSN
- [ ] 配置Lighthouse CI
- [ ] 设置UptimeRobot监控
- [ ] 创建健康检查脚本
- [ ] 配置告警通知

---

**状态**: 待实施（建议立即配置）
