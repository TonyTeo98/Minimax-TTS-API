import core, { AuthInfo } from './core';
import logger from '../../lib/logger';

export interface Voice {
  voiceId: string;
  name: string;
  language?: string;
  gender?: string;
  preview_url?: string;
  is_clone?: boolean;
}

export interface VoiceListResponse {
  voices: Voice[];
  total: number;
}

/**
 * 获取官方音色列表
 */
export async function getOfficialVoices(auth: AuthInfo): Promise<VoiceListResponse> {
  try {
    const result = await core.request(
      'GET',
      '/v1/api/audio/voice/official_list',
      null,
      auth
    );

    const data = core.checkResult(result);

    if (data && Array.isArray(data.list)) {
      const voices = data.list.map((item: any) => ({
        voiceId: item.voice_id || item.id,
        name: item.name || item.voice_name,
        language: item.language,
        gender: item.gender,
        preview_url: item.preview_url || item.audio_url,
        is_clone: false
      }));

      return {
        voices,
        total: voices.length
      };
    }

    return { voices: [], total: 0 };
  } catch (err) {
    logger.error('Failed to get official voices:', err);
    throw err;
  }
}

/**
 * 获取用户克隆音色列表
 */
export async function getClonedVoices(auth: AuthInfo): Promise<VoiceListResponse> {
  try {
    const result = await core.request(
      'GET',
      '/v1/api/audio/voice/clone_list',
      null,
      auth
    );

    const data = core.checkResult(result);

    if (data && Array.isArray(data.list)) {
      const voices = data.list.map((item: any) => ({
        voiceId: item.voice_id || item.id,
        name: item.name || item.voice_name,
        language: item.language,
        preview_url: item.preview_url || item.audio_url,
        is_clone: true
      }));

      return {
        voices,
        total: voices.length
      };
    }

    return { voices: [], total: 0 };
  } catch (err) {
    logger.error('Failed to get cloned voices:', err);
    throw err;
  }
}

/**
 * 获取所有音色（官方+克隆）
 */
export async function getAllVoices(auth: AuthInfo): Promise<VoiceListResponse> {
  try {
    const [official, cloned] = await Promise.all([
      getOfficialVoices(auth).catch(() => ({ voices: [], total: 0 })),
      getClonedVoices(auth).catch(() => ({ voices: [], total: 0 }))
    ]);

    const allVoices = [...official.voices, ...cloned.voices];

    return {
      voices: allVoices,
      total: allVoices.length
    };
  } catch (err) {
    logger.error('Failed to get all voices:', err);
    throw err;
  }
}

/**
 * 获取音色详情
 */
export async function getVoiceDetail(voiceId: string, auth: AuthInfo): Promise<Voice | null> {
  try {
    const result = await core.request(
      'GET',
      `/v1/api/audio/voice/detail?voice_id=${voiceId}`,
      null,
      auth
    );

    const data = core.checkResult(result);

    if (data) {
      return {
        voiceId: data.voice_id || data.id,
        name: data.name || data.voice_name,
        language: data.language,
        gender: data.gender,
        preview_url: data.preview_url || data.audio_url,
        is_clone: data.is_clone || false
      };
    }

    return null;
  } catch (err) {
    logger.error('Failed to get voice detail:', err);
    throw err;
  }
}

// 预设的常用音色列表（备用）
export const PRESET_VOICES: Voice[] = [
  { voiceId: '279479307768027', name: 'Female Voice 1', language: 'Chinese', gender: 'female' },
  { voiceId: '279479307768028', name: 'Male Voice 1', language: 'Chinese', gender: 'male' },
  { voiceId: '279479307768029', name: 'Female Voice 2', language: 'English', gender: 'female' },
  { voiceId: '279479307768030', name: 'Male Voice 2', language: 'English', gender: 'male' },
];

export default {
  getOfficialVoices,
  getClonedVoices,
  getAllVoices,
  getVoiceDetail,
  PRESET_VOICES
};
