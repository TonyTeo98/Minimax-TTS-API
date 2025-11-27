import axios, { AxiosRequestConfig, AxiosResponse } from 'axios';
import WebSocket from 'ws';
import util from '../../lib/util';
import logger from '../../lib/logger';

const BASE_URL = 'https://www.minimax.io';
const WS_BASE_URL = 'wss://www.minimax.io';

// 伪装请求头
const FAKE_HEADERS = {
  'Accept': 'application/json, text/plain, */*',
  'Accept-Language': 'zh-CN,zh;q=0.9,en;q=0.8',
  'Cache-Control': 'no-cache',
  'Origin': 'https://www.minimax.io',
  'Pragma': 'no-cache',
  'Referer': 'https://www.minimax.io/audio/text-to-speech',
  'Sec-Ch-Ua': '"Chromium";v="142", "Microsoft Edge";v="142", "Not_A Brand";v="99"',
  'Sec-Ch-Ua-Mobile': '?0',
  'Sec-Ch-Ua-Platform': '"Windows"',
  'Sec-Fetch-Dest': 'empty',
  'Sec-Fetch-Mode': 'cors',
  'Sec-Fetch-Site': 'same-origin',
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/142.0.0.0 Safari/537.36 Edg/142.0.0.0'
};

// 设备信息缓存
const deviceInfoCache = new Map<string, { deviceId: string; userId: string; expireTime: number }>();

export interface AuthInfo {
  token: string;
  opTicket: string;
}

/**
 * 解析认证信息
 * token格式: token:op_ticket 或者只有token
 */
export function parseAuth(authorization: string): AuthInfo {
  const authStr = authorization.replace('Bearer ', '');
  const parts = authStr.split(':');

  if (parts.length >= 2) {
    return {
      token: parts[0],
      opTicket: parts[1]
    };
  }

  // 如果只提供一个值，假设它包含了完整的认证信息
  return {
    token: authStr,
    opTicket: ''
  };
}

/**
 * 获取或创建设备信息
 */
export async function acquireDeviceInfo(auth: AuthInfo): Promise<{ deviceId: string; userId: string }> {
  const cacheKey = auth.token;
  const cached = deviceInfoCache.get(cacheKey);

  if (cached && cached.expireTime > Date.now()) {
    return { deviceId: cached.deviceId, userId: cached.userId };
  }

  // 生成新的设备信息
  const userId = util.uuid();
  const deviceId = Math.random().toString().slice(2, 20);

  // 缓存3小时
  deviceInfoCache.set(cacheKey, {
    deviceId,
    userId,
    expireTime: Date.now() + 3 * 60 * 60 * 1000
  });

  logger.info(`Generated device info: deviceId=${deviceId}, userId=${userId}`);

  return { deviceId, userId };
}

/**
 * 发起HTTP请求
 */
export async function request(
  method: string,
  path: string,
  data: any,
  auth: AuthInfo,
  options: AxiosRequestConfig = {}
): Promise<AxiosResponse> {
  const deviceInfo = await acquireDeviceInfo(auth);
  const time = util.timestamp();

  // 构建查询参数
  const params = util.generateDeviceParams(deviceInfo.deviceId, deviceInfo.userId);
  const queryString = util.buildQueryString(params);
  const fullPath = `${path}${path.includes('?') ? '&' : '?'}${queryString}`;

  // 生成签名
  const bodyStr = data ? JSON.stringify(data) : '';
  const yy = util.generateYY(fullPath, bodyStr, time);

  const url = `${BASE_URL}${fullPath}`;

  logger.debug(`Request: ${method} ${url}`);

  return axios.request({
    method,
    url,
    data,
    timeout: 30000,
    validateStatus: () => true,
    ...options,
    headers: {
      ...FAKE_HEADERS,
      'Content-Type': 'application/json',
      'yy': yy,
      'op_ticket': auth.opTicket,
      ...(options.headers || {})
    }
  });
}

/**
 * 检查响应结果
 */
export function checkResult(result: AxiosResponse): any {
  if (!result.data) return null;

  const { base_resp, data, statusInfo } = result.data;

  // 处理新格式响应
  if (base_resp) {
    const { status_code, status_msg } = base_resp;
    if (status_code !== 0) {
      throw new Error(`API Error: [${status_code}] ${status_msg}`);
    }
    return data;
  }

  // 处理旧格式响应
  if (statusInfo) {
    const { code, message } = statusInfo;
    if (code !== 0) {
      throw new Error(`API Error: [${code}] ${message}`);
    }
    return data;
  }

  return result.data;
}

/**
 * 创建WebSocket连接
 */
export function createWebSocket(
  path: string,
  auth: AuthInfo,
  deviceInfo: { deviceId: string; userId: string }
): Promise<WebSocket> {
  return new Promise((resolve, reject) => {
    const time = util.timestamp();
    const params = util.generateDeviceParams(deviceInfo.deviceId, deviceInfo.userId);
    const queryString = util.buildQueryString(params);
    const fullPath = `${path}${path.includes('?') ? '&' : '?'}${queryString}`;

    // 生成签名
    const yy = util.generateYY(fullPath, '', time);

    // 构建WebSocket URL
    const wsUrl = `${WS_BASE_URL}${fullPath}&yy=${encodeURIComponent(yy)}&token=${encodeURIComponent(auth.token)}&op_ticket=${encodeURIComponent(auth.opTicket)}`;

    logger.debug(`WebSocket URL: ${wsUrl}`);

    const ws = new WebSocket(wsUrl, {
      headers: {
        ...FAKE_HEADERS,
        'Origin': 'https://www.minimax.io',
        'Sec-WebSocket-Version': '13'
      }
    });

    ws.on('open', () => {
      logger.success('WebSocket connected');
      resolve(ws);
    });

    ws.on('error', (err) => {
      logger.error('WebSocket error:', err.message);
      reject(err);
    });

    // 设置超时
    const timeout = setTimeout(() => {
      ws.close();
      reject(new Error('WebSocket connection timeout'));
    }, 10000);

    ws.on('open', () => clearTimeout(timeout));
  });
}

/**
 * 发送WebSocket消息并等待响应
 */
export function sendWebSocketMessage(
  ws: WebSocket,
  message: any,
  onData: (data: any) => void,
  onEnd: () => void
): void {
  const msgId = util.uuid();
  message.msg_id = msgId;

  logger.debug('Sending WS message:', JSON.stringify(message).substring(0, 200));

  ws.send(JSON.stringify(message));

  ws.on('message', (rawData) => {
    try {
      const data = JSON.parse(rawData.toString());

      // 忽略心跳消息
      if (data.method === 'Heartbeat') {
        // 响应心跳
        ws.send(JSON.stringify({
          method: 'Heartbeat',
          msg_id: data.msg_id,
          timestamp: util.timestamp()
        }));
        return;
      }

      onData(data);

      // 检查是否结束
      if (data.data?.status === 2 || data.base_resp?.status_code !== 0) {
        onEnd();
      }
    } catch (err) {
      logger.error('Failed to parse WS message:', err);
    }
  });
}

export default {
  parseAuth,
  acquireDeviceInfo,
  request,
  checkResult,
  createWebSocket,
  sendWebSocketMessage
};
