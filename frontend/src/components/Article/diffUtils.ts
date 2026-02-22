// 简单的行级差异对比工具

export interface DiffLine {
  type: 'add' | 'delete' | 'unchanged';
  content: string;
  lineNumber?: number;
}

export interface DiffResult {
  lines: DiffLine[];
  stats: {
    added: number;
    deleted: number;
    unchanged: number;
  };
}

// 计算两个文本的行级差异
export function computeDiff(oldText: string, newText: string): DiffResult {
  const oldLines = oldText.split('\n');
  const newLines = newText.split('\n');

  const result: DiffLine[] = [];
  const stats = { added: 0, deleted: 0, unchanged: 0 };

  // 使用简单的 LCS 算法进行差异比较
  const lcs = computeLCS(oldLines, newLines);

  let oldIdx = 0;
  let newIdx = 0;
  let lcsIdx = 0;

  while (oldIdx < oldLines.length || newIdx < newLines.length) {
    if (lcsIdx < lcs.length && oldIdx < oldLines.length && oldLines[oldIdx] === lcs[lcsIdx]) {
      if (newIdx < newLines.length && newLines[newIdx] === lcs[lcsIdx]) {
        // 相同行
        result.push({ type: 'unchanged', content: oldLines[oldIdx] });
        stats.unchanged++;
        oldIdx++;
        newIdx++;
        lcsIdx++;
      } else {
        // 新增行
        result.push({ type: 'add', content: newLines[newIdx] });
        stats.added++;
        newIdx++;
      }
    } else if (oldIdx < oldLines.length) {
      // 删除行
      result.push({ type: 'delete', content: oldLines[oldIdx] });
      stats.deleted++;
      oldIdx++;
    } else if (newIdx < newLines.length) {
      // 新增行
      result.push({ type: 'add', content: newLines[newIdx] });
      stats.added++;
      newIdx++;
    }
  }

  return { lines: result, stats };
}

// 计算最长公共子序列
function computeLCS(arr1: string[], arr2: string[]): string[] {
  const m = arr1.length;
  const n = arr2.length;
  const dp: number[][] = Array(m + 1).fill(null).map(() => Array(n + 1).fill(0));

  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      if (arr1[i - 1] === arr2[j - 1]) {
        dp[i][j] = dp[i - 1][j - 1] + 1;
      } else {
        dp[i][j] = Math.max(dp[i - 1][j], dp[i][j - 1]);
      }
    }
  }

  // 回溯找出 LCS
  const lcs: string[] = [];
  let i = m, j = n;
  while (i > 0 && j > 0) {
    if (arr1[i - 1] === arr2[j - 1]) {
      lcs.unshift(arr1[i - 1]);
      i--;
      j--;
    } else if (dp[i - 1][j] > dp[i][j - 1]) {
      i--;
    } else {
      j--;
    }
  }

  return lcs;
}
