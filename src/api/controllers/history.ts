import core, { AuthInfo } from './core';
import logger from '../../lib/logger';

export interface AudioHistory {
  audioId: string;
  text: string;
  voiceId?: string;
  voiceName?: string;
  audioUrl?: string;
  duration?: number;
  createdAt?: string;
  status?: number;
}

export interface HistoryListResponse {
  list: AudioHistory[];
  total: number;
  page: number;
  pageSize: number;
}

/**
 * 获取历史记录列表
 */
export async function getHistoryList(
  auth: AuthInfo,
  page: number = 1,
  pageSize: number = 20
): Promise<HistoryListResponse> {
  try {
    const result = await core.request(
      'GET',
      `/v1/api/audio/history_list?page=${page}&page_size=${pageSize}`,
      null,
      auth
    );

    const data = core.checkResult(result);

    if (data && Array.isArray(data.list)) {
      const list = data.list.map((item: any) => ({
        audioId: item.audio_id || item.id,
        text: item.text || item.content,
        voiceId: item.voice_id,
        voiceName: item.voice_name,
        audioUrl: item.audio_url || item.url,
        duration: item.duration,
        createdAt: item.created_at || item.create_time,
        status: item.status
      }));

      return {
        list,
        total: data.total || list.length,
        page,
        pageSize
      };
    }

    return { list: [], total: 0, page, pageSize };
  } catch (err) {
    logger.error('Failed to get history list:', err);
    throw err;
  }
}

/**
 * 获取音频详情
 */
export async function getAudioDetail(audioId: string, auth: AuthInfo): Promise<AudioHistory | null> {
  try {
    const result = await core.request(
      'GET',
      `/v1/api/audio/details?audio_id=${audioId}`,
      null,
      auth
    );

    const data = core.checkResult(result);

    if (data) {
      return {
        audioId: data.audio_id || data.id || audioId,
        text: data.text || data.content,
        voiceId: data.voice_id,
        voiceName: data.voice_name,
        audioUrl: data.audio_url || data.url,
        duration: data.duration,
        createdAt: data.created_at || data.create_time,
        status: data.status
      };
    }

    return null;
  } catch (err) {
    logger.error('Failed to get audio detail:', err);
    throw err;
  }
}

/**
 * 删除音频记录
 */
export async function deleteAudio(audioId: string, auth: AuthInfo): Promise<boolean> {
  try {
    const result = await core.request(
      'DELETE',
      `/v1/api/audio/delete?audio_id=${audioId}`,
      null,
      auth
    );

    core.checkResult(result);
    logger.success(`Deleted audio: ${audioId}`);
    return true;
  } catch (err) {
    logger.error('Failed to delete audio:', err);
    return false;
  }
}

/**
 * 下载音频文件
 */
export async function downloadAudio(audioUrl: string): Promise<Buffer> {
  const axios = require('axios');

  try {
    const response = await axios.get(audioUrl, {
      responseType: 'arraybuffer',
      timeout: 30000,
      headers: {
        'Referer': 'https://www.minimax.io/',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      }
    });

    return Buffer.from(response.data);
  } catch (err) {
    logger.error('Failed to download audio:', err);
    throw err;
  }
}

export default {
  getHistoryList,
  getAudioDetail,
  deleteAudio,
  downloadAudio
};
