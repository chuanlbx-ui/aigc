import { ANTI_AI_CHECKLIST } from './prompts.js';

type Range = { min: number; max: number };
type WordCountRange = Record<string, Record<string, Range>>;
type ImageCountRange = Record<string, Range>;
type RequiredStep = 'topic' | 'review';

const WORD_COUNT_RANGE: WordCountRange = {
  wechat: {
    '深度': { min: 2500, max: 6000 },
    '速递': { min: 600, max: 2000 },
    '体验': { min: 1200, max: 3000 },
    '教程': { min: 1200, max: 4000 },
    '对话': { min: 1500, max: 5000 },
  },
  xiaohongshu: {
    '种草': { min: 200, max: 1000 },
    '教程': { min: 300, max: 1200 },
    '观点': { min: 200, max: 800 },
  },
  video: {
    '演示': { min: 100, max: 500 },
    '教程': { min: 150, max: 600 },
    '观点': { min: 100, max: 400 },
  },
};

const IMAGE_COUNT_RANGE: ImageCountRange = {
  wechat: { min: 1, max: 20 },
  xiaohongshu: { min: 3, max: 9 },
  video: { min: 0, max: 10 },
};

export const QUALITY_CONFIG = {
  minHKRScore: 6,
  wordCountRange: WORD_COUNT_RANGE,
  imageCountRange: IMAGE_COUNT_RANGE,
  requiredSteps: ['topic', 'review'] as RequiredStep[],
};

export interface QualityWeights {
  antiAI: number;
  hkr: number;
  wordCount: number;
  imageCount: number;
  workflow: number;
}

const DEFAULT_WEIGHTS: QualityWeights = {
  antiAI: 20,
  hkr: 15,
  wordCount: 15,
  imageCount: 10,
  workflow: 20,
};

const PLATFORM_WEIGHTS: Record<string, Record<string, Partial<QualityWeights>>> = {
  wechat: {
    '深度': { hkr: 25, antiAI: 20, wordCount: 15, imageCount: 5, workflow: 20 },
    '速递': { hkr: 10, antiAI: 15, wordCount: 20, imageCount: 5, workflow: 15 },
    '体验': { hkr: 15, antiAI: 20, wordCount: 10, imageCount: 15, workflow: 15 },
    '教程': { hkr: 10, antiAI: 15, wordCount: 15, imageCount: 20, workflow: 20 },
    '对话': { hkr: 20, antiAI: 25, wordCount: 10, imageCount: 5, workflow: 15 },
  },
  xiaohongshu: {
    '种草': { hkr: 10, antiAI: 15, wordCount: 10, imageCount: 30, workflow: 10 },
    '教程': { hkr: 10, antiAI: 15, wordCount: 15, imageCount: 25, workflow: 15 },
    '观点': { hkr: 20, antiAI: 20, wordCount: 10, imageCount: 15, workflow: 10 },
  },
  video: {
    '演示': { hkr: 10, antiAI: 10, wordCount: 20, imageCount: 5, workflow: 15 },
    '教程': { hkr: 15, antiAI: 10, wordCount: 20, imageCount: 10, workflow: 20 },
    '观点': { hkr: 20, antiAI: 15, wordCount: 15, imageCount: 5, workflow: 15 },
  },
};

export function getQualityWeights(platform: string, column: string): QualityWeights {
  return {
    ...DEFAULT_WEIGHTS,
    ...(PLATFORM_WEIGHTS[platform]?.[column] || {}),
  };
}

export function getQualityConfig(platform: string, column: string) {
  return {
    weights: getQualityWeights(platform, column),
    wordCountRange: QUALITY_CONFIG.wordCountRange[platform]?.[column] || { min: 0, max: Infinity },
    imageCountRange: QUALITY_CONFIG.imageCountRange[platform] || { min: 0, max: Infinity },
  };
}

export interface StructuralAIIssue {
  type: 'uniform_paragraphs' | 'repeated_sentence_openers' | 'uniform_headings';
  level: 'critical' | 'warning' | 'info';
  message: string;
}

export interface QualityCheckResult {
  passed: boolean;
  score: number;
  checks: {
    antiAI: {
      passed: boolean;
      issues: Array<{ pattern: string; action: string; level: 'must' | 'suggest'; count: number; positions: number[] }>;
      structuralIssues?: StructuralAIIssue[];
    };
    hkr: {
      passed: boolean;
      score: number | null;
      details: any;
    };
    wordCount: {
      passed: boolean;
      count: number;
      min: number;
      max: number;
    };
    imageCount: {
      passed: boolean;
      count: number;
      min: number;
      max: number;
    };
    workflowComplete: {
      passed: boolean;
      missingSteps: string[];
    };
  };
  suggestions: string[];
  overallComment: string;
}

export function scanAntiAIPatterns(content: string): Array<{ pattern: string; action: string; level: 'must' | 'suggest'; count: number; positions: number[] }> {
  const issues: Array<{ pattern: string; action: string; level: 'must' | 'suggest'; count: number; positions: number[] }> = [];

  for (const item of ANTI_AI_CHECKLIST) {
    try {
      const regex = new RegExp(item.pattern, 'gi');
      const matches = [...content.matchAll(regex)];

      if (matches.length > 0) {
        issues.push({
          pattern: item.pattern,
          action: item.action,
          level: item.level,
          count: matches.length,
          positions: matches.map((match) => match.index || 0),
        });
      }
    } catch {
      continue;
    }
  }

  return issues;
}

export function scanStructuralAIPatterns(content: string): StructuralAIIssue[] {
  const issues: StructuralAIIssue[] = [];
  const paragraphs = content.split(/\n\s*\n/).map((item) => item.trim()).filter(Boolean);

  if (paragraphs.length >= 4) {
    const lengths = paragraphs.map((item) => item.replace(/\s+/g, '').length);
    const avg = lengths.reduce((sum, value) => sum + value, 0) / lengths.length;
    const variance = lengths.reduce((sum, value) => sum + Math.pow(value - avg, 2), 0) / lengths.length;
    if (variance < 400) {
      issues.push({
        type: 'uniform_paragraphs',
        level: 'warning',
        message: '段落长度过于平均，可能存在机械生成痕迹。',
      });
    }
  }

  const lines = content.split('\n').map((line) => line.trim()).filter(Boolean);
  const headingLines = lines.filter((line) => /^#+\s/.test(line));
  if (headingLines.length >= 3) {
    const normalized = headingLines.map((line) => line.replace(/\d+/g, '#'));
    if (new Set(normalized).size <= 2) {
      issues.push({
        type: 'uniform_headings',
        level: 'info',
        message: '小标题格式过于统一，建议增加变化。',
      });
    }
  }

  const sentenceOpeners = content
    .split(/[。！？!?]\s*/)
    .map((sentence) => sentence.trim())
    .filter(Boolean)
    .map((sentence) => sentence.slice(0, 6));

  const openerCounts = new Map<string, number>();
  for (const opener of sentenceOpeners) {
    openerCounts.set(opener, (openerCounts.get(opener) || 0) + 1);
  }

  if ([...openerCounts.values()].some((count) => count >= 3)) {
    issues.push({
      type: 'repeated_sentence_openers',
      level: 'warning',
      message: '连续句式开头重复较多，建议调整节奏。',
    });
  }

  return issues;
}

export function checkWordCount(content: string, platform: string, column: string) {
  const cleanContent = content
    .replace(/^#+\s+.*$/gm, '')
    .replace(/!\[.*?\]\(.*?\)/g, '')
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
    .replace(/[*_~`#]/g, '')
    .replace(/```[\s\S]*?```/g, '')
    .replace(/`[^`]+`/g, '')
    .replace(/\s+/g, '')
    .trim();

  const count = cleanContent.length;
  const range = QUALITY_CONFIG.wordCountRange[platform]?.[column] || { min: 0, max: Infinity };

  return {
    passed: count >= range.min && count <= range.max,
    count,
    min: range.min,
    max: range.max,
  };
}

export function checkImageCount(content: string, platform: string) {
  const count = (content.match(/!\[.*?\]\(.*?\)/g) || []).length;
  const range = QUALITY_CONFIG.imageCountRange[platform] || { min: 0, max: Infinity };

  return {
    passed: count >= range.min && count <= range.max,
    count,
    min: range.min,
    max: range.max,
  };
}

export function checkWorkflowComplete(workflowData: any) {
  const missingSteps: string[] = [];

  for (const step of QUALITY_CONFIG.requiredSteps) {
    if (step === 'topic' && !workflowData?.topicDiscussion) {
      missingSteps.push('选题讨论');
    }
    if (step === 'review' && !workflowData?.review) {
      missingSteps.push('三遍审校');
    }
  }

  return {
    passed: missingSteps.length === 0,
    missingSteps,
  };
}

export function parseHKRScore(hkrData: any): { score: number | null; details: any } {
  if (!hkrData) {
    return { score: null, details: null };
  }

  if (typeof hkrData.overall === 'number') {
    return { score: hkrData.overall, details: hkrData };
  }

  if (hkrData.H && hkrData.K && hkrData.R) {
    const hScore = hkrData.H.score || 0;
    const kScore = hkrData.K.score || 0;
    const rScore = hkrData.R.score || 0;
    return {
      score: Math.round(((hScore + kScore + rScore) / 3) * 10) / 10,
      details: hkrData,
    };
  }

  return { score: null, details: hkrData };
}

export function performQualityCheck(params: {
  content: string;
  platform: string;
  column: string;
  workflowData: any;
  hkrScore?: any;
}): QualityCheckResult {
  const { content, platform, column, workflowData, hkrScore } = params;

  const antiAIIssues = scanAntiAIPatterns(content);
  const structuralIssues = scanStructuralAIPatterns(content);
  const antiAIPassed = antiAIIssues.filter(i => i.level === 'must').length === 0 && structuralIssues.every((issue) => issue.level !== 'critical');
  const hkrParsed = parseHKRScore(hkrScore);
  const hkrPassed = hkrParsed.score === null || hkrParsed.score >= QUALITY_CONFIG.minHKRScore;
  const wordCountResult = checkWordCount(content, platform, column);
  const imageCountResult = checkImageCount(content, platform);
  const workflowResult = checkWorkflowComplete(workflowData);
  const weights = getQualityWeights(platform, column);

  let score = 100;
  if (!antiAIPassed) score -= weights.antiAI;
  if (!hkrPassed && hkrParsed.score !== null) score -= weights.hkr;
  if (!wordCountResult.passed) score -= weights.wordCount;
  if (!imageCountResult.passed) score -= weights.imageCount;
  if (!workflowResult.passed) score -= weights.workflow;
  score = Math.max(0, score);

  const suggestions: string[] = [];

  if (antiAIIssues.length > 0) {
    const mustFix = antiAIIssues.filter(i => i.level === 'must');
    const suggest = antiAIIssues.filter(i => i.level === 'suggest');
    if (mustFix.length > 0) suggestions.push(`发现 ${mustFix.length} 个必须修改的 AI 表达问题，建议优先处理。`);
    if (suggest.length > 0) suggestions.push(`发现 ${suggest.length} 个建议修改的 AI 表达，可酌情调整。`);
  }

  for (const issue of structuralIssues) {
    suggestions.push(issue.message);
  }

  if (!hkrPassed && hkrParsed.score !== null) {
    suggestions.push(`HKR 综合评分 ${hkrParsed.score}，低于门槛 ${QUALITY_CONFIG.minHKRScore}。`);
  }

  if (!wordCountResult.passed) {
    suggestions.push(
      wordCountResult.count < wordCountResult.min
        ? `字数偏少，当前 ${wordCountResult.count}，至少需要 ${wordCountResult.min}。`
        : `字数偏多，当前 ${wordCountResult.count}，建议控制在 ${wordCountResult.max} 以内。`
    );
  }

  if (!imageCountResult.passed) {
    suggestions.push(
      imageCountResult.count < imageCountResult.min
        ? `配图不足，当前 ${imageCountResult.count}，至少需要 ${imageCountResult.min}。`
        : `配图过多，当前 ${imageCountResult.count}，上限为 ${imageCountResult.max}。`
    );
  }

  if (!workflowResult.passed) {
    suggestions.push(`缺少必要步骤：${workflowResult.missingSteps.join('、')}`);
  }

  const allPassed = antiAIPassed && hkrPassed && wordCountResult.passed && imageCountResult.passed && workflowResult.passed;

  let overallComment = '内容质量有待提升，建议修正后再发布。';
  if (allPassed) {
    overallComment = '内容质量达标，可以发布。';
  } else if (score >= 70) {
    overallComment = '内容质量良好，但仍有可优化项。';
  } else if (score >= 50) {
    overallComment = '内容质量一般，建议继续优化。';
  }

  return {
    passed: allPassed,
    score,
    checks: {
      antiAI: {
        passed: antiAIPassed,
        issues: antiAIIssues,
        structuralIssues,
      },
      hkr: {
        passed: hkrPassed,
        score: hkrParsed.score,
        details: hkrParsed.details,
      },
      wordCount: wordCountResult,
      imageCount: imageCountResult,
      workflowComplete: workflowResult,
    },
    suggestions,
    overallComment,
  };
}

export function quickQualityCheck(content: string): { passed: boolean; issues: string[] } {
  const issues: string[] = [];

  const antiAIIssues = scanAntiAIPatterns(content);
  if (antiAIIssues.length > 0) {
    issues.push(`发现 ${antiAIIssues.length} 个 AI 表达关键词。`);
  }

  const structuralIssues = scanStructuralAIPatterns(content);
  for (const issue of structuralIssues) {
    issues.push(issue.message);
  }

  if (content.replace(/\s+/g, '').trim().length < 100) {
    issues.push('内容过短，建议至少 100 字。');
  }

  return {
    passed: issues.length === 0,
    issues,
  };
}
