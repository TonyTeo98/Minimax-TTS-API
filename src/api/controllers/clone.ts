import FormData from 'form-data';
import axios from 'axios';
import core, { AuthInfo } from './core';
import util from '../../lib/util';
import logger from '../../lib/logger';

export interface CloneVoiceRequest {
  name: string;
  audioFile: Buffer;
  audioFileName?: string;
  description?: string;
}

export interface CloneVoiceResponse {
  voiceId: string;
  name: string;
  status: string;
}

/**
 * 上传音频文件用于声音克隆
 */
export async function uploadAudioFile(
  audioBuffer: Buffer,
  fileName: string,
  auth: AuthInfo
): Promise<string> {
  const deviceInfo = await core.acquireDeviceInfo(auth);
  const time = util.timestamp();

  // 获取上传策略
  const params = util.generateDeviceParams(deviceInfo.deviceId, deviceInfo.userId);
  const queryString = util.buildQueryString(params);
  const policyPath = `/v1/api/audio/upload/policy?${queryString}`;
  const yy = util.generateYY(policyPath, '', time);

  try {
    const policyResult = await axios.get(`https://www.minimax.io${policyPath}`, {
      headers: {
        'yy': yy,
        'op_ticket': auth.opTicket,
        'Accept': 'application/json',
        'Referer': 'https://www.minimax.io/audio/text-to-speech'
      }
    });

    const policyData = policyResult.data?.data;
    if (!policyData) {
      throw new Error('Failed to get upload policy');
    }

    const { upload_url, file_id, headers: uploadHeaders } = policyData;

    // 上传文件
    await axios.put(upload_url, audioBuffer, {
      headers: {
        'Content-Type': 'audio/mpeg',
        ...uploadHeaders
      }
    });

    logger.success(`Uploaded audio file: ${file_id}`);
    return file_id;
  } catch (err) {
    logger.error('Failed to upload audio file:', err);
    throw err;
  }
}

/**
 * 创建克隆音色
 */
export async function createCloneVoice(
  request: CloneVoiceRequest,
  auth: AuthInfo
): Promise<CloneVoiceResponse> {
  try {
    // 上传音频文件
    const fileId = await uploadAudioFile(
      request.audioFile,
      request.audioFileName || 'audio.mp3',
      auth
    );

    // 创建克隆任务
    const result = await core.request(
      'POST',
      '/v1/api/audio/voice/clone',
      {
        name: request.name,
        file_id: fileId,
        description: request.description || ''
      },
      auth
    );

    const data = core.checkResult(result);

    logger.success(`Created clone voice: ${data.voice_id}`);

    return {
      voiceId: data.voice_id || data.id,
      name: request.name,
      status: data.status || 'processing'
    };
  } catch (err) {
    logger.error('Failed to create clone voice:', err);
    throw err;
  }
}

/**
 * 查询克隆任务状态
 */
export async function getCloneStatus(voiceId: string, auth: AuthInfo): Promise<{
  voiceId: string;
  status: string;
  progress?: number;
  message?: string;
}> {
  try {
    const result = await core.request(
      'GET',
      `/v1/api/audio/voice/clone/status?voice_id=${voiceId}`,
      null,
      auth
    );

    const data = core.checkResult(result);

    return {
      voiceId: data.voice_id || voiceId,
      status: data.status || 'unknown',
      progress: data.progress,
      message: data.message
    };
  } catch (err) {
    logger.error('Failed to get clone status:', err);
    throw err;
  }
}

/**
 * 删除克隆音色
 */
export async function deleteCloneVoice(voiceId: string, auth: AuthInfo): Promise<boolean> {
  try {
    const result = await core.request(
      'DELETE',
      `/v1/api/audio/voice/clone?voice_id=${voiceId}`,
      null,
      auth
    );

    core.checkResult(result);
    logger.success(`Deleted clone voice: ${voiceId}`);
    return true;
  } catch (err) {
    logger.error('Failed to delete clone voice:', err);
    return false;
  }
}

/**
 * 更新克隆音色名称
 */
export async function updateCloneVoice(
  voiceId: string,
  name: string,
  auth: AuthInfo
): Promise<boolean> {
  try {
    const result = await core.request(
      'POST',
      '/v1/api/audio/voice/clone/update',
      {
        voice_id: voiceId,
        name: name
      },
      auth
    );

    core.checkResult(result);
    logger.success(`Updated clone voice: ${voiceId}`);
    return true;
  } catch (err) {
    logger.error('Failed to update clone voice:', err);
    return false;
  }
}

export default {
  uploadAudioFile,
  createCloneVoice,
  getCloneStatus,
  deleteCloneVoice,
  updateCloneVoice
};
