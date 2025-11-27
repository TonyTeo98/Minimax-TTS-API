import Router from 'koa-router';
import cloneController from '../controllers/clone';
import core from '../controllers/core';
import logger from '../../lib/logger';

const router = new Router();

/**
 * POST /api/clone
 * 创建克隆音色
 */
router.post('/clone', async (ctx) => {
  const authorization = ctx.headers.authorization as string;

  if (!authorization) {
    ctx.status = 401;
    ctx.body = { error: 'Authorization header required' };
    return;
  }

  const auth = core.parseAuth(authorization);
  const body = ctx.request.body as any;

  // 检查必要参数
  if (!body.name) {
    ctx.status = 400;
    ctx.body = { error: 'name is required' };
    return;
  }

  // 支持两种方式：base64音频数据 或 音频URL
  let audioBuffer: Buffer;

  if (body.audio_base64) {
    // Base64音频数据
    audioBuffer = Buffer.from(body.audio_base64, 'base64');
  } else if (body.audio_url) {
    // 从URL下载音频
    const axios = require('axios');
    try {
      const response = await axios.get(body.audio_url, {
        responseType: 'arraybuffer',
        timeout: 30000
      });
      audioBuffer = Buffer.from(response.data);
    } catch (err: any) {
      ctx.status = 400;
      ctx.body = { error: 'Failed to download audio from URL: ' + err.message };
      return;
    }
  } else {
    ctx.status = 400;
    ctx.body = { error: 'audio_base64 or audio_url is required' };
    return;
  }

  try {
    const result = await cloneController.createCloneVoice({
      name: body.name,
      audioFile: audioBuffer,
      audioFileName: body.file_name || 'audio.mp3',
      description: body.description
    }, auth);

    ctx.body = {
      success: true,
      data: result
    };
  } catch (err: any) {
    logger.error('Create clone voice error:', err.message);
    ctx.status = 500;
    ctx.body = { error: err.message };
  }
});

/**
 * GET /api/clone/:id/status
 * 获取克隆任务状态
 */
router.get('/clone/:id/status', async (ctx) => {
  const authorization = ctx.headers.authorization as string;

  if (!authorization) {
    ctx.status = 401;
    ctx.body = { error: 'Authorization header required' };
    return;
  }

  const auth = core.parseAuth(authorization);
  const voiceId = ctx.params.id;

  try {
    const result = await cloneController.getCloneStatus(voiceId, auth);
    ctx.body = {
      success: true,
      data: result
    };
  } catch (err: any) {
    logger.error('Get clone status error:', err.message);
    ctx.status = 500;
    ctx.body = { error: err.message };
  }
});

/**
 * DELETE /api/clone/:id
 * 删除克隆音色
 */
router.delete('/clone/:id', async (ctx) => {
  const authorization = ctx.headers.authorization as string;

  if (!authorization) {
    ctx.status = 401;
    ctx.body = { error: 'Authorization header required' };
    return;
  }

  const auth = core.parseAuth(authorization);
  const voiceId = ctx.params.id;

  try {
    const success = await cloneController.deleteCloneVoice(voiceId, auth);

    if (success) {
      ctx.body = {
        success: true,
        message: 'Clone voice deleted successfully'
      };
    } else {
      ctx.status = 500;
      ctx.body = { error: 'Failed to delete clone voice' };
    }
  } catch (err: any) {
    logger.error('Delete clone voice error:', err.message);
    ctx.status = 500;
    ctx.body = { error: err.message };
  }
});

/**
 * PUT /api/clone/:id
 * 更新克隆音色名称
 */
router.put('/clone/:id', async (ctx) => {
  const authorization = ctx.headers.authorization as string;

  if (!authorization) {
    ctx.status = 401;
    ctx.body = { error: 'Authorization header required' };
    return;
  }

  const auth = core.parseAuth(authorization);
  const voiceId = ctx.params.id;
  const body = ctx.request.body as any;

  if (!body.name) {
    ctx.status = 400;
    ctx.body = { error: 'name is required' };
    return;
  }

  try {
    const success = await cloneController.updateCloneVoice(voiceId, body.name, auth);

    if (success) {
      ctx.body = {
        success: true,
        message: 'Clone voice updated successfully'
      };
    } else {
      ctx.status = 500;
      ctx.body = { error: 'Failed to update clone voice' };
    }
  } catch (err: any) {
    logger.error('Update clone voice error:', err.message);
    ctx.status = 500;
    ctx.body = { error: err.message };
  }
});

export default router;
