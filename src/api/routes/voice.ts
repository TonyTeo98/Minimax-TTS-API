import Router from 'koa-router';
import voiceController from '../controllers/voice';
import core from '../controllers/core';
import logger from '../../lib/logger';

const router = new Router();

/**
 * GET /api/voices
 * 获取所有音色列表
 */
router.get('/voices', async (ctx) => {
  const authorization = ctx.headers.authorization as string;

  if (!authorization) {
    ctx.status = 401;
    ctx.body = { error: 'Authorization header required' };
    return;
  }

  const auth = core.parseAuth(authorization);

  try {
    const result = await voiceController.getAllVoices(auth);
    ctx.body = {
      success: true,
      data: result
    };
  } catch (err: any) {
    logger.error('Get voices error:', err.message);
    // 返回预设音色列表作为备选
    ctx.body = {
      success: true,
      data: {
        voices: voiceController.PRESET_VOICES,
        total: voiceController.PRESET_VOICES.length
      },
      warning: 'Using preset voices due to API error'
    };
  }
});

/**
 * GET /api/voices/official
 * 获取官方音色列表
 */
router.get('/voices/official', async (ctx) => {
  const authorization = ctx.headers.authorization as string;

  if (!authorization) {
    ctx.status = 401;
    ctx.body = { error: 'Authorization header required' };
    return;
  }

  const auth = core.parseAuth(authorization);

  try {
    const result = await voiceController.getOfficialVoices(auth);
    ctx.body = {
      success: true,
      data: result
    };
  } catch (err: any) {
    logger.error('Get official voices error:', err.message);
    ctx.status = 500;
    ctx.body = { error: err.message };
  }
});

/**
 * GET /api/voices/cloned
 * 获取克隆音色列表
 */
router.get('/voices/cloned', async (ctx) => {
  const authorization = ctx.headers.authorization as string;

  if (!authorization) {
    ctx.status = 401;
    ctx.body = { error: 'Authorization header required' };
    return;
  }

  const auth = core.parseAuth(authorization);

  try {
    const result = await voiceController.getClonedVoices(auth);
    ctx.body = {
      success: true,
      data: result
    };
  } catch (err: any) {
    logger.error('Get cloned voices error:', err.message);
    ctx.status = 500;
    ctx.body = { error: err.message };
  }
});

/**
 * GET /api/voices/:id
 * 获取音色详情
 */
router.get('/voices/:id', async (ctx) => {
  const authorization = ctx.headers.authorization as string;

  if (!authorization) {
    ctx.status = 401;
    ctx.body = { error: 'Authorization header required' };
    return;
  }

  const auth = core.parseAuth(authorization);
  const voiceId = ctx.params.id;

  try {
    const result = await voiceController.getVoiceDetail(voiceId, auth);

    if (result) {
      ctx.body = {
        success: true,
        data: result
      };
    } else {
      ctx.status = 404;
      ctx.body = { error: 'Voice not found' };
    }
  } catch (err: any) {
    logger.error('Get voice detail error:', err.message);
    ctx.status = 500;
    ctx.body = { error: err.message };
  }
});

export default router;
