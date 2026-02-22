/**
 * 媒体服务注册中心
 * 定义所有支持的服务商和模型
 */

// 服务类型
export type ServiceType =
  | 'ai_chat'
  | 'image_search'
  | 'image_generate'
  | 'video_generate'
  | 'video_search'
  | 'audio_search'
  | 'tts'
  | 'digital_human';

// 服务商定义
export interface ProviderDefinition {
  id: string;
  name: string;
  description?: string;
  website?: string;
  models?: ModelDefinition[];
  requiresApiKey: boolean;
  supportsCustomEndpoint?: boolean;
}

// 模型定义
export interface ModelDefinition {
  id: string;
  name: string;
  description?: string;
  isDefault?: boolean;
  maxTokens?: number;
  contextWindow?: number;
}

// 服务类型定义
export interface ServiceTypeDefinition {
  id: ServiceType;
  name: string;
  description: string;
  icon: string;
  providers: ProviderDefinition[];
}

// ========== AI 大模型服务商 ==========
const AI_CHAT_PROVIDERS: ProviderDefinition[] = [
  {
    id: 'openai',
    name: 'OpenAI',
    description: '综合能力最强',
    website: 'https://platform.openai.com',
    requiresApiKey: true,
    supportsCustomEndpoint: true,
    models: [
      { id: 'gpt-4o', name: 'GPT-4o', description: '最新旗舰模型', isDefault: true },
      { id: 'gpt-4o-mini', name: 'GPT-4o Mini', description: '轻量快速' },
      { id: 'o1', name: 'o1', description: '推理增强' },
      { id: 'o3-mini', name: 'o3-mini', description: '推理增强轻量版' },
    ],
  },
  {
    id: 'claude',
    name: 'Anthropic Claude',
    description: '长文本、代码能力强',
    website: 'https://console.anthropic.com',
    requiresApiKey: true,
    supportsCustomEndpoint: true,
    models: [
      { id: 'claude-3-5-sonnet-20241022', name: 'Claude 3.5 Sonnet', isDefault: true },
      { id: 'claude-3-opus-20240229', name: 'Claude 3 Opus', description: '最强能力' },
      { id: 'claude-3-5-haiku-20241022', name: 'Claude 3.5 Haiku', description: '快速响应' },
    ],
  },
  {
    id: 'gemini',
    name: 'Google Gemini',
    description: '多模态理解',
    website: 'https://ai.google.dev',
    requiresApiKey: true,
    models: [
      { id: 'gemini-2.0-flash', name: 'Gemini 2.0 Flash', isDefault: true },
      { id: 'gemini-1.5-pro', name: 'Gemini 1.5 Pro' },
    ],
  },
  {
    id: 'deepseek',
    name: 'DeepSeek',
    description: '性价比高，推理强',
    website: 'https://platform.deepseek.com',
    requiresApiKey: true,
    supportsCustomEndpoint: true,
    models: [
      { id: 'deepseek-chat', name: 'DeepSeek Chat', isDefault: true },
      { id: 'deepseek-reasoner', name: 'DeepSeek Reasoner', description: '推理增强' },
    ],
  },
  {
    id: 'qwen',
    name: '通义千问',
    description: '国内首选',
    website: 'https://dashscope.console.aliyun.com',
    requiresApiKey: true,
    models: [
      { id: 'qwen-max', name: 'Qwen Max', isDefault: true },
      { id: 'qwen-plus', name: 'Qwen Plus' },
      { id: 'qwen-turbo', name: 'Qwen Turbo', description: '快速响应' },
    ],
  },
  {
    id: 'zhipu',
    name: '智谱 AI',
    description: '国产顶尖',
    website: 'https://open.bigmodel.cn',
    requiresApiKey: true,
    models: [
      { id: 'glm-4-plus', name: 'GLM-4 Plus', isDefault: true },
      { id: 'glm-4-flash', name: 'GLM-4 Flash' },
    ],
  },
  {
    id: 'kimi',
    name: 'Moonshot Kimi',
    description: '超长上下文',
    website: 'https://platform.moonshot.cn',
    requiresApiKey: true,
    models: [
      { id: 'moonshot-v1-128k', name: 'Moonshot 128K', isDefault: true, contextWindow: 128000 },
      { id: 'moonshot-v1-32k', name: 'Moonshot 32K', contextWindow: 32000 },
    ],
  },
  {
    id: 'doubao',
    name: '字节豆包',
    description: '创意写作',
    website: 'https://console.volcengine.com/ark',
    requiresApiKey: true,
    models: [
      { id: 'doubao-pro-32k', name: 'Doubao Pro 32K', isDefault: true },
    ],
  },
  {
    id: 'minimax',
    name: 'MiniMax',
    description: '角色扮演',
    website: 'https://platform.minimaxi.com',
    requiresApiKey: true,
    models: [
      { id: 'abab6.5s-chat', name: 'ABAB 6.5s', isDefault: true },
    ],
  },
  {
    id: 'baichuan',
    name: '百川智能',
    description: '知识问答',
    website: 'https://platform.baichuan-ai.com',
    requiresApiKey: true,
    models: [
      { id: 'Baichuan4', name: 'Baichuan 4', isDefault: true },
    ],
  },
  {
    id: 'yi',
    name: '零一万物',
    description: '开源领先',
    website: 'https://platform.lingyiwanwu.com',
    requiresApiKey: true,
    models: [
      { id: 'yi-large', name: 'Yi Large', isDefault: true },
      { id: 'yi-medium', name: 'Yi Medium' },
    ],
  },
  {
    id: 'hunyuan',
    name: '腾讯混元',
    description: '腾讯出品',
    website: 'https://cloud.tencent.com/product/hunyuan',
    requiresApiKey: true,
    models: [
      { id: 'hunyuan-pro', name: 'Hunyuan Pro', isDefault: true },
    ],
  },
];

// ========== 图片搜索服务商 ==========
const IMAGE_SEARCH_PROVIDERS: ProviderDefinition[] = [
  {
    id: 'unsplash',
    name: 'Unsplash',
    description: '免费商用，需署名',
    website: 'https://unsplash.com/developers',
    requiresApiKey: true,
  },
  {
    id: 'pexels',
    name: 'Pexels',
    description: '免费商用',
    website: 'https://www.pexels.com/api',
    requiresApiKey: true,
  },
  {
    id: 'pixabay',
    name: 'Pixabay',
    description: '免费商用',
    website: 'https://pixabay.com/api/docs',
    requiresApiKey: true,
  },
];

// ========== AI 图片生成服务商 ==========
const IMAGE_GENERATE_PROVIDERS: ProviderDefinition[] = [
  {
    id: 'dalle',
    name: 'DALL-E 3',
    description: 'OpenAI，质量稳定',
    website: 'https://platform.openai.com',
    requiresApiKey: true,
    models: [
      { id: 'dall-e-3', name: 'DALL-E 3', isDefault: true },
      { id: 'dall-e-2', name: 'DALL-E 2' },
    ],
  },
  {
    id: 'stability',
    name: 'Stability AI',
    description: '开源可控',
    website: 'https://platform.stability.ai',
    requiresApiKey: true,
    models: [
      { id: 'stable-diffusion-xl-1024-v1-0', name: 'SDXL 1.0', isDefault: true },
      { id: 'sd3-large', name: 'SD3 Large' },
    ],
  },
  {
    id: 'tongyi_wanxiang',
    name: '通义万相',
    description: '国内首选',
    website: 'https://dashscope.console.aliyun.com',
    requiresApiKey: true,
    models: [
      { id: 'wanx-v1', name: '通义万相 V1', isDefault: true },
    ],
  },
  {
    id: 'yige',
    name: '文心一格',
    description: '百度出品',
    website: 'https://yige.baidu.com',
    requiresApiKey: true,
  },
  {
    id: 'ideogram',
    name: 'Ideogram',
    description: '文字渲染强',
    website: 'https://ideogram.ai',
    requiresApiKey: true,
  },
  {
    id: 'flux',
    name: 'Flux Pro',
    description: '新一代开源',
    website: 'https://blackforestlabs.ai',
    requiresApiKey: true,
  },
];

// ========== AI 视频生成服务商 ==========
const VIDEO_GENERATE_PROVIDERS: ProviderDefinition[] = [
  {
    id: 'runway',
    name: 'Runway Gen-3',
    description: '业界标杆',
    website: 'https://runwayml.com',
    requiresApiKey: true,
  },
  {
    id: 'kling',
    name: '可灵 AI',
    description: '国产顶尖',
    website: 'https://klingai.kuaishou.com',
    requiresApiKey: true,
  },
  {
    id: 'pika',
    name: 'Pika Labs',
    description: '风格化强',
    website: 'https://pika.art',
    requiresApiKey: true,
  },
  {
    id: 'minimax_video',
    name: 'MiniMax 视频',
    description: '国产新秀',
    website: 'https://platform.minimaxi.com',
    requiresApiKey: true,
  },
  {
    id: 'luma',
    name: 'Luma Dream Machine',
    description: '3D理解强',
    website: 'https://lumalabs.ai',
    requiresApiKey: true,
  },
  {
    id: 'vidu',
    name: 'Vidu',
    description: '生数科技',
    website: 'https://www.vidu.io',
    requiresApiKey: true,
  },
];

// ========== 视频素材搜索服务商 ==========
const VIDEO_SEARCH_PROVIDERS: ProviderDefinition[] = [
  {
    id: 'pexels_video',
    name: 'Pexels Video',
    description: '免费商用',
    website: 'https://www.pexels.com/api',
    requiresApiKey: true,
  },
  {
    id: 'pixabay_video',
    name: 'Pixabay Video',
    description: '免费商用',
    website: 'https://pixabay.com/api/docs',
    requiresApiKey: true,
  },
];

// ========== 音频素材搜索服务商 ==========
const AUDIO_SEARCH_PROVIDERS: ProviderDefinition[] = [
  {
    id: 'freesound',
    name: 'Freesound',
    description: '免费音效库',
    website: 'https://freesound.org/apiv2',
    requiresApiKey: true,
  },
  {
    id: 'pixabay_audio',
    name: 'Pixabay Music',
    description: '免费商用',
    website: 'https://pixabay.com/api/docs',
    requiresApiKey: true,
  },
];

// ========== TTS 语音合成服务商 ==========
const TTS_PROVIDERS: ProviderDefinition[] = [
  {
    id: 'edge_tts',
    name: 'Edge TTS',
    description: '免费',
    requiresApiKey: false,
  },
  {
    id: 'azure_tts',
    name: 'Azure 语音服务',
    website: 'https://azure.microsoft.com/services/cognitive-services/text-to-speech',
    requiresApiKey: true,
  },
  {
    id: 'elevenlabs',
    name: 'ElevenLabs',
    description: '高质量语音',
    website: 'https://elevenlabs.io',
    requiresApiKey: true,
  },
  {
    id: 'xfyun',
    name: '科大讯飞',
    description: '国产高品质',
    website: 'https://www.xfyun.cn',
    requiresApiKey: true,
  },
  {
    id: 'fish_audio',
    name: 'Fish Audio',
    website: 'https://fish.audio',
    requiresApiKey: true,
  },
  {
    id: 'cosyvoice',
    name: 'CosyVoice',
    description: '阿里开源',
    requiresApiKey: false,
  },
];

// ========== 数字人服务商 ==========
const DIGITAL_HUMAN_PROVIDERS: ProviderDefinition[] = [
  {
    id: 'heygen',
    name: 'HeyGen',
    description: '国际领先，多语言',
    website: 'https://www.heygen.com',
    requiresApiKey: true,
  },
  {
    id: 'd_id',
    name: 'D-ID',
    description: '照片驱动，简单易用',
    website: 'https://www.d-id.com',
    requiresApiKey: true,
  },
  {
    id: 'synthesia',
    name: 'Synthesia',
    description: '企业级，多场景',
    website: 'https://www.synthesia.io',
    requiresApiKey: true,
  },
  {
    id: 'guiji',
    name: '硅基智能',
    description: '国产首选，中文优化',
    website: 'https://www.guiji.ai',
    requiresApiKey: true,
  },
  {
    id: 'tencent_avatar',
    name: '腾讯智影',
    description: '腾讯出品',
    website: 'https://zenvideo.qq.com',
    requiresApiKey: true,
  },
];

// ========== 服务类型注册表 ==========
export const SERVICE_TYPES: ServiceTypeDefinition[] = [
  {
    id: 'ai_chat',
    name: 'AI 大模型',
    description: 'AI 对话和文本生成服务',
    icon: 'RobotOutlined',
    providers: AI_CHAT_PROVIDERS,
  },
  {
    id: 'image_search',
    name: '图片搜索',
    description: '图片素材搜索服务',
    icon: 'SearchOutlined',
    providers: IMAGE_SEARCH_PROVIDERS,
  },
  {
    id: 'image_generate',
    name: 'AI 图片生成',
    description: 'AI 图片生成服务',
    icon: 'PictureOutlined',
    providers: IMAGE_GENERATE_PROVIDERS,
  },
  {
    id: 'video_generate',
    name: 'AI 视频生成',
    description: 'AI 视频生成服务',
    icon: 'VideoCameraOutlined',
    providers: VIDEO_GENERATE_PROVIDERS,
  },
  {
    id: 'video_search',
    name: '视频搜索',
    description: '视频素材搜索服务',
    icon: 'PlaySquareOutlined',
    providers: VIDEO_SEARCH_PROVIDERS,
  },
  {
    id: 'audio_search',
    name: '音频搜索',
    description: '音频素材搜索服务',
    icon: 'SoundOutlined',
    providers: AUDIO_SEARCH_PROVIDERS,
  },
  {
    id: 'tts',
    name: '语音合成',
    description: '文本转语音服务',
    icon: 'AudioOutlined',
    providers: TTS_PROVIDERS,
  },
  {
    id: 'digital_human',
    name: '数字人',
    description: '数字人/虚拟人服务',
    icon: 'UserOutlined',
    providers: DIGITAL_HUMAN_PROVIDERS,
  },
];

// ========== 辅助函数 ==========

/**
 * 获取服务类型定义
 */
export function getServiceType(type: ServiceType): ServiceTypeDefinition | undefined {
  return SERVICE_TYPES.find(st => st.id === type);
}

/**
 * 获取服务商定义
 */
export function getProvider(type: ServiceType, providerId: string): ProviderDefinition | undefined {
  const serviceType = getServiceType(type);
  return serviceType?.providers.find(p => p.id === providerId);
}

/**
 * 获取模型定义
 */
export function getModel(type: ServiceType, providerId: string, modelId: string): ModelDefinition | undefined {
  const provider = getProvider(type, providerId);
  return provider?.models?.find(m => m.id === modelId);
}

/**
 * 获取服务商的默认模型
 */
export function getDefaultModel(type: ServiceType, providerId: string): ModelDefinition | undefined {
  const provider = getProvider(type, providerId);
  return provider?.models?.find(m => m.isDefault) || provider?.models?.[0];
}

/**
 * 获取所有服务类型
 */
export function getAllServiceTypes(): ServiceTypeDefinition[] {
  return SERVICE_TYPES;
}

/**
 * 获取指定类型的所有服务商
 */
export function getProviders(type: ServiceType): ProviderDefinition[] {
  return getServiceType(type)?.providers || [];
}
