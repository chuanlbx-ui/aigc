import { Router } from 'express';
import { spawn } from 'child_process';
import path from 'path';
import fs from 'fs';
import { v4 as uuid } from 'uuid';
import { parseFile } from 'music-metadata';
import crypto from 'crypto';
import { PrismaClient } from '@prisma/client';
import WebSocket from 'ws';

const prisma = new PrismaClient();
export const ttsRouter = Router();

// 试听目录
const previewDir = './uploads/tts-preview';
if (!fs.existsSync(previewDir)) {
  fs.mkdirSync(previewDir, { recursive: true });
}

// 文章朗读音频缓存目录
const articleAudioDir = './cache/article-audio';
if (!fs.existsSync(articleAudioDir)) {
  fs.mkdirSync(articleAudioDir, { recursive: true });
}

// 获取可用的 TTS 引擎列表
ttsRouter.get('/providers', async (_req, res) => {
  const providers = [
    {
      id: 'edge',
      name: 'Edge TTS',
      category: 'free',
      description: '微软免费语音合成，34种中文音色',
      available: true,
      supportsEmotion: false,
      supportsCloning: false,
    },
  ];

  // Fish Speech
  if (process.env.FISH_SPEECH_URL) {
    providers.push({
      id: 'fish-speech',
      name: 'Fish Speech',
      category: 'premium',
      description: '开源高品质语音，支持声音克隆',
      available: true,
      supportsEmotion: true,
      supportsCloning: true,
    });
  }

  // ElevenLabs
  if (process.env.ELEVENLABS_API_KEY) {
    providers.push({
      id: 'elevenlabs',
      name: 'ElevenLabs',
      category: 'premium',
      description: '商业级高品质语音，情感丰富',
      available: true,
      supportsEmotion: true,
      supportsCloning: true,
    });
  }

  // OpenAI
  if (process.env.OPENAI_API_KEY) {
    providers.push({
      id: 'openai',
      name: 'OpenAI TTS',
      category: 'premium',
      description: 'OpenAI 语音合成',
      available: true,
      supportsEmotion: false,
      supportsCloning: false,
    });
  }

  // Azure
  if (process.env.AZURE_TTS_KEY && process.env.AZURE_TTS_REGION) {
    providers.push({
      id: 'azure',
      name: 'Azure TTS',
      category: 'premium',
      description: '微软 Azure 语音服务',
      available: true,
      supportsEmotion: true,
      supportsCloning: false,
    });
  }

  // 从数据库读取科大讯飞配置
  try {
    const xfyunConfig = await prisma.mediaServiceConfig.findFirst({
      where: { serviceType: 'tts', provider: 'xfyun', isEnabled: true },
    });
    if (xfyunConfig) {
      const config = JSON.parse(xfyunConfig.config || '{}');
      if (xfyunConfig.apiKey && config.appId && config.apiSecret) {
        providers.push({
          id: 'xfyun',
          name: '科大讯飞',
          category: 'premium',
          description: '国产高品质语音合成',
          available: true,
          supportsEmotion: false,
          supportsCloning: false,
        });
      }
    }

    // 从数据库读取 CosyVoice 配置
    const cosyConfig = await prisma.mediaServiceConfig.findFirst({
      where: { serviceType: 'tts', provider: 'cosyvoice', isEnabled: true },
    });
    if (cosyConfig) {
      providers.push({
        id: 'cosyvoice',
        name: 'CosyVoice',
        category: 'premium',
        description: '阿里开源语音合成',
        available: true,
        supportsEmotion: false,
        supportsCloning: true,
      });
    }
  } catch (e) {
    // 忽略数据库错误
  }

  res.json({ providers });
});

// 获取指定引擎的音色列表
ttsRouter.get('/voices/:provider', async (req, res) => {
  const { provider } = req.params;

  try {
    let voices: any[] = [];

    if (provider === 'edge') {
      voices = getEdgeVoices();
    } else if (provider === 'fish-speech') {
      voices = getFishSpeechVoices();
    } else if (provider === 'elevenlabs') {
      voices = await getElevenLabsVoices();
    } else if (provider === 'openai') {
      voices = getOpenAIVoices();
    } else if (provider === 'azure') {
      voices = getAzureVoices();
    } else if (provider === 'xfyun') {
      voices = getXfyunVoices();
    } else if (provider === 'cosyvoice') {
      voices = getCosyVoiceVoices();
    } else {
      return res.status(400).json({ error: '不支持的引擎' });
    }

    res.json({ voices });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// 生成试听音频
ttsRouter.post('/preview', async (req, res) => {
  const { provider, voice, rate, emotion } = req.body;

  // 试听文本
  const previewText = '你好，这是一段语音试听示例，用于测试当前的语音和语速设置。';

  const filename = `${uuid()}.mp3`;
  const outputPath = path.join(previewDir, filename);

  try {
    if (provider === 'edge') {
      await generateEdgeTTS(previewText, outputPath, voice, rate);
    } else if (provider === 'fish-speech') {
      await generateFishSpeechTTS(previewText, outputPath, voice, rate, emotion);
    } else if (provider === 'elevenlabs') {
      await generateElevenLabsTTS(previewText, outputPath, voice, rate, emotion);
    } else if (provider === 'openai') {
      await generateOpenAITTS(previewText, outputPath, voice, rate);
    } else if (provider === 'xfyun') {
      await generateXfyunTTS(previewText, outputPath, voice, rate);
    } else if (provider === 'cosyvoice') {
      await generateCosyVoiceTTS(previewText, outputPath, voice, rate);
    } else {
      return res.status(400).json({ error: '暂不支持该TTS引擎的试听' });
    }

    // 返回音频文件ID
    res.json({ audioId: filename });
  } catch (error: any) {
    console.error('TTS试听生成失败:', error);
    res.status(500).json({ error: error.message || 'TTS生成失败' });
  }
});

// 获取试听音频文件
ttsRouter.get('/preview/:audioId', (req, res) => {
  const filePath = path.join(previewDir, req.params.audioId);
  if (!fs.existsSync(filePath)) {
    return res.status(404).json({ error: '音频不存在' });
  }

  // 获取文件信息
  const stat = fs.statSync(filePath);
  const fileSize = stat.size;
  const range = req.headers.range;

  // 设置正确的 Content-Type
  res.setHeader('Content-Type', 'audio/mpeg');
  res.setHeader('Accept-Ranges', 'bytes');

  if (range) {
    // 解析 Range 请求
    const parts = range.replace(/bytes=/, '').split('-');
    const start = parseInt(parts[0], 10);
    const end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1;

    // 验证 Range 是否有效
    if (start >= fileSize || end >= fileSize || start > end) {
      res.status(416).setHeader('Content-Range', `bytes */${fileSize}`);
      return res.end();
    }

    const chunkSize = (end - start) + 1;
    const fileStream = fs.createReadStream(filePath, { start, end });

    res.status(206);
    res.setHeader('Content-Range', `bytes ${start}-${end}/${fileSize}`);
    res.setHeader('Content-Length', chunkSize);

    fileStream.pipe(res);
  } else {
    // 完整文件响应
    res.setHeader('Content-Length', fileSize);
    fs.createReadStream(filePath).pipe(res);
  }
});

// 预估音频时长（生成TTS并返回时长）
ttsRouter.post('/estimate-duration', async (req, res) => {
  const { text, voice, rate } = req.body;

  if (!text || !text.trim()) {
    return res.json({ durationMs: 0, durationFormatted: '0:00' });
  }

  const filename = `estimate-${uuid()}.mp3`;
  const outputPath = path.join(previewDir, filename);

  try {
    await generateEdgeTTS(text, outputPath, voice || 'zh-CN-XiaoxiaoNeural', rate || 1.0);

    // 获取音频时长
    const metadata = await parseFile(outputPath);
    const durationMs = Math.round((metadata.format.duration || 0) * 1000);

    // 格式化时长
    const seconds = Math.floor(durationMs / 1000);
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    const durationFormatted = `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;

    // 清理临时文件
    try { fs.unlinkSync(outputPath); } catch {}

    res.json({ durationMs, durationFormatted });
  } catch (error: any) {
    // 清理临时文件
    try { fs.unlinkSync(outputPath); } catch {}
    console.error('预估时长失败:', error);
    res.status(500).json({ error: error.message || '预估失败' });
  }
});

// 清理文本中的特殊符号（用于TTS朗读）
function cleanTextForTTS(text: string): string {
  return text
    // 移除 Markdown 标记符号
    .replace(/#{1,6}\s*/g, '')           // 标题标记 # ## ###
    .replace(/\*\*([^*]+)\*\*/g, '$1')   // 粗体 **text**
    .replace(/\*([^*]+)\*/g, '$1')       // 斜体 *text*
    .replace(/__([^_]+)__/g, '$1')       // 粗体 __text__
    .replace(/_([^_]+)_/g, '$1')         // 斜体 _text_
    .replace(/~~([^~]+)~~/g, '$1')       // 删除线 ~~text~~
    .replace(/`([^`]+)`/g, '$1')         // 行内代码 `code`
    .replace(/```[\s\S]*?```/g, '')      // 代码块
    // 移除列表标记
    .replace(/^[\s]*[-*+]\s+/gm, '')     // 无序列表 - * +
    .replace(/^[\s]*\d+\.\s+/gm, '')     // 有序列表 1. 2.
    // 移除引用和分隔符
    .replace(/^>\s*/gm, '')              // 引用 >
    .replace(/^---+$/gm, '')             // 分隔线 ---
    .replace(/^===+$/gm, '')             // 分隔线 ===
    // 移除链接和图片语法，保留文字
    .replace(/!\[([^\]]*)\]\([^)]+\)/g, '$1')  // 图片 ![alt](url)
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')   // 链接 [text](url)
    // 移除其他特殊符号（不应被朗读的）
    .replace(/[\\|<>{}[\]]/g, '')        // 转义符和括号
    .replace(/&[a-zA-Z]+;/g, '')         // HTML实体 &nbsp;
    // 清理多余空白
    .replace(/\n{3,}/g, '\n\n')          // 多个换行合并
    .replace(/[ \t]+/g, ' ')             // 多个空格合并
    .trim();
}

// Edge TTS 生成
function generateEdgeTTS(
  text: string,
  outputPath: string,
  voice: string,
  rate: number
): Promise<void> {
  return new Promise((resolve, reject) => {
    // 清理文本中的特殊符号
    const cleanedText = cleanTextForTTS(text);

    // 检查清理后文本是否为空
    if (!cleanedText || cleanedText.trim().length === 0) {
      return reject(new Error('文本内容为空，无法生成语音'));
    }

    // 将文本写入临时文件，避免命令行特殊字符问题
    const tempTextFile = outputPath.replace('.mp3', '.txt');
    fs.writeFileSync(tempTextFile, cleanedText, 'utf-8');

    const args = [
      '-m', 'edge_tts',
      '--voice', voice,
      '--file', tempTextFile,
      '--write-media', outputPath,
    ];

    // 语速参数
    if (rate && rate !== 1.0) {
      const ratePercent = Math.round((rate - 1) * 100);
      args.push('--rate', `${ratePercent >= 0 ? '+' : ''}${ratePercent}%`);
    }

    const proc = spawn('python3', args, { shell: true });
    let stderr = '';

    proc.stderr?.on('data', (data) => {
      stderr += data.toString();
    });

    proc.on('close', (code) => {
      // 清理临时文本文件
      try { fs.unlinkSync(tempTextFile); } catch {}

      if (code === 0) {
        resolve();
      } else {
        reject(new Error(`edge-tts 失败: ${stderr}`));
      }
    });

    proc.on('error', (err) => {
      try { fs.unlinkSync(tempTextFile); } catch {}
      reject(new Error(`执行失败: ${err.message}`));
    });
  });
}

// Edge TTS 生成（带字幕）
function generateEdgeTTSWithSubtitle(
  text: string,
  outputPath: string,
  voice: string,
  rate: number
): Promise<string> {
  return new Promise((resolve, reject) => {
    // 清理文本中的特殊符号
    const cleanedText = cleanTextForTTS(text);

    // 检查清理后文本是否为空
    if (!cleanedText || cleanedText.trim().length === 0) {
      return reject(new Error('文本内容为空，无法生成语音'));
    }

    const tempTextFile = outputPath.replace('.mp3', '.txt');
    const subtitlePath = outputPath.replace('.mp3', '.vtt');
    fs.writeFileSync(tempTextFile, cleanedText, 'utf-8');

    const args = [
      '-m', 'edge_tts',
      '--voice', voice,
      '--file', tempTextFile,
      '--write-media', outputPath,
      '--write-subtitles', subtitlePath,
    ];

    if (rate && rate !== 1.0) {
      const ratePercent = Math.round((rate - 1) * 100);
      args.push('--rate', `${ratePercent >= 0 ? '+' : ''}${ratePercent}%`);
    }

    const proc = spawn('python3', args, { shell: true });
    let stderr = '';

    proc.stderr?.on('data', (data) => {
      stderr += data.toString();
    });

    proc.on('close', (code) => {
      try { fs.unlinkSync(tempTextFile); } catch {}
      if (code === 0) {
        resolve(subtitlePath);
      } else {
        reject(new Error(`edge-tts 失败: ${stderr}`));
      }
    });

    proc.on('error', (err) => {
      try { fs.unlinkSync(tempTextFile); } catch {}
      reject(new Error(`执行失败: ${err.message}`));
    });
  });
}

// 清理段落文本，移除 Markdown 语法，保留纯文本
function cleanParagraphText(text: string): string {
  return text
    .replace(/!\[.*?\]\(.*?\)/g, '')  // 移除图片
    .replace(/\[([^\]]+)\]\(.*?\)/g, '$1')  // 链接保留文字
    .replace(/#{1,6}\s*/g, '')  // 移除标题标记
    .replace(/\*\*([^*]+)\*\*/g, '$1')  // 移除粗体
    .replace(/\*([^*]+)\*/g, '$1')  // 移除斜体
    .replace(/`([^`]+)`/g, '$1')  // 移除行内代码
    .replace(/>\s*/g, '')  // 移除引用标记
    .replace(/[-*+]\s+/gm, '')  // 移除列表标记
    .replace(/^\d+\.\s+/gm, '')  // 移除有序列表标记
    .trim();
}

// 解析 Markdown 提取纯文本段落（返回段落信息，包含用于匹配的文本片段）
interface ExtractedParagraph {
  text: string;        // 用于 TTS 朗读的纯文本
  matchText: string;   // 用于前端匹配的文本片段（前20个字符）
}

function extractParagraphs(markdown: string): ExtractedParagraph[] {
  // 移除代码块（整块移除）
  let text = markdown.replace(/```[\s\S]*?```/g, '');

  // 按双换行分割为块
  const blocks = text.split(/\n\s*\n/);
  const paragraphs: ExtractedParagraph[] = [];

  for (const block of blocks) {
    const trimmed = block.trim();
    if (!trimmed) continue;

    // 跳过纯图片行
    if (/^!\[.*?\]\(.*?\)$/.test(trimmed)) continue;

    // 跳过分隔线（---、***、___）
    if (/^[-*_]{3,}$/.test(trimmed)) continue;

    // 清理文本
    const cleanedText = cleanParagraphText(trimmed);
    if (!cleanedText || cleanedText.length === 0) continue;

    // 提取匹配文本（取前30个字符，用于前端匹配）
    const matchText = cleanedText.substring(0, 30);

    paragraphs.push({
      text: cleanedText,
      matchText,
    });
  }

  return paragraphs;
}

// 解析 VTT 字幕文件
function parseVTT(vttContent: string): Array<{ start: number; end: number; text: string }> {
  const segments: Array<{ start: number; end: number; text: string }> = [];
  const lines = vttContent.split('\n');

  let i = 0;
  while (i < lines.length) {
    const line = lines[i].trim();
    // 匹配时间戳行
    const timeMatch = line.match(/(\d{2}:\d{2}:\d{2}\.\d{3})\s*-->\s*(\d{2}:\d{2}:\d{2}\.\d{3})/);
    if (timeMatch) {
      const start = parseVTTTime(timeMatch[1]);
      const end = parseVTTTime(timeMatch[2]);
      // 下一行是文本
      i++;
      let text = '';
      while (i < lines.length && lines[i].trim() !== '') {
        text += lines[i].trim() + ' ';
        i++;
      }
      if (text.trim()) {
        segments.push({ start, end, text: text.trim() });
      }
    }
    i++;
  }
  return segments;
}

// 解析 VTT 时间格式为毫秒
function parseVTTTime(timeStr: string): number {
  const [hours, minutes, rest] = timeStr.split(':');
  const [seconds, ms] = rest.split('.');
  return (
    parseInt(hours) * 3600000 +
    parseInt(minutes) * 60000 +
    parseInt(seconds) * 1000 +
    parseInt(ms)
  );
}

// 将 VTT 字幕段落映射到原始段落
function mapSubtitlesToParagraphs(
  paragraphs: ExtractedParagraph[],
  vttSegments: Array<{ start: number; end: number; text: string }>
): Array<{ index: number; text: string; matchText: string; start: number; end: number }> {
  const result: Array<{ index: number; text: string; matchText: string; start: number; end: number }> = [];

  let vttIndex = 0;
  for (let i = 0; i < paragraphs.length; i++) {
    const para = paragraphs[i];
    const paraStart = vttIndex < vttSegments.length ? vttSegments[vttIndex].start : 0;

    // 找到该段落对应的所有 VTT 片段
    let paraEnd = paraStart;
    const paraTextNorm = para.text.replace(/\s+/g, '').toLowerCase();
    let accumulatedText = '';

    while (vttIndex < vttSegments.length) {
      accumulatedText += vttSegments[vttIndex].text;
      paraEnd = vttSegments[vttIndex].end;
      vttIndex++;

      // 检查是否已覆盖该段落
      const accNorm = accumulatedText.replace(/\s+/g, '').toLowerCase();
      if (accNorm.length >= paraTextNorm.length * 0.8) {
        break;
      }
    }

    result.push({
      index: i,
      text: para.text,
      matchText: para.matchText,
      start: paraStart,
      end: paraEnd,
    });
  }

  return result;
}

// 文章朗读 - 生成音频
ttsRouter.post('/article-audio', async (req, res) => {
  const { articleId, content, voice = 'zh-CN-XiaoxiaoNeural', rate = 1.0 } = req.body;

  if (!content || !content.trim()) {
    return res.status(400).json({ error: '文章内容不能为空' });
  }

  try {
    // 生成缓存 key
    const cacheKey = crypto
      .createHash('md5')
      .update(`${articleId || 'temp'}-${voice}-${rate}-${content}`)
      .digest('hex');

    const audioPath = path.join(articleAudioDir, `${cacheKey}.mp3`);
    const vttPath = path.join(articleAudioDir, `${cacheKey}.vtt`);
    const segmentsPath = path.join(articleAudioDir, `${cacheKey}.json`);

    // 检查缓存
    if (fs.existsSync(audioPath) && fs.existsSync(segmentsPath)) {
      const segments = JSON.parse(fs.readFileSync(segmentsPath, 'utf-8'));
      const metadata = await parseFile(audioPath);
      const duration = Math.round((metadata.format.duration || 0) * 1000);

      return res.json({
        audioUrl: `/api/tts/article-audio/${cacheKey}.mp3`,
        segments,
        duration,
        cached: true,
      });
    }

    // 提取段落
    const paragraphs = extractParagraphs(content);
    if (paragraphs.length === 0) {
      return res.status(400).json({ error: '无法提取文章段落' });
    }

    // 合并段落为完整文本（用换行分隔以便 TTS 自然停顿）
    const fullText = paragraphs.map(p => p.text).join('\n\n');

    // 生成 TTS 音频和字幕
    await generateEdgeTTSWithSubtitle(fullText, audioPath, voice, rate);

    // 解析 VTT 字幕
    const vttContent = fs.readFileSync(vttPath, 'utf-8');
    const vttSegments = parseVTT(vttContent);

    // 映射到段落
    const segments = mapSubtitlesToParagraphs(paragraphs, vttSegments);

    // 保存段落信息
    fs.writeFileSync(segmentsPath, JSON.stringify(segments), 'utf-8');

    // 获取音频时长
    const metadata = await parseFile(audioPath);
    const duration = Math.round((metadata.format.duration || 0) * 1000);

    res.json({
      audioUrl: `/api/tts/article-audio/${cacheKey}.mp3`,
      segments,
      duration,
      cached: false,
    });
  } catch (error: any) {
    console.error('文章朗读生成失败:', error);
    res.status(500).json({ error: error.message || '生成失败' });
  }
});

// 获取文章朗读音频文件
ttsRouter.get('/article-audio/:filename', (req, res) => {
  const filePath = path.join(articleAudioDir, req.params.filename);
  if (!fs.existsSync(filePath)) {
    return res.status(404).json({ error: '音频不存在' });
  }

  // 获取文件信息
  const stat = fs.statSync(filePath);
  const fileSize = stat.size;

  // 检查文件大小是否为 0（可能是生成失败的空文件）
  if (fileSize === 0) {
    // 删除空文件
    try { fs.unlinkSync(filePath); } catch {}
    return res.status(404).json({ error: '音频文件无效' });
  }

  const range = req.headers.range;

  // 设置正确的 Content-Type
  res.setHeader('Content-Type', 'audio/mpeg');
  res.setHeader('Accept-Ranges', 'bytes');

  if (range) {
    // 解析 Range 请求
    const parts = range.replace(/bytes=/, '').split('-');
    const start = parseInt(parts[0], 10);
    const end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1;

    // 验证 Range 是否有效
    if (start >= fileSize || end >= fileSize || start > end) {
      res.status(416).setHeader('Content-Range', `bytes */${fileSize}`);
      return res.end();
    }

    const chunkSize = (end - start) + 1;
    const fileStream = fs.createReadStream(filePath, { start, end });

    res.status(206);
    res.setHeader('Content-Range', `bytes ${start}-${end}/${fileSize}`);
    res.setHeader('Content-Length', chunkSize);

    fileStream.pipe(res);
  } else {
    // 完整文件响应
    res.setHeader('Content-Length', fileSize);
    fs.createReadStream(filePath).pipe(res);
  }
});

// 分段朗读 - 获取段落列表
ttsRouter.post('/article-segments', async (req, res) => {
  const { content } = req.body;
  if (!content || !content.trim()) {
    return res.status(400).json({ error: '文章内容不能为空' });
  }

  const paragraphs = extractParagraphs(content);
  res.json({
    segments: paragraphs.map((p, index) => ({
      index,
      text: p.text,
      matchText: p.matchText,  // 用于前端匹配高亮
    })),
    total: paragraphs.length,
  });
});

// 分段朗读 - 生成单个段落音频
ttsRouter.post('/segment-audio', async (req, res) => {
  const { text, index, voice = 'zh-CN-XiaoxiaoNeural', rate = 1.0 } = req.body;

  if (!text || !text.trim()) {
    return res.status(400).json({ error: '段落内容不能为空' });
  }

  try {
    // 生成缓存 key
    const cacheKey = crypto
      .createHash('md5')
      .update(`seg-${voice}-${rate}-${text}`)
      .digest('hex');

    const audioPath = path.join(articleAudioDir, `${cacheKey}.mp3`);

    // 检查缓存（确保文件存在且大小大于 0）
    if (fs.existsSync(audioPath)) {
      const stat = fs.statSync(audioPath);
      if (stat.size > 0) {
        const metadata = await parseFile(audioPath);
        const duration = Math.round((metadata.format.duration || 0) * 1000);
        return res.json({
          audioUrl: `/api/tts/article-audio/${cacheKey}.mp3`,
          index,
          duration,
          cached: true,
        });
      } else {
        // 删除空文件，重新生成
        fs.unlinkSync(audioPath);
      }
    }

    // 生成音频
    await generateEdgeTTS(text, audioPath, voice, rate);

    const metadata = await parseFile(audioPath);
    const duration = Math.round((metadata.format.duration || 0) * 1000);

    res.json({
      audioUrl: `/api/tts/article-audio/${cacheKey}.mp3`,
      index,
      duration,
      cached: false,
    });
  } catch (error: any) {
    console.error('段落音频生成失败:', error);
    res.status(500).json({ error: error.message || '生成失败' });
  }
});

// ========== 音色列表获取函数 ==========

// Edge TTS 音色列表（仅包含实际可用的音色）
function getEdgeVoices() {
  return [
    { id: 'zh-CN-XiaoxiaoNeural', name: '晓晓', gender: 'female', category: 'free', description: '温柔亲切，新闻/小说' },
    { id: 'zh-CN-XiaoyiNeural', name: '晓伊', gender: 'female', category: 'free', description: '活泼可爱，卡通/小说' },
    { id: 'zh-CN-YunjianNeural', name: '云健', gender: 'male', category: 'free', description: '激情澎湃，体育/小说' },
    { id: 'zh-CN-YunxiNeural', name: '云希', gender: 'male', category: 'free', description: '阳光活力，小说' },
    { id: 'zh-CN-YunxiaNeural', name: '云夏', gender: 'male', category: 'free', description: '可爱童声，卡通/小说' },
    { id: 'zh-CN-YunyangNeural', name: '云扬', gender: 'male', category: 'free', description: '专业播音，新闻' },
    { id: 'zh-CN-liaoning-XiaobeiNeural', name: '晓北（东北话）', gender: 'female', category: 'free', description: '幽默风趣，方言' },
    { id: 'zh-CN-shaanxi-XiaoniNeural', name: '晓妮（陕西话）', gender: 'female', category: 'free', description: '明亮清脆，方言' },
  ];
}

// Fish Speech 音色列表
function getFishSpeechVoices() {
  return [
    { id: 'default', name: '默认音色', gender: 'female', category: 'premium', description: '高品质中文女声', supportsEmotion: true },
    { id: 'narrator-male', name: '专业配音（男）', gender: 'male', category: 'premium', description: '沉稳大气，适合纪录片', supportsEmotion: true },
    { id: 'narrator-female', name: '专业配音（女）', gender: 'female', category: 'premium', description: '温柔亲切，适合教程', supportsEmotion: true },
    { id: 'news-anchor', name: '新闻主播', gender: 'male', category: 'premium', description: '标准播音腔', supportsEmotion: true },
    { id: 'storyteller', name: '故事讲述', gender: 'female', category: 'premium', description: '富有感染力', supportsEmotion: true },
  ];
}

// ElevenLabs 音色列表
async function getElevenLabsVoices() {
  const apiKey = process.env.ELEVENLABS_API_KEY;
  if (!apiKey) return [];

  try {
    const response = await fetch('https://api.elevenlabs.io/v1/voices', {
      headers: { 'xi-api-key': apiKey },
    });

    if (!response.ok) {
      return getDefaultElevenLabsVoices();
    }

    const data = await response.json();
    return data.voices.map((v: any) => ({
      id: v.voice_id,
      name: v.name,
      gender: v.labels?.gender === 'male' ? 'male' : 'female',
      category: 'premium',
      description: v.description || v.labels?.description || '',
      previewUrl: v.preview_url,
      supportsEmotion: true,
    }));
  } catch {
    return getDefaultElevenLabsVoices();
  }
}

// ElevenLabs 默认音色
function getDefaultElevenLabsVoices() {
  return [
    { id: 'pNInz6obpgDQGcFmaJgB', name: 'Adam', gender: 'male', category: 'premium', description: '深沉有力', supportsEmotion: true },
    { id: '21m00Tcm4TlvDq8ikWAM', name: 'Rachel', gender: 'female', category: 'premium', description: '温暖自然', supportsEmotion: true },
    { id: 'AZnzlk1XvdvUeBnXmlld', name: 'Domi', gender: 'female', category: 'premium', description: '活泼年轻', supportsEmotion: true },
  ];
}

// OpenAI TTS 音色列表
function getOpenAIVoices() {
  return [
    { id: 'alloy', name: 'Alloy', gender: 'female', category: 'premium', description: '中性平衡' },
    { id: 'echo', name: 'Echo', gender: 'male', category: 'premium', description: '温暖沉稳' },
    { id: 'fable', name: 'Fable', gender: 'female', category: 'premium', description: '富有表现力' },
    { id: 'onyx', name: 'Onyx', gender: 'male', category: 'premium', description: '深沉有力' },
    { id: 'nova', name: 'Nova', gender: 'female', category: 'premium', description: '年轻活泼' },
    { id: 'shimmer', name: 'Shimmer', gender: 'female', category: 'premium', description: '清澈明亮' },
  ];
}

// Azure TTS 音色列表
function getAzureVoices() {
  return [
    { id: 'zh-CN-XiaoxiaoNeural', name: '晓晓', gender: 'female', category: 'premium', description: '温柔亲切' },
    { id: 'zh-CN-YunxiNeural', name: '云希', gender: 'male', category: 'premium', description: '阳光活力' },
    { id: 'zh-CN-YunjianNeural', name: '云健', gender: 'male', category: 'premium', description: '沉稳大气' },
    { id: 'zh-CN-XiaoyiNeural', name: '晓伊', gender: 'female', category: 'premium', description: '甜美可爱' },
  ];
}

// 科大讯飞 TTS 音色列表
function getXfyunVoices() {
  return [
    { id: 'xiaoyan', name: '小燕', gender: 'female', category: 'premium', description: '标准女声' },
    { id: 'aisjiuxu', name: '许久', gender: 'male', category: 'premium', description: '成熟男声' },
    { id: 'aisxping', name: '小萍', gender: 'female', category: 'premium', description: '甜美女声' },
    { id: 'aisjinger', name: '小婧', gender: 'female', category: 'premium', description: '知性女声' },
    { id: 'aisbabyxu', name: '许小宝', gender: 'male', category: 'premium', description: '可爱童声' },
    { id: 'x2_xiaojuan', name: '小娟', gender: 'female', category: 'premium', description: '温柔女声' },
    { id: 'x2_yifeng', name: '一峰', gender: 'male', category: 'premium', description: '磁性男声' },
  ];
}

// CosyVoice 音色列表
function getCosyVoiceVoices() {
  return [
    { id: 'default', name: '默认音色', gender: 'female', category: 'premium', description: '通用女声' },
    { id: 'zhiyu', name: '知语', gender: 'female', category: 'premium', description: '知性女声' },
    { id: 'zhisheng', name: '知声', gender: 'male', category: 'premium', description: '成熟男声' },
  ];
}

// Fish Speech TTS 生成
async function generateFishSpeechTTS(
  text: string,
  outputPath: string,
  voice: string,
  rate: number,
  emotion?: string
): Promise<void> {
  const apiUrl = process.env.FISH_SPEECH_URL || 'http://localhost:8080';
  const cleanedText = cleanTextForTTS(text);

  const response = await fetch(`${apiUrl}/v1/tts`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      text: cleanedText,
      format: 'mp3',
      speed: rate,
      emotion: emotion || 'neutral',
    }),
  });

  if (!response.ok) {
    throw new Error(`Fish Speech 错误: ${response.status}`);
  }

  const buffer = await response.arrayBuffer();
  fs.writeFileSync(outputPath, Buffer.from(buffer));
}

// ElevenLabs TTS 生成
async function generateElevenLabsTTS(
  text: string,
  outputPath: string,
  voice: string,
  rate: number,
  emotion?: string
): Promise<void> {
  const apiKey = process.env.ELEVENLABS_API_KEY;
  if (!apiKey) throw new Error('ElevenLabs API Key 未配置');

  const cleanedText = cleanTextForTTS(text);
  const styleValue = emotion === 'happy' ? 0.6 : emotion === 'sad' ? 0.3 : 0;

  const response = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${voice}`, {
    method: 'POST',
    headers: {
      'xi-api-key': apiKey,
      'Content-Type': 'application/json',
      'Accept': 'audio/mpeg',
    },
    body: JSON.stringify({
      text: cleanedText,
      model_id: 'eleven_multilingual_v2',
      voice_settings: {
        stability: 0.5,
        similarity_boost: 0.75,
        style: styleValue,
      },
    }),
  });

  if (!response.ok) {
    throw new Error(`ElevenLabs 错误: ${response.status}`);
  }

  const buffer = await response.arrayBuffer();
  fs.writeFileSync(outputPath, Buffer.from(buffer));
}

// OpenAI TTS 生成
async function generateOpenAITTS(
  text: string,
  outputPath: string,
  voice: string,
  rate: number
): Promise<void> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) throw new Error('OpenAI API Key 未配置');

  const cleanedText = cleanTextForTTS(text);

  const response = await fetch('https://api.openai.com/v1/audio/speech', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'tts-1',
      input: cleanedText,
      voice: voice || 'alloy',
      speed: rate || 1.0,
    }),
  });

  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(`OpenAI TTS 错误: ${err.error?.message || response.status}`);
  }

  const buf = await response.arrayBuffer();
  fs.writeFileSync(outputPath, Buffer.from(buf));
}

// 科大讯飞 TTS 生成
async function generateXfyunTTS(
  text: string,
  outputPath: string,
  voice: string,
  rate: number
): Promise<void> {
  // 从数据库读取配置
  const config = await prisma.mediaServiceConfig.findFirst({
    where: { serviceType: 'tts', provider: 'xfyun', isEnabled: true },
  });

  if (!config) throw new Error('讯飞 TTS 未配置');

  const xfConfig = JSON.parse(config.config || '{}');
  const appId = xfConfig.appId;
  const apiKey = config.apiKey;
  const apiSecret = xfConfig.apiSecret;

  if (!appId || !apiKey || !apiSecret) {
    throw new Error('讯飞配置不完整');
  }

  const cleanedText = cleanTextForTTS(text);
  const speed = Math.round(50 + (rate - 1) * 50);

  // 构建 WebSocket URL
  const host = 'tts-api.xfyun.cn';
  const wsPath = '/v2/tts';
  const date = new Date().toUTCString();

  const signatureOrigin = `host: ${host}\ndate: ${date}\nGET ${wsPath} HTTP/1.1`;
  const signature = crypto
    .createHmac('sha256', apiSecret)
    .update(signatureOrigin)
    .digest('base64');

  const authOrigin = `api_key="${apiKey}", algorithm="hmac-sha256", headers="host date request-line", signature="${signature}"`;
  const authorization = Buffer.from(authOrigin).toString('base64');

  const wsUrl = `wss://${host}${wsPath}?authorization=${authorization}&date=${encodeURIComponent(date)}&host=${host}`;

  return new Promise((resolve, reject) => {
    const ws = new WebSocket(wsUrl);
    const audioChunks: Buffer[] = [];

    ws.on('open', () => {
      ws.send(JSON.stringify({
        common: { app_id: appId },
        business: { aue: 'lame', auf: 'audio/L16;rate=16000', vcn: voice || 'xiaoyan', speed, volume: 50, pitch: 50, tte: 'UTF8' },
        data: { status: 2, text: Buffer.from(cleanedText).toString('base64') },
      }));
    });

    ws.on('message', (data: Buffer) => {
      const res = JSON.parse(data.toString());
      if (res.code !== 0) {
        ws.close();
        reject(new Error(`讯飞错误: ${res.message}`));
        return;
      }
      if (res.data?.audio) {
        audioChunks.push(Buffer.from(res.data.audio, 'base64'));
      }
      if (res.data?.status === 2) ws.close();
    });

    ws.on('close', () => {
      if (audioChunks.length > 0) {
        fs.writeFileSync(outputPath, Buffer.concat(audioChunks));
        resolve();
      }
    });

    ws.on('error', (err: Error) => reject(new Error(`讯飞连接错误: ${err.message}`)));
  });
}

// CosyVoice TTS 生成
async function generateCosyVoiceTTS(
  text: string,
  outputPath: string,
  voice: string,
  rate: number
): Promise<void> {
  // 从数据库读取配置
  const config = await prisma.mediaServiceConfig.findFirst({
    where: { serviceType: 'tts', provider: 'cosyvoice', isEnabled: true },
  });

  if (!config) throw new Error('CosyVoice 未配置');

  const cosyConfig = JSON.parse(config.config || '{}');
  const apiUrl = config.apiEndpoint || cosyConfig.apiUrl || 'http://localhost:9880';
  const cleanedText = cleanTextForTTS(text);

  const response = await fetch(`${apiUrl}/tts`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      text: cleanedText,
      speaker: voice || 'default',
      speed: rate || 1.0,
    }),
  });

  if (!response.ok) {
    throw new Error(`CosyVoice 错误: ${response.status}`);
  }

  const buffer = await response.arrayBuffer();
  fs.writeFileSync(outputPath, Buffer.from(buffer));
}
