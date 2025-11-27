# MiniMax TTS API

MiniMax 语音合成 (TTS) 免费 API 服务，支持语音合成、音色选择、历史记录、声音克隆等功能。

## 功能特性

- 🎤 **语音合成** - 将文字转换为高质量语音 (speech-2.6-hd)
- 🎭 **多种音色** - 支持官方音色和用户克隆音色
- 📜 **历史记录** - 查看、下载、删除历史音频
- 🧬 **声音克隆** - 上传音频创建专属克隆音色
- 🔊 **流式输出** - 支持流式音频传输
- 🔧 **OpenAI兼容** - 兼容 OpenAI TTS API 格式

## 部署方式

### 方式一：Docker 部署（推荐）

#### 使用预构建镜像

从 GitHub Container Registry 拉取最新镜像：

```bash
docker pull ghcr.io/tonyteo98/minimax-tts-api:latest

docker run -d \
  --name minimax-tts-api \
  -p 8000:8000 \
  ghcr.io/tonyteo98/minimax-tts-api:latest
```

#### 使用 Docker Compose

```bash
# 克隆仓库
git clone https://github.com/TonyTeo98/Minimax-TTS-API.git
cd Minimax-TTS-API

# 启动服务
docker-compose up -d

# 查看日志
docker-compose logs -f

# 停止服务
docker-compose down
```

#### 从源码构建

```bash
# 构建镜像
docker build -t minimax-tts-api .

# 运行容器
docker run -d \
  --name minimax-tts-api \
  -p 8000:8000 \
  -e HOST=0.0.0.0 \
  -e PORT=8000 \
  minimax-tts-api
```

### 方式二：本地运行

#### 1. 安装依赖

```bash
npm install
```

#### 2. 获取认证信息

**重要提示**：本 API 需要 MiniMax 的认证信息才能正常工作。

##### 推荐方法：一键获取认证信息

1. 访问 https://www.minimax.io/audio 并登录你的账号
2. 打开浏览器开发者工具 (F12) → **Console** 标签
3. 在控制台中粘贴并执行以下代码：

```javascript
// 一键获取 MiniMax 认证信息
(function() {
  console.log("=== MiniMax 认证信息 ===\n");

  // 从 localStorage 获取 op_ticket
  const userDetail = localStorage.getItem("user_detail");
  const parsed = userDetail ? JSON.parse(userDetail) : {};
  const opTicket = parsed.op_ticket;

  // 从 Cookie 获取 token (HERTZ-SESSION)
  const cookies = document.cookie.split(';').reduce((acc, cookie) => {
    const [key, value] = cookie.trim().split('=');
    acc[key] = value;
    return acc;
  }, {});
  const token = cookies['HERTZ-SESSION'];

  if (token && opTicket) {
    console.log("✅ 认证信息获取成功！\n");
    console.log("Token (HERTZ-SESSION):", token);
    console.log("op_ticket:", opTicket);
    console.log("\n📋 完整认证头（复制使用）:");
    console.log(`Authorization: Bearer ${token}:${opTicket}`);
  } else {
    console.error("❌ 认证信息获取失败");
    console.log("Token:", token ? "✅" : "❌ 未找到");
    console.log("op_ticket:", opTicket ? "✅" : "❌ 未找到");
    console.log("\n请确保：");
    console.log("1. 已登录 MiniMax 账号");
    console.log("2. 在 https://www.minimax.io/audio 页面执行此脚本");
  }
})();
```

4. 复制输出的完整认证头

##### 手动获取方法 (备选)

**Token (从 Cookie 获取)**：
1. 在开发者工具中切换到 **Application** 标签（Chrome）或 **存储** 标签（Firefox）
2. 在左侧 Cookies 中找到 `https://www.minimax.io`
3. 复制名为 `HERTZ-SESSION` 的 Cookie 值

**op_ticket (从 LocalStorage 获取)**：
1. 在开发者工具的 **Console** 标签执行：
```javascript
JSON.parse(localStorage.getItem("user_detail")).op_ticket
```
2. 复制输出的值

##### 使用认证信息

获取到 `token` 和 `op_ticket` 后，在所有 API 请求中添加以下 Header：

```
Authorization: Bearer {你的token}:{你的op_ticket}
```

**示例**：
```
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...:abc123xyz456
```

#### 3. 启动服务

```bash
# 开发模式
npm run dev

# 生产模式
npm run build
npm start
```

服务默认运行在 `http://localhost:8000`

## 测试服务

### 健康检查

验证服务是否正常运行：

```bash
curl http://localhost:8000/ping
```

正常返回：
```json
{"status":"ok","timestamp":1234567890}
```

### 测试认证

测试你的认证信息是否有效（将 `YOUR_TOKEN` 和 `YOUR_OP_TICKET` 替换为实际值）：

```bash
curl -X POST http://localhost:8000/api/tts \
  -H "Authorization: Bearer YOUR_TOKEN:YOUR_OP_TICKET" \
  -H "Content-Type: application/json" \
  -d '{"text": "测试", "voice_id": "279479307768027"}' \
  --output test.mp3
```

如果成功，会生成 `test.mp3` 文件。

**常见错误**：
- `Authorization header required` - 未提供认证头
- `Unexpected server response: 404` - 可能的原因：
  - 认证信息已过期，需重新获取
  - MiniMax API 端点已变更
  - 账号没有对应功能的权限或额度已用完
- `API Error: [xxx]` - MiniMax API 返回的具体错误信息

## API 文档

### 认证方式

所有API请求需要在 Header 中携带认证信息：

```
Authorization: Bearer {token}:{op_ticket}
```

### TTS 语音合成

#### POST /api/tts

生成语音并返回音频文件。

**请求体：**
```json
{
  "text": "要转换的文字",
  "voice_id": "279479307768027",
  "model": "speech-2.6-hd",
  "speed": 1,
  "volume": 1,
  "pitch": 0,
  "language_boost": "Chinese (Mandarin)",
  "effects": {
    "deepen_lighten": 0,
    "stronger_softer": 0,
    "nasal_crisp": 0,
    "spacious_echo": false,
    "lofi_telephone": false
  }
}
```

**响应：** 返回 `audio/mpeg` 格式的音频数据

#### POST /api/tts/stream

流式生成语音。

#### POST /api/tts/openai

OpenAI 兼容接口。

**请求体：**
```json
{
  "model": "tts-1-hd",
  "input": "要转换的文字",
  "voice": "279479307768027",
  "speed": 1
}
```

### 音色管理

#### GET /api/voices

获取所有可用音色列表（官方+克隆）。

#### GET /api/voices/official

获取官方音色列表。

#### GET /api/voices/cloned

获取用户克隆音色列表。

#### GET /api/voices/:id

获取指定音色详情。

### 历史记录

#### GET /api/history

获取历史音频列表。

**查询参数：**
- `page` - 页码，默认 1
- `page_size` - 每页数量，默认 20

#### GET /api/history/:id

获取指定音频详情。

#### DELETE /api/history/:id

删除指定音频记录。

#### GET /api/history/:id/download

下载指定音频文件。

### 声音克隆

#### POST /api/clone

创建克隆音色。

**请求体：**
```json
{
  "name": "我的克隆音色",
  "audio_base64": "base64编码的音频数据",
  "description": "音色描述（可选）"
}
```

或使用音频URL：
```json
{
  "name": "我的克隆音色",
  "audio_url": "https://example.com/audio.mp3",
  "description": "音色描述（可选）"
}
```

#### GET /api/clone/:id/status

获取克隆任务状态。

#### DELETE /api/clone/:id

删除克隆音色。

#### PUT /api/clone/:id

更新克隆音色名称。

**请求体：**
```json
{
  "name": "新名称"
}
```

## 使用示例

### Python

```python
import requests

url = "http://localhost:8000/api/tts"
headers = {
    "Authorization": "Bearer YOUR_TOKEN:YOUR_OP_TICKET",
    "Content-Type": "application/json"
}
data = {
    "text": "你好，这是一段测试语音。",
    "voice_id": "279479307768027"
}

response = requests.post(url, json=data, headers=headers)

with open("output.mp3", "wb") as f:
    f.write(response.content)
```

### JavaScript/Node.js

```javascript
const axios = require('axios');
const fs = require('fs');

async function generateSpeech() {
  const response = await axios.post('http://localhost:8000/api/tts', {
    text: '你好，这是一段测试语音。',
    voice_id: '279479307768027'
  }, {
    headers: {
      'Authorization': 'Bearer YOUR_TOKEN:YOUR_OP_TICKET'
    },
    responseType: 'arraybuffer'
  });

  fs.writeFileSync('output.mp3', response.data);
}

generateSpeech();
```

### cURL

```bash
curl -X POST http://localhost:8000/api/tts \
  -H "Authorization: Bearer YOUR_TOKEN:YOUR_OP_TICKET" \
  -H "Content-Type: application/json" \
  -d '{"text": "你好，这是一段测试语音。", "voice_id": "279479307768027"}' \
  --output output.mp3
```

## 环境变量配置

### 服务器配置

| 变量 | 说明 | 默认值 | 示例 |
|------|------|--------|------|
| `HOST` | 监听地址 | `0.0.0.0` | `0.0.0.0` |
| `PORT` | 监听端口 | `8000` | `8000` |
| `NODE_ENV` | 运行环境 | - | `production` / `development` |

### Docker 环境变量示例

**使用 docker run：**

```bash
docker run -d \
  --name minimax-tts-api \
  -p 3000:3000 \
  -e HOST=0.0.0.0 \
  -e PORT=3000 \
  -e NODE_ENV=production \
  ghcr.io/tonyteo98/minimax-tts-api:latest
```

**使用 docker-compose：**

修改 `docker-compose.yml` 中的 `environment` 部分：

```yaml
environment:
  - NODE_ENV=production
  - HOST=0.0.0.0
  - PORT=8000
```

### 本地开发环境变量

创建 `.env` 文件（可选）：

```bash
HOST=127.0.0.1
PORT=8000
NODE_ENV=development
```

## 参数说明

### 语音设置

| 参数 | 说明 | 范围 |
|------|------|------|
| speed | 语速 | 0.5 - 2.0 |
| volume | 音量 | 0.5 - 2.0 |
| pitch | 音调 | -12 - 12 |

### 音效设置

| 参数 | 说明 |
|------|------|
| deepen_lighten | 声音深浅 |
| stronger_softer | 强弱调节 |
| nasal_crisp | 鼻音/清脆 |
| spacious_echo | 空间回声 |
| lofi_telephone | 电话音效 |

### 语言增强

支持的语言：
- Chinese (Mandarin)
- English
- Japanese
- Korean
- 等等...

## 已知问题

### TTS WebSocket 404 错误

如果在使用 TTS 功能时遇到 `Unexpected server response: 404` 错误，可能是以下原因：

1. **MiniMax API 端点可能已更新** - MiniMax 可能调整了 WebSocket API 路径
2. **账号权限或额度限制** - 你的账号可能：
   - 没有 TTS 功能权限
   - ���费额度已用完
   - 需要订阅付费计划
3. **认证信息过期** - Cookie 有效期较短，需要定期重新获取

**解决方案**：
- 检查你的 MiniMax 账号是否可以在官网正常使用 TTS 功能
- 重新获取最新的认证信息
- 如果问题持续，可能需要等待项目更新适配最新的 API

**替代方案**：
- `/api/voices` - 音色列表功能正常
- `/api/history` - 历史记录功能正常

## 注意事项

1. 本项目仅供学习研究使用，请勿用于商业目的
2. 请遵守 MiniMax 的服务条款
3. 认证信息有时效性，过期需要重新获取
4. 克隆音色功能需要账号有相应权限
5. MiniMax 的 API 可能会不定期更新，导致部分功能失效

## 贡献

如果你发现了 API 端点的更新或修复方案，欢迎提交 Pull Request！

## License

MIT
