import Router from 'koa-router';
import ttsRouter from './tts';
import voiceRouter from './voice';
import historyRouter from './history';
import cloneRouter from './clone';

const router = new Router();

// 健康检查
router.get('/ping', (ctx) => {
  ctx.body = { status: 'ok', timestamp: Date.now() };
});

// 欢迎页面
router.get('/', (ctx) => {
  ctx.body = {
    name: 'MiniMax TTS API',
    version: '1.0.0',
    endpoints: {
      tts: {
        'POST /api/tts': 'Generate speech from text',
        'POST /api/tts/stream': 'Stream speech generation'
      },
      voice: {
        'GET /api/voices': 'Get all voices',
        'GET /api/voices/official': 'Get official voices',
        'GET /api/voices/cloned': 'Get cloned voices',
        'GET /api/voices/:id': 'Get voice detail'
      },
      history: {
        'GET /api/history': 'Get history list',
        'GET /api/history/:id': 'Get audio detail',
        'DELETE /api/history/:id': 'Delete audio',
        'GET /api/history/:id/download': 'Download audio file'
      },
      clone: {
        'POST /api/clone': 'Create clone voice',
        'GET /api/clone/:id/status': 'Get clone status',
        'DELETE /api/clone/:id': 'Delete clone voice',
        'PUT /api/clone/:id': 'Update clone voice name'
      }
    }
  };
});

// 注册子路由
router.use('/api', ttsRouter.routes(), ttsRouter.allowedMethods());
router.use('/api', voiceRouter.routes(), voiceRouter.allowedMethods());
router.use('/api', historyRouter.routes(), historyRouter.allowedMethods());
router.use('/api', cloneRouter.routes(), cloneRouter.allowedMethods());

export default router;
