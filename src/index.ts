import express from 'express';
import cors from 'cors';
import config from './lib/config';
import logger from './lib/logger';

// Controllers
import ttsController from './api/controllers/tts';
import voiceController from './api/controllers/voice';
import historyController from './api/controllers/history';
import cloneController from './api/controllers/clone';
import core from './api/controllers/core';

const app = express();

// Middleware
app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Request logging
app.use((req, res, next) => {
  const start = Date.now();
  res.on('finish', () => {
    const ms = Date.now() - start;
    logger.info(`${req.method} ${req.url} - ${res.statusCode} - ${ms}ms`);
  });
  next();
});

// Health check
app.get('/ping', (req, res) => {
  res.json({ status: 'ok', timestamp: Date.now() });
});

// Welcome page
app.get('/', (req, res) => {
  res.json({
    name: 'MiniMax TTS API',
    version: '1.0.0',
    endpoints: {
      tts: {
        'POST /api/tts': 'Generate speech from text',
        'POST /api/tts/stream': 'Stream speech generation',
        'POST /api/tts/openai': 'OpenAI compatible endpoint'
      },
      voice: {
        'GET /api/voices': 'Get all voices',
        'GET /api/voices/official': 'Get official voices',
        'GET /api/voices/cloned': 'Get cloned voices'
      },
      history: {
        'GET /api/history': 'Get history list',
        'GET /api/history/:id': 'Get audio detail',
        'GET /api/history/:id/download': 'Download audio file'
      },
      clone: {
        'POST /api/clone': 'Create clone voice',
        'GET /api/clone/:id/status': 'Get clone status'
      }
    }
  });
});

// Auth middleware
const authMiddleware = (req: express.Request, res: express.Response, next: express.NextFunction) => {
  const authorization = req.headers.authorization as string;
  if (!authorization) {
    res.status(401).json({ error: 'Authorization header required' });
    return;
  }
  (req as any).auth = core.parseAuth(authorization);
  next();
};

// ==================== TTS Routes ====================

// Generate speech
app.post('/api/tts', authMiddleware, async (req, res) => {
  const auth = (req as any).auth;
  const body = req.body;

  if (!body.text) {
    res.status(400).json({ error: 'text is required' });
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

    res.type('audio/mpeg');
    res.send(result.audioData);
  } catch (err: any) {
    logger.error('TTS Error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// Stream speech
app.post('/api/tts/stream', authMiddleware, async (req, res) => {
  const auth = (req as any).auth;
  const body = req.body;

  if (!body.text) {
    res.status(400).json({ error: 'text is required' });
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

    res.type('audio/mpeg');
    stream.pipe(res);
  } catch (err: any) {
    logger.error('TTS Stream Error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// OpenAI compatible endpoint
app.post('/api/tts/openai', authMiddleware, async (req, res) => {
  const auth = (req as any).auth;
  const body = req.body;

  const text = body.input;
  if (!text) {
    res.status(400).json({ error: 'input is required' });
    return;
  }

  try {
    const result = await ttsController.createSpeech({
      text,
      voiceId: body.voice,
      speed: body.speed || 1,
      model: body.model === 'tts-1-hd' ? 'speech-2.6-hd' : 'speech-2.6-hd'
    }, auth);

    res.type('audio/mpeg');
    res.send(result.audioData);
  } catch (err: any) {
    logger.error('OpenAI TTS Error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// ==================== Voice Routes ====================

// Get all voices
app.get('/api/voices', authMiddleware, async (req, res) => {
  const auth = (req as any).auth;
  try {
    const result = await voiceController.getAllVoices(auth);
    res.json({ success: true, data: result });
  } catch (err: any) {
    res.json({
      success: true,
      data: { voices: voiceController.PRESET_VOICES, total: voiceController.PRESET_VOICES.length },
      warning: 'Using preset voices due to API error'
    });
  }
});

// Get official voices
app.get('/api/voices/official', authMiddleware, async (req, res) => {
  const auth = (req as any).auth;
  try {
    const result = await voiceController.getOfficialVoices(auth);
    res.json({ success: true, data: result });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Get cloned voices
app.get('/api/voices/cloned', authMiddleware, async (req, res) => {
  const auth = (req as any).auth;
  try {
    const result = await voiceController.getClonedVoices(auth);
    res.json({ success: true, data: result });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ==================== History Routes ====================

// Get history list
app.get('/api/history', authMiddleware, async (req, res) => {
  const auth = (req as any).auth;
  const page = parseInt(req.query.page as string) || 1;
  const pageSize = parseInt(req.query.page_size as string) || 20;

  try {
    const result = await historyController.getHistoryList(auth, page, pageSize);
    res.json({ success: true, data: result });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Get audio detail
app.get('/api/history/:id', authMiddleware, async (req, res) => {
  const auth = (req as any).auth;
  const audioId = req.params.id;

  try {
    const result = await historyController.getAudioDetail(audioId, auth);
    if (result) {
      res.json({ success: true, data: result });
    } else {
      res.status(404).json({ error: 'Audio not found' });
    }
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Delete audio
app.delete('/api/history/:id', authMiddleware, async (req, res) => {
  const auth = (req as any).auth;
  const audioId = req.params.id;

  try {
    const success = await historyController.deleteAudio(audioId, auth);
    if (success) {
      res.json({ success: true, message: 'Audio deleted successfully' });
    } else {
      res.status(500).json({ error: 'Failed to delete audio' });
    }
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Download audio
app.get('/api/history/:id/download', authMiddleware, async (req, res) => {
  const auth = (req as any).auth;
  const audioId = req.params.id;

  try {
    const detail = await historyController.getAudioDetail(audioId, auth);
    if (!detail || !detail.audioUrl) {
      res.status(404).json({ error: 'Audio not found' });
      return;
    }

    const audioBuffer = await historyController.downloadAudio(detail.audioUrl);
    res.type('audio/mpeg');
    res.set('Content-Disposition', `attachment; filename="${audioId}.mp3"`);
    res.send(audioBuffer);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ==================== Clone Routes ====================

// Create clone voice
app.post('/api/clone', authMiddleware, async (req, res) => {
  const auth = (req as any).auth;
  const body = req.body;

  if (!body.name) {
    res.status(400).json({ error: 'name is required' });
    return;
  }

  let audioBuffer: Buffer;
  if (body.audio_base64) {
    audioBuffer = Buffer.from(body.audio_base64, 'base64');
  } else if (body.audio_url) {
    const axios = require('axios');
    try {
      const response = await axios.get(body.audio_url, { responseType: 'arraybuffer', timeout: 30000 });
      audioBuffer = Buffer.from(response.data);
    } catch (err: any) {
      res.status(400).json({ error: 'Failed to download audio: ' + err.message });
      return;
    }
  } else {
    res.status(400).json({ error: 'audio_base64 or audio_url is required' });
    return;
  }

  try {
    const result = await cloneController.createCloneVoice({
      name: body.name,
      audioFile: audioBuffer,
      audioFileName: body.file_name || 'audio.mp3',
      description: body.description
    }, auth);
    res.json({ success: true, data: result });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Get clone status
app.get('/api/clone/:id/status', authMiddleware, async (req, res) => {
  const auth = (req as any).auth;
  const voiceId = req.params.id;

  try {
    const result = await cloneController.getCloneStatus(voiceId, auth);
    res.json({ success: true, data: result });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Delete clone voice
app.delete('/api/clone/:id', authMiddleware, async (req, res) => {
  const auth = (req as any).auth;
  const voiceId = req.params.id;

  try {
    const success = await cloneController.deleteCloneVoice(voiceId, auth);
    if (success) {
      res.json({ success: true, message: 'Clone voice deleted' });
    } else {
      res.status(500).json({ error: 'Failed to delete clone voice' });
    }
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Start server
app.listen(config.port, config.host, () => {
  console.log(`
╔═══════════════════════════════════════════════════════════════╗
║                                                               ║
║   ███╗   ███╗██╗███╗   ██╗██╗███╗   ███╗ █████╗ ██╗  ██╗     ║
║   ████╗ ████║██║████╗  ██║██║████╗ ████║██╔══██╗╚██╗██╔╝     ║
║   ██╔████╔██║██║██╔██╗ ██║██║██╔████╔██║███████║ ╚███╔╝      ║
║   ██║╚██╔╝██║██║██║╚██╗██║██║██║╚██╔╝██║██╔══██║ ██╔██╗      ║
║   ██║ ╚═╝ ██║██║██║ ╚████║██║██║ ╚═╝ ██║██║  ██║██╔╝ ██╗     ║
║   ╚═╝     ╚═╝╚═╝╚═╝  ╚═══╝╚═╝╚═╝     ╚═╝╚═╝  ╚═╝╚═╝  ╚═╝     ║
║                                                               ║
║                    TTS API Server v1.0.0                      ║
║                                                               ║
╠═══════════════════════════════════════════════════════════════╣
║  Server running at: http://${config.host}:${config.port}                       ║
║                                                               ║
║  Endpoints:                                                   ║
║    POST /api/tts          - Generate speech                   ║
║    POST /api/tts/stream   - Stream speech                     ║
║    POST /api/tts/openai   - OpenAI compatible                 ║
║    GET  /api/voices       - List voices                       ║
║    GET  /api/history      - List history                      ║
║    POST /api/clone        - Clone voice                       ║
║                                                               ║
╚═══════════════════════════════════════════════════════════════╝
  `.cyan);
});

export default app;
