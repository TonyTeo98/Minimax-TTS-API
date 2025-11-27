import Router from 'koa-router';
import historyController from '../controllers/history';
import core from '../controllers/core';
import logger from '../../lib/logger';

const router = new Router();

/**
 * GET /api/history
 * 获取历史记录列表
 */
router.get('/history', async (ctx) => {
  const authorization = ctx.headers.authorization as string;

  if (!authorization) {
    ctx.status = 401;
    ctx.body = { error: 'Authorization header required' };
    return;
  }

  const auth = core.parseAuth(authorization);
  const page = parseInt(ctx.query.page as string) || 1;
  const pageSize = parseInt(ctx.query.page_size as string) || 20;

  try {
    const result = await historyController.getHistoryList(auth, page, pageSize);
    ctx.body = {
      success: true,
      data: result
    };
  } catch (err: any) {
    logger.error('Get history error:', err.message);
    ctx.status = 500;
    ctx.body = { error: err.message };
  }
});

/**
 * GET /api/history/:id
 * 获取音频详情
 */
router.get('/history/:id', async (ctx) => {
  const authorization = ctx.headers.authorization as string;

  if (!authorization) {
    ctx.status = 401;
    ctx.body = { error: 'Authorization header required' };
    return;
  }

  const auth = core.parseAuth(authorization);
  const audioId = ctx.params.id;

  try {
    const result = await historyController.getAudioDetail(audioId, auth);

    if (result) {
      ctx.body = {
        success: true,
        data: result
      };
    } else {
      ctx.status = 404;
      ctx.body = { error: 'Audio not found' };
    }
  } catch (err: any) {
    logger.error('Get audio detail error:', err.message);
    ctx.status = 500;
    ctx.body = { error: err.message };
  }
});

/**
 * DELETE /api/history/:id
 * 删除音频记录
 */
router.delete('/history/:id', async (ctx) => {
  const authorization = ctx.headers.authorization as string;

  if (!authorization) {
    ctx.status = 401;
    ctx.body = { error: 'Authorization header required' };
    return;
  }

  const auth = core.parseAuth(authorization);
  const audioId = ctx.params.id;

  try {
    const success = await historyController.deleteAudio(audioId, auth);

    if (success) {
      ctx.body = {
        success: true,
        message: 'Audio deleted successfully'
      };
    } else {
      ctx.status = 500;
      ctx.body = { error: 'Failed to delete audio' };
    }
  } catch (err: any) {
    logger.error('Delete audio error:', err.message);
    ctx.status = 500;
    ctx.body = { error: err.message };
  }
});

/**
 * GET /api/history/:id/download
 * 下载音频文件
 */
router.get('/history/:id/download', async (ctx) => {
  const authorization = ctx.headers.authorization as string;

  if (!authorization) {
    ctx.status = 401;
    ctx.body = { error: 'Authorization header required' };
    return;
  }

  const auth = core.parseAuth(authorization);
  const audioId = ctx.params.id;

  try {
    // 先获取音频详情
    const detail = await historyController.getAudioDetail(audioId, auth);

    if (!detail || !detail.audioUrl) {
      ctx.status = 404;
      ctx.body = { error: 'Audio not found or URL not available' };
      return;
    }

    // 下载音频
    const audioBuffer = await historyController.downloadAudio(detail.audioUrl);

    ctx.type = 'audio/mpeg';
    ctx.set('Content-Disposition', `attachment; filename="${audioId}.mp3"`);
    ctx.body = audioBuffer;
  } catch (err: any) {
    logger.error('Download audio error:', err.message);
    ctx.status = 500;
    ctx.body = { error: err.message };
  }
});

export default router;
