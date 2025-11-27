import { v4 as uuidv4 } from 'uuid';
import md5 from 'js-md5';

/**
 * 生成UUID
 */
export function uuid(): string {
  return uuidv4();
}

/**
 * MD5哈希
 */
export function md5Hash(str: string): string {
  return md5(str);
}

/**
 * 获取当前时间戳(毫秒)
 */
export function timestamp(): number {
  return Date.now();
}

/**
 * 获取Unix时间戳(秒)
 */
export function unixTimestamp(): number {
  return Math.floor(Date.now() / 1000);
}

/**
 * 生成YY签名
 * 签名公式: MD5(encodeURIComponent(path) + "_" + body + MD5(timestamp) + "ooui")
 */
export function generateYY(path: string, body: string = '', time: number = timestamp()): string {
  const timeHash = md5Hash(time.toString());
  const signStr = `${encodeURIComponent(path)}_${body}${timeHash}ooui`;
  return md5Hash(signStr);
}

/**
 * 生成设备信息查询参数
 */
export function generateDeviceParams(deviceId: string, userId: string): Record<string, string | number> {
  return {
    device_platform: 'web',
    app_id: '3001',
    version_code: '22201',
    biz_id: '1',
    uuid: userId,
    lang: 'en',
    device_id: deviceId,
    os_name: 'Windows',
    browser_name: 'chrome',
    device_memory: 8,
    cpu_core_num: 12,
    browser_language: 'zh-CN',
    browser_platform: 'Win32',
    screen_width: 1920,
    screen_height: 1080,
    unix: timestamp()
  };
}

/**
 * 构建查询字符串
 */
export function buildQueryString(params: Record<string, any>): string {
  return Object.entries(params)
    .filter(([_, v]) => v !== undefined && v !== null)
    .map(([k, v]) => `${k}=${encodeURIComponent(v)}`)
    .join('&');
}

/**
 * 延迟
 */
export function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

export default {
  uuid,
  md5Hash,
  timestamp,
  unixTimestamp,
  generateYY,
  generateDeviceParams,
  buildQueryString,
  sleep
};
