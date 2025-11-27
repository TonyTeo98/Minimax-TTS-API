# Cloudflare 反爬虫限制说明

## 问题分析

经过深入调试和测试，我们发现 MiniMax TTS WebSocket API 受到 **Cloudflare 反爬虫保护**，这是导致 400 错误的根本原因。

### 技术细节

1. **Cloudflare Challenge**
   - 每次访问 MiniMax 都会触发 Cloudflare 验证
   - Cloudflare 会检查浏览器指纹：
     - TLS fingerprint
     - HTTP/2 fingerprint
     - JavaScript 执行环境
     - Canvas/WebGL 指纹
     - User-Agent 一致性

2. **Cookie 绑定**
   ```
   cf_clearance=xxx  # 与浏览器指纹绑定
   __cf_bm=yyy       # Bot Manager cookie
   ```
   这些 cookies 无法在 Node.js 环境中复用

3. **WebSocket 限制**
   - Node.js `ws` 库的连接特征与浏览器不同
   - Cloudflare 能检测出请求不是来自真实浏览器
   - 即使提供了所有正确的 cookies 和 headers

## 调试进展

✅ **已修复的问题**：
- WebSocket 路径：`/v1/api/audio/stream` → `/v1/api/audio/ws`
- 认证解析：正确处理带冒号的 `op_ticket` (格式：`timestamp:hash`)
- Cookie 传递：通过 Cookie header 而非 URL 参数传递 token
- Cloudflare cookies 支持：通过 `X-MiniMax-Cookie` header 传递完整浏览器 cookies
- 完整的 cookie 字符串透传（包括 cf_clearance、__cf_bm 等）

✅ **已验证的实现**：
```bash
# 使用 X-MiniMax-Cookie header 传递完整的浏览器 cookies
curl -X POST http://localhost:8000/api/tts \
  -H "Authorization: Bearer {token}:{op_ticket}" \
  -H "X-MiniMax-Cookie: HERTZ-SESSION=xxx; cf_clearance=xxx; __cf_bm=xxx; ..." \
  -H "Content-Type: application/json" \
  -d '{"text": "测试", "voice_id": "279479307768027"}'
```

❌ **无法绕过的限制**：
- **Cloudflare 浏览器指纹验证**：即使传递了正确的 Cloudflare cookies，Node.js `ws` 库的连接特征仍被识别为非浏览器流量
- **Bot Manager 检测**：Cloudflare 检测到 WebSocket 连接不是来自真实浏览器（TLS 指纹、HTTP/2 指纹等）
- **结果**：WebSocket 连接返回 400 错误

## 可能的解决方案

### 方案 1：使用浏览器自动化（推荐）

使用 Puppeteer 或 Playwright 在真实浏览器环境中运行：

```javascript
const puppeteer = require('puppeteer');

const browser = await puppeteer.launch();
const page = await browser.newPage();
await page.goto('https://www.minimax.io/audio');
// 登录并获取认证信息
// 在浏览器上下文中发起 WebSocket 连接
```

**优点**：
- 完全模拟真实浏览器
- 可以通过 Cloudflare 验证
- 最可靠的方案

**缺点**：
- 资源消耗较大
- 需要 headless browser
- 响应速度较慢

### 方案 2：反向代理

在浏览器中运行一个反向代理：

```
浏览器扩展 → MiniMax API → 本地服务器
```

**优点**：
- 利用浏览器环境
- 无需服务器端模拟

**缺点**：
- 需要开发浏览器扩展
- 依赖用户浏览器

### 方案 3：官方 API（理想）

等待 MiniMax 提供官方 API：
- 基于 API Key 的认证
- 无需 Cloudflare Challenge
- 稳定可靠

### 方案 4：使用 Cloudflare bypass 库

尝试使用专门的库（不保证成功）：
- `cloudflare-scraper`
- `cloudscraper`
- `undetected-chromedriver`

**注意**：这些方法可能违反服务条款

## 当前项目状态

本项目已实现了：
- ✅ 完整的 API 服务器架构
- ✅ Docker 支持和自动构建
- ✅ 正确的 WebSocket 连接逻辑
- ✅ 音色列表和历史记录功能
- ✅ 详细的文档

**限制**：
- ❌ TTS WebSocket 功能因 Cloudflare 保护无法使用
- 建议使用方案 1（浏览器自动化）来完全实现 TTS 功能

## 贡献

如果你成功绕过了 Cloudflare 限制，欢迎提交 PR！

特别欢迎：
1. Puppeteer/Playwright 集成方案
2. 浏览器扩展实现
3. 其他创新的解决方法

## 参考

- [Cloudflare Bot Management](https://www.cloudflare.com/products/bot-management/)
- [Puppeteer 文档](https://pptr.dev/)
- [Playwright 文档](https://playwright.dev/)
