// 发布前质量门槛服务
// 确保内容质量达标才能发布

import { ANTI_AI_CHECKLIST, HKR_DIMENSIONS } from './prompts.js';

// 质量检查配置
export const QUALITY_CONFIG = {
  // HKR 最低分数门槛
  minHKRScore: 6,
  // 字数范围（按平台/栏目）
  wordCountRange: {
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
  },
  // 图片数量要求
  imageCountRange: {
    wechat: { min: 1, max: 20 },
    xiaohongshu: { min: 3, max: 9 },
    video: { min: 0, max: 10 },
  },
  // 必须完成的步骤
  requiredSteps: ['topic', 'review'],
};

// 质量检查结果接口
export interface QualityCheckResult {
  passed: boolean;
  score: number;
  checks: {
    antiAI: {
      passed: boolean;
      issues: Array<{ pattern: string; action: string; count: number; positions: number[] }>;
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

/**
 * 降AI味关键词扫描
 */
export function scanAntiAIPatterns(content: string): Array<{ pattern: string; action: string; count: number; positions: number[] }> {
  const issues: Array<{ pattern: string; action: string; count: number; positions: number[] }> = [];

  for (const item of ANTI_AI_CHECKLIST) {
    // 将模式转换为正则表达式
    let regex: RegExp;
    try {
      // 处理带有 .* 的模式
      if (item.pattern.includes('.*')) {
        regex = new RegExp(item.pattern, 'gi');
      } else {
        regex = new RegExp(item.pattern, 'gi');
      }
    } catch {
      continue;
    }

    const matches = [...content.matchAll(regex)];
    if (matches.length > 0) {
      const positions = matches.map(m => m.index || 0);
      issues.push({
        pattern: item.pattern,
        action: item.action,
        count: matches.length,
        positions,
      });
    }
  }

  return issues;
}

/**
 * 检查字数
 */
export function checkWordCount(content: string, platform: string, column: string): {
  passed: boolean;
  count: number;
  min: number;
  max: number;
} {
  // 移除 Markdown 语法后计算字数
  const cleanContent = content
    .replace(/^#+\s+.*$/gm, '') // 标题
    .replace(/!\[.*?\]\(.*?\)/g, '') // 图片
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1') // 链接
    .replace(/[*_~`#]/g, '') // 格式符号
    .replace(/```[\s\S]*?```/g, '') // 代码块
    .replace(/`[^`]+`/g, '') // 行内代码
    .replace(/\s+/g, '') // 空白字符
    .trim();

  const count = cleanContent.length;
  const range = QUALITY_CONFIG.wordCountRange[platform]?.[column] || { min: 0, max: Infinity };
  const passed = count >= range.min && count <= range.max;

  return { passed, count, min: range.min, max: range.max };
}

/**
 * 检查图片数量
 */
export function checkImageCount(content: string, platform: string): {
  passed: boolean;
  count: number;
  min: number;
  max: number;
} {
  const matches = content.match(/!\[.*?\]\(.*?\)/g) || [];
  const count = matches.length;
  const range = QUALITY_CONFIG.imageCountRange[platform] || { min: 0, max: Infinity };
  const passed = count >= range.min && count <= range.max;

  return { passed, count, min: range.min, max: range.max };
}

/**
 * 检查工作流完成度
 */
export function checkWorkflowComplete(workflowData: any): {
  passed: boolean;
  missingSteps: string[];
} {
  const missingSteps: string[] = [];

  for (const step of QUALITY_CONFIG.requiredSteps) {
    if (step === 'topic' && !workflowData.topicDiscussion) {
      missingSteps.push('选题讨论');
    }
    if (step === 'review' && !workflowData.review) {
      missingSteps.push('三遍审校');
    }
  }

  return {
    passed: missingSteps.length === 0,
    missingSteps,
  };
}

/**
 * 解析 HKR 评分
 */
export function parseHKRScore(hkrData: any): { score: number | null; details: any } {
  if (!hkrData) {
    return { score: null, details: null };
  }

  // 如果已经是分数格式
  if (typeof hkrData.overall === 'number') {
    return { score: hkrData.overall, details: hkrData };
  }

  // 尝试计算平均分
  if (hkrData.H && hkrData.K && hkrData.R) {
    const hScore = hkrData.H.score || 0;
    const kScore = hkrData.K.score || 0;
    const rScore = hkrData.R.score || 0;
    const overall = Math.round((hScore + kScore + rScore) / 3 * 10) / 10;
    return { score: overall, details: hkrData };
  }

  return { score: null, details: hkrData };
}

/**
 * 执行完整质量检查
 */
export function performQualityCheck(params: {
  content: string;
  platform: string;
  column: string;
  workflowData: any;
  hkrScore?: any;
}): QualityCheckResult {
  const { content, platform, column, workflowData, hkrScore } = params;

  // 1. 降AI味检查
  const antiAIIssues = scanAntiAIPatterns(content);
  const antiAIPassed = antiAIIssues.length === 0;

  // 2. HKR 分数检查
  const hkrParsed = parseHKRScore(hkrScore);
  const hkrPassed = hkrParsed.score === null || hkrParsed.score >= QUALITY_CONFIG.minHKRScore;

  // 3. 字数检查
  const wordCountResult = checkWordCount(content, platform, column);

  // 4. 图片数量检查
  const imageCountResult = checkImageCount(content, platform);

  // 5. 工作流完成度检查
  const workflowResult = checkWorkflowComplete(workflowData);

  // 计算综合分数
  const checks = {
    antiAI: {
      passed: antiAIPassed,
      issues: antiAIIssues,
    },
    hkr: {
      passed: hkrPassed,
      score: hkrParsed.score,
      details: hkrParsed.details,
    },
    wordCount: wordCountResult,
    imageCount: imageCountResult,
    workflowComplete: workflowResult,
  };

  // 计算总分（0-100）
  let score = 100;
  if (!antiAIPassed) score -= 20;
  if (!hkrPassed && hkrParsed.score !== null) score -= 15;
  if (!wordCountResult.passed) score -= 15;
  if (!imageCountResult.passed) score -= 10;
  if (!workflowResult.passed) score -= 20;
  score = Math.max(0, score);

  // 生成建议
  const suggestions: string[] = [];
  
  if (!antiAIPassed) {
    suggestions.push(`发现 ${antiAIIssues.length} 个 AI 味关键词问题，建议逐一修改`);
    antiAIIssues.slice(0, 3).forEach(issue => {
      suggestions.push(`  - "${issue.pattern}" 出现 ${issue.count} 次，${issue.action}`);
    });
  }

  if (!hkrPassed && hkrParsed.score !== null) {
    suggestions.push(`HKR 综合评分 ${hkrParsed.score} 分，低于门槛 ${QUALITY_CONFIG.minHKRScore} 分，建议改进内容质量`);
    if (hkrParsed.details?.suggestions) {
      hkrParsed.details.suggestions.slice(0, 2).forEach((s: string) => {
        suggestions.push(`  - ${s}`);
      });
    }
  }

  if (!wordCountResult.passed) {
    if (wordCountResult.count < wordCountResult.min) {
      suggestions.push(`字数 ${wordCountResult.count} 字，低于最低要求 ${wordCountResult.min} 字`);
    } else {
      suggestions.push(`字数 ${wordCountResult.count} 字，超出上限 ${wordCountResult.max} 字`);
    }
  }

  if (!imageCountResult.passed) {
    if (imageCountResult.count < imageCountResult.min) {
      suggestions.push(`配图 ${imageCountResult.count} 张，建议至少 ${imageCountResult.min} 张`);
    } else {
      suggestions.push(`配图 ${imageCountResult.count} 张，超过上限 ${imageCountResult.max} 张`);
    }
  }

  if (!workflowResult.passed) {
    suggestions.push(`缺少必要步骤：${workflowResult.missingSteps.join('、')}`);
  }

  // 总体评价
  let overallComment = '';
  const allPassed = antiAIPassed && hkrPassed && wordCountResult.passed && imageCountResult.passed && workflowResult.passed;
  
  if (allPassed) {
    overallComment = '内容质量达标，可以发布';
  } else if (score >= 70) {
    overallComment = '内容质量良好，但仍有改进空间';
  } else if (score >= 50) {
    overallComment = '内容质量一般，建议改进后再发布';
  } else {
    overallComment = '内容质量不达标，请根据建议修改后再发布';
  }

  return {
    passed: allPassed,
    score,
    checks,
    suggestions,
    overallComment,
  };
}

/**
 * 快速质量检查（仅检查关键项）
 */
export function quickQualityCheck(content: string): {
  passed: boolean;
  issues: string[];
} {
  const issues: string[] = [];

  // 降AI味检查
  const antiAIIssues = scanAntiAIPatterns(content);
  if (antiAIIssues.length > 0) {
    issues.push(`发现 ${antiAIIssues.length} 个 AI 味关键词`);
  }

  // 最小字数检查
  const cleanContent = content.replace(/\s+/g, '').trim();
  if (cleanContent.length < 100) {
    issues.push('内容过短，建议至少 100 字');
  }

  return {
    passed: issues.length === 0,
    issues,
  };
}
