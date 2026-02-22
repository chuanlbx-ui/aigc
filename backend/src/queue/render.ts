import { PrismaClient } from '@prisma/client';
import { spawn } from 'child_process';
import path from 'path';
import fs from 'fs';
import { parseFile } from 'music-metadata';
import { createQueue, type QueueService } from '../services/queue';

const prisma = new PrismaClient();

// HeyGen API 配置
const HEYGEN_API_KEY = process.env.HEYGEN_API_KEY;
const HEYGEN_BASE_URL = 'https://api.heygen.com/v2';

// 渲染任务数据类型
interface RenderJobData {
  taskId: string;
  projectId: string;
  config: string;
}

// 创建渲染队列（支持 Redis 或内存模式）
const queue: QueueService<RenderJobData> = createQueue<RenderJobData>('video-render', 1);

// 初始化队列处理器
queue.process(async (data: RenderJobData) => {
  await processRender(data.taskId, {
    id: data.projectId,
    config: data.config,
  });
});

// 确保输出目录存在
const outputDir = path.join(process.cwd(), 'output');
if (!fs.existsSync(outputDir)) {
  fs.mkdirSync(outputDir, { recursive: true });
}

interface Project {
  id: string;
  config: string;
}

// ========== 编辑器配置类型 ==========
interface EditorAsset {
  id: string;
  name: string;
  url: string;
  type: 'image' | 'video';
  duration: number;
}

interface EditorPopup {
  id: string;
  contentType: 'text' | 'image' | 'video';
  textContent?: string;
  mediaUrl?: string;
  mediaFit?: 'cover' | 'contain' | 'fill';
  textAlign?: 'left' | 'center' | 'right';
  fontSize?: number;
  textColor?: string;
  width: number;
  height: number;
  position: string;
  customX?: number;
  customY?: number;
  startTime: number;
  duration: number;
  enterAnimation: string;
  exitAnimation: string;
  animationDuration?: number;
  backgroundColor?: string;
  borderColor?: string;
  borderWidth?: number;
  borderRadius?: number;
  boxShadow?: string;
  padding?: number;
  zIndex?: number;
  videoMuted?: boolean;
}

// ========== 增强功能配置类型 ==========
interface EditorFilterConfig {
  type: 'warm' | 'cool' | 'vintage' | 'sharpen' | 'vignette' | 'grayscale' | 'sepia' | 'blur';
  intensity?: number;
}

interface EditorPresenterConfig {
  enabled: boolean;
  assetId?: string;
  assetUrl?: string;
  position: string;
  scale: number;
  entranceAnimation: string;
}

interface EditorGreenScreenConfig {
  enabled: boolean;
  assetId?: string;
  assetUrl?: string;
  chromaColor: 'green' | 'blue' | 'custom';
  customColor?: string;
  tolerance: number;
  position: string;
  scale: number;
}

interface EditorDigitalHumanConfig {
  enabled: boolean;
  avatarId?: string;
  avatarStyle?: 'normal' | 'circle' | 'closeUp';
  voiceId?: string;
  voiceSpeed?: number;
  backgroundType?: 'transparent' | 'color';
  backgroundColor?: string;
}

interface EditorConfig {
  text: string;
  tts: {
    provider: 'edge' | 'openai' | 'azure';
    voice: string;
    rate: number;
  };
  assets: EditorAsset[];
  popups?: EditorPopup[];
  bgm: { assetId: string | null; volume: number };
  background?: { styleId: string };
  orientation: 'landscape' | 'portrait';
  resolution: string;
  // 新增：增强功能配置
  filters?: EditorFilterConfig[];
  presenter?: EditorPresenterConfig;
  greenScreen?: EditorGreenScreenConfig;
  digitalHuman?: EditorDigitalHumanConfig;
}

// ========== Remotion Props 类型 ==========
interface BRollClip {
  id: string;
  type: 'image' | 'video';
  src: string;
  startFrame: number;
  durationFrames: number;
  effect: 'fade' | 'kenBurns' | 'zoom';
  keywords: string[];
}

interface CaptionPage {
  startMs: number;
  durationMs: number;
  tokens: never[];
  fullText: string;
}

interface TextToVideoProps {
  audioPath: string;
  captions: CaptionPage[];
  brollClips: BRollClip[];
  bgmPath?: string;
  backgroundStyleId?: string;
  popups?: EditorPopup[];
  orientation?: 'landscape' | 'portrait';
  // 增强功能（格式已转换为 Remotion 组件需要的格式）
  filters?: EditorFilterConfig[];
  presenters?: {
    id: string;
    type: 'video';
    src: string;
    position: string;
    scale: number;
    entranceAnimation: string;
  }[];
  greenScreen?: {
    src: string;
    chromaColor: string;
    customColor?: string;
    tolerance: number;
    position: string;
    scale: number;
  };
  digitalHumanVideo?: {
    src: string;
    position: 'full' | 'bottom-right' | 'bottom-left' | 'center';
    scale: number;
    hasTransparentBg?: boolean;
  };
}

export const renderQueue = {
  add: async (taskId: string, project: Project) => {
    await queue.add('render', {
      taskId,
      projectId: project.id,
      config: project.config,
    });
  },
  // 获取任务状态
  getJob: async (jobId: string) => {
    return queue.getJob(jobId);
  },
  // 获取所有任务
  getJobs: async () => {
    return queue.getJobs();
  },
  // 暂停队列
  pause: async () => {
    await queue.pause();
  },
  // 恢复队列
  resume: async () => {
    await queue.resume();
  },
};

async function processRender(taskId: string, project: Project) {
  console.log(`开始渲染任务: ${taskId}`);

  await prisma.renderTask.update({
    where: { id: taskId },
    data: { status: 'processing', startedAt: new Date() },
  });

  try {
    const config = JSON.parse(project.config) as EditorConfig;
    const outputPath = path.join(
      process.cwd(),
      'output',
      `${project.id}.mp4`
    );

    // Step 1: 生成 TTS 音频到 Remotion public 目录
    let audioPath = '';
    let audioDurationMs = 0;
    const remotionRoot = path.resolve(process.cwd(), '..', '..');
    const publicDir = path.join(remotionRoot, 'public', 'generated');

    // 确保 public/generated 目录存在
    if (!fs.existsSync(publicDir)) {
      fs.mkdirSync(publicDir, { recursive: true });
    }

    if (config.text && config.tts) {
      const ttsFilename = `tts-${taskId}.mp3`;
      const ttsOutputPath = path.join(publicDir, ttsFilename);
      console.log(`[render] 开始生成 TTS 音频...`);
      console.log(`[render] TTS 输出路径: ${ttsOutputPath}`);
      await generateEdgeTTS(
        config.text,
        ttsOutputPath,
        config.tts.voice || 'zh-CN-XiaoxiaoNeural',
        config.tts.rate || 1.0
      );
      // 验证文件是否生成成功
      if (fs.existsSync(ttsOutputPath)) {
        console.log(`[render] TTS 文件生成成功: ${ttsOutputPath}`);
        // 获取音频时长
        const metadata = await parseFile(ttsOutputPath);
        audioDurationMs = (metadata.format.duration || 0) * 1000;
        console.log(`[render] 音频时长: ${audioDurationMs}ms`);
      } else {
        console.error(`[render] TTS 文件未找到: ${ttsOutputPath}`);
      }
      // 使用 HTTP URL，通过后端静态文件服务访问
      audioPath = `http://localhost:3001/generated/${ttsFilename}`;
    }

    // Step 2: 如果启用数字人，生成数字人视频（替代 TTS）
    let digitalHumanVideoPath: string | undefined;
    if (config.digitalHuman?.enabled && config.text) {
      console.log('[render] 检测到数字人配置，开始生成数字人视频...');

      const result = await generateDigitalHumanVideo(
        config.text,
        config.digitalHuman,
        publicDir,
        taskId,
        config.orientation || 'landscape'
      );

      if (result) {
        digitalHumanVideoPath = result.videoPath;
        // 数字人视频自带语音，不需要 TTS 音频
        audioPath = '';
        audioDurationMs = result.duration * 1000;
        console.log(`[render] 数字人视频时长: ${audioDurationMs}ms`);
      }
    }

    // Step 3: 转换编辑器配置为 Remotion props 格式
    const remotionProps = convertConfigToProps(
      config,
      audioPath,
      audioDurationMs,
      30,
      digitalHumanVideoPath
    );
    console.log(`[render] 转换后的 props:`, JSON.stringify(remotionProps, null, 2));

    // Step 3: 调用 Remotion 渲染
    await runRemotion(remotionProps, outputPath, taskId);

    await prisma.renderTask.update({
      where: { id: taskId },
      data: {
        status: 'completed',
        progress: 100,
        completedAt: new Date(),
      },
    });

    await prisma.project.update({
      where: { id: project.id },
      data: { status: 'completed', outputPath },
    });

    console.log(`渲染完成: ${taskId}`);
  } catch (error) {
    const msg = error instanceof Error ? error.message : '未知错误';
    await prisma.renderTask.update({
      where: { id: taskId },
      data: { status: 'failed', error: msg },
    });
    await prisma.project.update({
      where: { id: project.id },
      data: { status: 'failed' },
    });
    console.error(`渲染失败: ${taskId}`, error);
  }
}

function runRemotion(
  props: TextToVideoProps,
  outputPath: string,
  taskId: string
): Promise<void> {
  return new Promise((resolve, reject) => {
    // 将 props 写入临时 JSON 文件（避免 Windows 命令行引号问题）
    const propsPath = path.join(outputDir, `props-${taskId}.json`);
    fs.writeFileSync(propsPath, JSON.stringify(props, null, 2));

    const remotionRoot = path.resolve(process.cwd(), '..', '..');
    const args = [
      'remotion', 'render',
      'TextToVideo',
      outputPath,
      `--props=${propsPath}`,
    ];

    console.log(`[render] 工作目录: ${remotionRoot}`);
    console.log(`[render] 执行命令: npx ${args.join(' ')}`);

    const proc = spawn('npx', args, {
      shell: true,
      cwd: remotionRoot,
    });

    proc.stdout?.on('data', (data) => {
      console.log(`[render] ${data}`);
    });

    proc.stderr?.on('data', (data) => {
      console.log(`[render] ${data}`);
    });

    proc.on('close', (code) => {
      // 清理临时文件
      try { fs.unlinkSync(propsPath); } catch {}

      if (code === 0) resolve();
      else reject(new Error(`渲染退出码: ${code}`));
    });

    proc.on('error', reject);
  });
}

// ========== 配置转换函数 ==========

// 规范化素材 URL，处理旧数据中的 Windows 路径问题
function normalizeAssetUrl(url: string | undefined, assetId?: string): string | undefined {
  if (!url) return undefined;

  // 如果已经是正确的 API URL 格式，直接返回
  if (url.startsWith('/api/assets/file/') || url.startsWith('http')) {
    // 确保使用后端端口
    if (url.startsWith('/api/')) {
      return `http://localhost:3001${url}`;
    }
    return url;
  }

  // 如果有 assetId，使用 API URL
  if (assetId) {
    return `http://localhost:3001/api/assets/file/${assetId}`;
  }

  // 处理 Windows 路径格式（包含反斜杠）
  if (url.includes('\\') || url.includes('uploads')) {
    // 无法转换，返回 undefined
    console.warn(`[render] 无法转换素材路径: ${url}`);
    return undefined;
  }

  return url;
}

function convertConfigToProps(
  config: EditorConfig,
  audioPath: string = '',
  audioDurationMs: number = 0,
  fps: number = 30,
  digitalHumanVideoPath?: string
): TextToVideoProps {
  const captions = convertTextToCaptions(config.text || '', audioDurationMs);
  const brollClips = convertAssetsToBRollClips(config.assets || [], audioDurationMs, fps);

  // 背景音乐 URL
  const bgmPath = config.bgm?.assetId
    ? `http://localhost:3001/api/assets/file/${config.bgm.assetId}`
    : undefined;

  // 转换绿幕配置（只有启用且有素材时才传递）
  const greenScreenSrc = normalizeAssetUrl(
    config.greenScreen?.assetUrl,
    config.greenScreen?.assetId
  );
  const greenScreen = config.greenScreen?.enabled && greenScreenSrc
    ? {
        src: greenScreenSrc,
        chromaColor: config.greenScreen.chromaColor || 'green',
        customColor: config.greenScreen.customColor,
        tolerance: config.greenScreen.tolerance || 0.4,
        position: config.greenScreen.position || 'bottom-right',
        scale: config.greenScreen.scale || 0.4,
      }
    : undefined;

  // 转换真人叠加配置（只有启用且有素材时才传递）
  const presenterSrc = normalizeAssetUrl(
    config.presenter?.assetUrl,
    config.presenter?.assetId
  );
  const presenters = config.presenter?.enabled && presenterSrc
    ? [{
        id: 'presenter-1',
        type: 'video' as const,
        src: presenterSrc,
        position: config.presenter.position || 'bottom-right',
        scale: config.presenter.scale || 0.3,
        entranceAnimation: config.presenter.entranceAnimation || 'fade',
      }]
    : undefined;

  // 数字人视频配置（如果有生成的视频路径）
  const digitalHumanVideo = digitalHumanVideoPath
    ? {
        src: `http://localhost:3001/generated/${path.basename(digitalHumanVideoPath)}`,
        position: 'full' as const,
        scale: 1,
        hasTransparentBg: config.digitalHuman?.backgroundType === 'transparent',
      }
    : undefined;

  return {
    audioPath,
    captions,
    brollClips,
    bgmPath,
    backgroundStyleId: config.background?.styleId,
    popups: config.popups || [],
    orientation: config.orientation || 'landscape',
    // 增强功能配置（已转换格式）
    filters: config.filters,
    presenters,
    greenScreen,
    digitalHumanVideo,
  };
}

function convertAssetsToBRollClips(assets: EditorAsset[], audioDurationMs: number, fps: number): BRollClip[] {
  if (!assets.length) return [];

  // 将音频时长平均分配给所有素材
  const totalDurationFrames = Math.ceil((audioDurationMs / 1000) * fps);
  const durationPerAsset = Math.ceil(totalDurationFrames / assets.length);
  let currentFrame = 0;

  return assets.map((asset) => {
    // 规范化素材 URL
    const normalizedUrl = normalizeAssetUrl(asset.url, asset.id);
    const clip: BRollClip = {
      id: asset.id,
      type: asset.type,
      src: normalizedUrl || asset.url,
      startFrame: currentFrame,
      durationFrames: durationPerAsset,
      effect: 'kenBurns',
      keywords: [],
    };
    currentFrame += durationPerAsset;
    return clip;
  });
}

function convertTextToCaptions(text: string, audioDurationMs: number): CaptionPage[] {
  if (!text) return [];

  const sentences = text
    .split(/[。！？\n]+/)
    .map(s => s.trim())
    .filter(s => s.length > 0);

  if (sentences.length === 0) return [];

  // 根据实际音频时长平均分配每句话的时间
  const msPerSentence = audioDurationMs > 0
    ? Math.ceil(audioDurationMs / sentences.length)
    : 3000;

  return sentences.map((sentence, index) => ({
    startMs: index * msPerSentence,
    durationMs: msPerSentence,
    tokens: [],
    fullText: sentence,
  }));
}

// ========== TTS 生成函数 ==========

function generateEdgeTTS(
  text: string,
  outputPath: string,
  voice: string,
  rate: number
): Promise<void> {
  return new Promise((resolve, reject) => {
    // 将文本写入临时文件，避免命令行特殊字符问题
    const tempTextFile = outputPath.replace('.mp3', '.txt');
    fs.writeFileSync(tempTextFile, text, 'utf-8');

    const args = [
      '-m', 'edge_tts',
      '--voice', voice,
      '--file', tempTextFile,
      '--write-media', outputPath,
    ];

    if (rate && rate !== 1.0) {
      const ratePercent = Math.round((rate - 1) * 100);
      args.push('--rate', `${ratePercent >= 0 ? '+' : ''}${ratePercent}%`);
    }

    console.log(`[TTS] 执行命令: python ${args.join(' ')}`);

    const proc = spawn('python3', args, { shell: true });
    let stderr = '';

    proc.stderr?.on('data', (data) => {
      stderr += data.toString();
    });

    proc.on('close', (code) => {
      // 清理临时文本文件
      try { fs.unlinkSync(tempTextFile); } catch {}

      if (code === 0) {
        console.log(`[TTS] 生成成功: ${outputPath}`);
        resolve();
      } else {
        reject(new Error(`edge-tts 失败: ${stderr}`));
      }
    });

    proc.on('error', (err) => {
      // 清理临时文本文件
      try { fs.unlinkSync(tempTextFile); } catch {}
      reject(new Error(`TTS 执行失败: ${err.message}`));
    });
  });
}

// ========== HeyGen 数字人生成函数 ==========

interface HeyGenVideoResult {
  videoPath: string;
  duration: number;
}

async function generateDigitalHumanVideo(
  text: string,
  config: EditorDigitalHumanConfig,
  outputDir: string,
  taskId: string,
  orientation: 'landscape' | 'portrait'
): Promise<HeyGenVideoResult | null> {
  if (!HEYGEN_API_KEY) {
    console.warn('[HeyGen] API Key 未配置，跳过数字人生成');
    return null;
  }

  console.log('[HeyGen] 开始生成数字人视频...');

  // 构建请求参数
  const dimension = orientation === 'portrait'
    ? { width: 1080, height: 1920 }
    : { width: 1920, height: 1080 };

  const background = config.backgroundType === 'color'
    ? { type: 'color', value: config.backgroundColor || '#ffffff' }
    : { type: 'transparent' };

  const payload = {
    video_inputs: [{
      character: {
        type: 'avatar',
        avatar_id: config.avatarId || 'Angela-inblackskirt-20220820',
        avatar_style: config.avatarStyle || 'normal',
      },
      voice: {
        type: 'text',
        input_text: text,
        voice_id: config.voiceId || 'zh-CN-XiaoxiaoNeural',
        speed: config.voiceSpeed || 1.0,
      },
      background,
    }],
    dimension,
  };

  try {
    // Step 1: 提交生成任务
    console.log('[HeyGen] 提交视频生成任务...');
    const generateRes = await fetch(`${HEYGEN_BASE_URL}/video/generate`, {
      method: 'POST',
      headers: {
        'X-Api-Key': HEYGEN_API_KEY,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    if (!generateRes.ok) {
      const error = await generateRes.text();
      throw new Error(`HeyGen API 错误: ${generateRes.status} - ${error}`);
    }

    const generateData = await generateRes.json();
    const videoId = generateData.data?.video_id;

    if (!videoId) {
      throw new Error('HeyGen 未返回 video_id');
    }

    console.log(`[HeyGen] 任务已提交，video_id: ${videoId}`);

    // Step 2: 轮询等待完成
    const result = await waitForHeyGenVideo(videoId);

    // Step 3: 下载视频
    const videoPath = path.join(outputDir, `heygen-${taskId}.mp4`);
    await downloadHeyGenVideo(result.video_url!, videoPath);

    console.log(`[HeyGen] 数字人视频生成完成: ${videoPath}`);

    return {
      videoPath,
      duration: result.duration || 0,
    };
  } catch (error) {
    console.error('[HeyGen] 生成失败:', error);
    throw error;
  }
}

interface HeyGenStatusResult {
  status: string;
  video_url?: string;
  duration?: number;
}

async function waitForHeyGenVideo(
  videoId: string,
  pollInterval = 5000,
  timeout = 600000
): Promise<HeyGenStatusResult> {
  const startTime = Date.now();

  while (Date.now() - startTime < timeout) {
    const res = await fetch(
      `${HEYGEN_BASE_URL}/video_status.get?video_id=${videoId}`,
      {
        headers: { 'X-Api-Key': HEYGEN_API_KEY! },
      }
    );

    if (!res.ok) {
      throw new Error(`HeyGen 状态查询失败: ${res.status}`);
    }

    const data = await res.json();
    const status = data.data?.status;

    console.log(`[HeyGen] 视频状态: ${status}`);

    if (status === 'completed') {
      return {
        status,
        video_url: data.data.video_url,
        duration: data.data.duration,
      };
    }

    if (status === 'failed') {
      throw new Error(`HeyGen 视频生成失败: ${data.data.error}`);
    }

    await new Promise(r => setTimeout(r, pollInterval));
  }

  throw new Error('HeyGen 视频生成超时');
}

async function downloadHeyGenVideo(
  url: string,
  outputPath: string
): Promise<void> {
  console.log(`[HeyGen] 下载视频: ${url}`);

  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`下载失败: ${res.status}`);
  }

  const buffer = await res.arrayBuffer();
  fs.writeFileSync(outputPath, Buffer.from(buffer));

  console.log(`[HeyGen] 视频已保存: ${outputPath}`);
}
