import Router from 'koa-router';
import ttsController from '../controllers/tts';
import core from '../controllers/core';
import logger from '../../lib/logger';

const router = new Router();

/**
 * POST /api/tts
 * 生成语音
 */
router.post('/tts', async (ctx) => {
  const authorization = ctx.headers.authorization as string;

  if (!authorization) {
    ctx.status = 401;
    ctx.body = { error: 'Authorization header required' };
    return;
  }

  const auth = core.parseAuth(authorization);
  const body = ctx.request.body as any;

  if (!body.text) {
    ctx.status = 400;
    ctx.body = { error: 'text is required' };
    return;
  }

  try {
    const result = await ttsController.createSpeech({
      text: body.text,
      voiceId: body.voice_id || body.voiceId,
      model: body.model,
      speed: body.speed,
      volume: body.volume || body.vol,
      pitch: body.pitch,
      languageBoost: body.language_boost || body.languageBoost,
      effects: body.effects
    }, auth);

    // 返回音频文件
    ctx.type = 'audio/mpeg';
    ctx.body = result.audioData;
  } catch (err: any) {
    logger.error('TTS Error:', err.message);
    ctx.status = 500;
    ctx.body = { error: err.message };
  }
});

/**
 * POST /api/tts/stream
 * 流式生成语音
 */
router.post('/tts/stream', async (ctx) => {
  const authorization = ctx.headers.authorization as string;

  if (!authorization) {
    ctx.status = 401;
    ctx.body = { error: 'Authorization header required' };
    return;
  }

  const auth = core.parseAuth(authorization);
  const body = ctx.request.body as any;

  if (!body.text) {
    ctx.status = 400;
    ctx.body = { error: 'text is required' };
    return;
  }

  try {
    const stream = await ttsController.createSpeechStream({
      text: body.text,
      voiceId: body.voice_id || body.voiceId,
      model: body.model,
      speed: body.speed,
      volume: body.volume || body.vol,
      pitch: body.pitch,
      languageBoost: body.language_boost || body.languageBoost,
      effects: body.effects
    }, auth);

    ctx.type = 'audio/mpeg';
    ctx.body = stream;
  } catch (err: any) {
    logger.error('TTS Stream Error:', err.message);
    ctx.status = 500;
    ctx.body = { error: err.message };
  }
});

/**
 * POST /api/tts/openai
 * OpenAI兼容接口
 */
router.post('/tts/openai', async (ctx) => {
  const authorization = ctx.headers.authorization as string;

  if (!authorization) {
    ctx.status = 401;
    ctx.body = { error: 'Authorization header required' };
    return;
  }

  const auth = core.parseAuth(authorization);
  const body = ctx.request.body as any;

  // OpenAI TTS格式: { model, input, voice, speed }
  const text = body.input;
  const voice = body.voice;
  const speed = body.speed || 1;

  if (!text) {
    ctx.status = 400;
    ctx.body = { error: 'input is required' };
    return;
  }

  try {
    const result = await ttsController.createSpeech({
      text,
      voiceId: voice,
      speed,
      model: body.model === 'tts-1-hd' ? 'speech-2.6-hd' : 'speech-2.6-hd'
    }, auth);

    ctx.type = 'audio/mpeg';
    ctx.body = result.audioData;
  } catch (err: any) {
    logger.error('OpenAI TTS Error:', err.message);
    ctx.status = 500;
    ctx.body = { error: err.message };
  }
});

export default router;
