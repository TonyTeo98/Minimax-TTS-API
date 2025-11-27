import { PassThrough } from 'stream';
import core, { AuthInfo } from './core';
import util from '../../lib/util';
import logger from '../../lib/logger';

export interface TTSRequest {
  text: string;
  voiceId?: string;
  model?: string;
  speed?: number;
  volume?: number;
  pitch?: number;
  languageBoost?: string;
  stream?: boolean;
  effects?: {
    deepenLighten?: number;
    strongerSofter?: number;
    nasalCrisp?: number;
    spaciousEcho?: boolean;
    lofiTelephone?: boolean;
  };
}

export interface TTSResponse {
  audioData: Buffer;
  duration?: number;
  status: number;
}

/**
 * 生成语音 (WebSocket方式)
 */
export async function createSpeech(
  request: TTSRequest,
  auth: AuthInfo
): Promise<TTSResponse> {
  const deviceInfo = await core.acquireDeviceInfo(auth);

  // 构建WebSocket路径
  const wsPath = '/v1/api/audio/stream';

  const ws = await core.createWebSocket(wsPath, auth, deviceInfo);

  return new Promise((resolve, reject) => {
    const audioChunks: Buffer[] = [];
    let resolved = false;

    // 构建TTS请求
    const ttsRequest = {
      payload: {
        model: request.model || 'speech-2.6-hd',
        text: request.text,
        stream: request.stream !== false,
        language_boost: request.languageBoost || 'Chinese (Mandarin)',
        voice_setting: {
          speed: request.speed || 1,
          vol: request.volume || 1,
          pitch: request.pitch || 0,
          voice_id: request.voiceId || '279479307768027'
        },
        effects: {
          deepen_lighten: request.effects?.deepenLighten || 0,
          stronger_softer: request.effects?.strongerSofter || 0,
          nasal_crisp: request.effects?.nasalCrisp || 0,
          spacious_echo: request.effects?.spaciousEcho || false,
          lofi_telephone: request.effects?.lofiTelephone || false
        },
        audio_setting: {},
        er_weights: []
      },
      msg_id: util.uuid()
    };

    logger.info(`TTS Request: text="${request.text.substring(0, 50)}...", voice=${request.voiceId}`);

    ws.send(JSON.stringify(ttsRequest));

    ws.on('message', (rawData) => {
      try {
        const data = JSON.parse(rawData.toString());

        // 心跳响应
        if (data.method === 'Heartbeat') {
          ws.send(JSON.stringify({
            method: 'Heartbeat',
            msg_id: data.msg_id,
            timestamp: util.timestamp()
          }));
          return;
        }

        // 检查错误
        if (data.base_resp && data.base_resp.status_code !== 0) {
          logger.error('TTS Error:', data.base_resp.status_msg);
          ws.close();
          if (!resolved) {
            resolved = true;
            reject(new Error(data.base_resp.status_msg || 'TTS generation failed'));
          }
          return;
        }

        // 处理音频数据
        if (data.data?.audio) {
          const audioBuffer = Buffer.from(data.data.audio, 'base64');
          audioChunks.push(audioBuffer);
          logger.debug(`Received audio chunk: ${audioBuffer.length} bytes`);
        }

        // 检查是否结束 (status=2 表示完成)
        if (data.data?.status === 2) {
          logger.success('TTS generation completed');
          ws.close();
          if (!resolved) {
            resolved = true;
            resolve({
              audioData: Buffer.concat(audioChunks),
              status: 2
            });
          }
        }
      } catch (err) {
        logger.error('Failed to parse TTS response:', err);
      }
    });

    ws.on('error', (err) => {
      if (!resolved) {
        resolved = true;
        reject(err);
      }
    });

    ws.on('close', () => {
      if (!resolved) {
        resolved = true;
        if (audioChunks.length > 0) {
          resolve({
            audioData: Buffer.concat(audioChunks),
            status: 2
          });
        } else {
          reject(new Error('WebSocket closed without audio data'));
        }
      }
    });

    // 超时处理
    setTimeout(() => {
      if (!resolved) {
        resolved = true;
        ws.close();
        if (audioChunks.length > 0) {
          resolve({
            audioData: Buffer.concat(audioChunks),
            status: 2
          });
        } else {
          reject(new Error('TTS generation timeout'));
        }
      }
    }, 60000);
  });
}

/**
 * 流式生成语音
 */
export async function createSpeechStream(
  request: TTSRequest,
  auth: AuthInfo
): Promise<PassThrough> {
  const deviceInfo = await core.acquireDeviceInfo(auth);
  const wsPath = '/v1/api/audio/stream';

  const ws = await core.createWebSocket(wsPath, auth, deviceInfo);
  const stream = new PassThrough();

  // 构建TTS请求
  const ttsRequest = {
    payload: {
      model: request.model || 'speech-2.6-hd',
      text: request.text,
      stream: true,
      language_boost: request.languageBoost || 'Chinese (Mandarin)',
      voice_setting: {
        speed: request.speed || 1,
        vol: request.volume || 1,
        pitch: request.pitch || 0,
        voice_id: request.voiceId || '279479307768027'
      },
      effects: {
        deepen_lighten: request.effects?.deepenLighten || 0,
        stronger_softer: request.effects?.strongerSofter || 0,
        nasal_crisp: request.effects?.nasalCrisp || 0,
        spacious_echo: request.effects?.spaciousEcho || false,
        lofi_telephone: request.effects?.lofiTelephone || false
      },
      audio_setting: {},
      er_weights: []
    },
    msg_id: util.uuid()
  };

  ws.send(JSON.stringify(ttsRequest));

  ws.on('message', (rawData) => {
    try {
      const data = JSON.parse(rawData.toString());

      if (data.method === 'Heartbeat') {
        ws.send(JSON.stringify({
          method: 'Heartbeat',
          msg_id: data.msg_id,
          timestamp: util.timestamp()
        }));
        return;
      }

      if (data.base_resp && data.base_resp.status_code !== 0) {
        stream.destroy(new Error(data.base_resp.status_msg));
        ws.close();
        return;
      }

      if (data.data?.audio) {
        const audioBuffer = Buffer.from(data.data.audio, 'base64');
        stream.write(audioBuffer);
      }

      if (data.data?.status === 2) {
        stream.end();
        ws.close();
      }
    } catch (err) {
      logger.error('Stream error:', err);
    }
  });

  ws.on('error', (err) => stream.destroy(err));
  ws.on('close', () => stream.end());

  return stream;
}

export default {
  createSpeech,
  createSpeechStream
};
