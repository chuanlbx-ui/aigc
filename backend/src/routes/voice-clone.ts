/**
 * 声音克隆 API 路由
 */

import { Router } from 'express';
import { PrismaClient } from '@prisma/client';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { requireAuth } from '../middleware/auth.js';

const prisma = new PrismaClient();
export const voiceCloneRouter = Router();

// 文件上传配置
const VOICE_UPLOADS_DIR = './uploads/voice-references';
if (!fs.existsSync(VOICE_UPLOADS_DIR)) {
  fs.mkdirSync(VOICE_UPLOADS_DIR, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, VOICE_UPLOADS_DIR),
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, `ref-${Date.now()}${ext}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 50 * 1024 * 1024 }, // 50MB
  fileFilter: (_req, file, cb) => {
    const allowedTypes = ['audio/mpeg', 'audio/wav', 'audio/mp3', 'audio/ogg', 'audio/m4a'];
    if (allowedTypes.includes(file.mimetype) || file.originalname.match(/\.(mp3|wav|ogg|m4a)$/i)) {
      cb(null, true);
    } else {
      cb(new Error('只支持 MP3、WAV、OGG、M4A 格式'));
    }
  },
});

// 需要登录
voiceCloneRouter.use(requireAuth);

// 获取克隆声音列表
voiceCloneRouter.get('/', async (req, res) => {
  try {
    const voices = await prisma.clonedVoice.findMany({
      where: { userId: req.user!.id },
      orderBy: { createdAt: 'desc' },
    });
    res.json({ voices });
  } catch (error: any) {
    res.status(500).json({ error: error.message || '获取列表失败' });
  }
});

// 获取单个克隆声音
voiceCloneRouter.get('/:id', async (req, res) => {
  try {
    const voice = await prisma.clonedVoice.findFirst({
      where: { id: req.params.id, userId: req.user!.id },
    });
    if (!voice) {
      return res.status(404).json({ error: '声音不存在' });
    }
    res.json(voice);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// 创建克隆声音
voiceCloneRouter.post('/', upload.single('audio'), async (req, res) => {
  try {
    const { name, provider, referenceText } = req.body;
    const file = req.file;

    if (!file) {
      return res.status(400).json({ error: '请上传参考音频' });
    }
    if (!name) {
      return res.status(400).json({ error: '请输入声音名称' });
    }
    if (!provider || !['fish-speech', 'elevenlabs'].includes(provider)) {
      return res.status(400).json({ error: '请选择有效的 TTS 引擎' });
    }

    // 创建记录
    const voice = await prisma.clonedVoice.create({
      data: {
        name,
        provider,
        referenceAudio: file.path,
        referenceText,
        status: 'pending',
        userId: req.user!.id,
      },
    });

    // 异步处理克隆（后台任务）
    processVoiceClone(voice.id).catch(console.error);

    res.json(voice);
  } catch (error: any) {
    res.status(500).json({ error: error.message || '创建失败' });
  }
});

// 删除克隆声音
voiceCloneRouter.delete('/:id', async (req, res) => {
  try {
    const voice = await prisma.clonedVoice.findFirst({
      where: { id: req.params.id, userId: req.user!.id },
    });
    if (!voice) {
      return res.status(404).json({ error: '声音不存在' });
    }

    // 删除参考音频文件
    if (fs.existsSync(voice.referenceAudio)) {
      fs.unlinkSync(voice.referenceAudio);
    }

    await prisma.clonedVoice.delete({ where: { id: req.params.id } });
    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ error: error.message || '删除失败' });
  }
});

// 试听克隆声音
voiceCloneRouter.post('/:id/preview', async (req, res) => {
  try {
    const { text } = req.body;
    const voice = await prisma.clonedVoice.findFirst({
      where: { id: req.params.id, userId: req.user!.id },
    });

    if (!voice) {
      return res.status(404).json({ error: '声音不存在' });
    }
    if (voice.status !== 'ready') {
      return res.status(400).json({ error: '声音尚未准备就绪' });
    }

    const previewText = text || '你好，这是克隆声音的试听效果。';
    const previewPath = await generatePreview(voice, previewText);

    res.json({ previewUrl: `/api/voice-clone/audio/${path.basename(previewPath)}` });
  } catch (error: any) {
    res.status(500).json({ error: error.message || '生成试听失败' });
  }
});

// 获取音频文件
voiceCloneRouter.get('/audio/:filename', (req, res) => {
  const filePath = path.join(VOICE_UPLOADS_DIR, req.params.filename);
  if (!fs.existsSync(filePath)) {
    return res.status(404).json({ error: '文件不存在' });
  }
  res.sendFile(path.resolve(filePath));
});

// 后台处理声音克隆
async function processVoiceClone(voiceId: string) {
  const voice = await prisma.clonedVoice.findUnique({ where: { id: voiceId } });
  if (!voice) return;

  await prisma.clonedVoice.update({
    where: { id: voiceId },
    data: { status: 'processing' },
  });

  try {
    let resultVoiceId: string | undefined;

    if (voice.provider === 'fish-speech') {
      const fishPath = ['..', '..', '..', '..', 'workflow', 'tts', 'fish-speech.js'].join('/');
      const { FishSpeechClient } = await import(/* @vite-ignore */ fishPath);
      const client = new FishSpeechClient();
      const result = await client.createClonedVoice(
        voice.name,
        voice.referenceAudio,
        voice.referenceText || undefined
      );
      resultVoiceId = result.voiceId;
    } else if (voice.provider === 'elevenlabs') {
      const apiKey = process.env.ELEVENLABS_API_KEY;
      if (!apiKey) throw new Error('ElevenLabs API Key 未配置');

      const elPath = ['..', '..', '..', '..', 'workflow', 'tts', 'elevenlabs.js'].join('/');
      const { ElevenLabsClient } = await import(/* @vite-ignore */ elPath);
      const client = new ElevenLabsClient(apiKey);
      const result = await client.createClonedVoice(voice.name, [voice.referenceAudio]);
      resultVoiceId = result.voiceId;
    }

    await prisma.clonedVoice.update({
      where: { id: voiceId },
      data: { status: 'ready', voiceId: resultVoiceId },
    });
  } catch (error: any) {
    await prisma.clonedVoice.update({
      where: { id: voiceId },
      data: { status: 'failed', errorMessage: error.message },
    });
  }
}

// 生成试听音频
async function generatePreview(voice: any, text: string): Promise<string> {
  const outputPath = path.join(VOICE_UPLOADS_DIR, `preview-${voice.id}-${Date.now()}.mp3`);

  if (voice.provider === 'fish-speech') {
    throw new Error('Fish Speech 声音克隆功能暂未实现');
  } else if (voice.provider === 'elevenlabs') {
    throw new Error('ElevenLabs 声音克隆功能暂未实现');
  }

  return outputPath;
}
