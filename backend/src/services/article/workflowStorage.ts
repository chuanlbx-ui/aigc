import { PrismaClient } from '@prisma/client';
import type { WorkflowData } from './workflow.js';

const prisma = new PrismaClient();

type WorkflowStepStatus = 'pending' | 'in_progress' | 'completed' | 'skipped';

const WORKFLOW_FIELD_TO_STEP: Array<{ step: number; fields: string[] }> = [
  { step: 0, fields: ['understanding', 'requirement'] },
  { step: 1, fields: ['topicDiscussion'] },
  { step: 2, fields: ['search', 'searchResults'] },
  { step: 3, fields: ['collaboration'] },
  { step: 4, fields: ['style'] },
  { step: 5, fields: ['materials'] },
  { step: 6, fields: ['waiting'] },
  { step: 7, fields: ['draft'] },
  { step: 8, fields: ['review'] },
];

function getStepPayload(workflowData: WorkflowData, step: number): Record<string, unknown> | null {
  const definition = WORKFLOW_FIELD_TO_STEP.find((item) => item.step === step);
  if (!definition) {
    return null;
  }

  const payload: Record<string, unknown> = {};
  for (const field of definition.fields) {
    const value = (workflowData as Record<string, unknown>)[field];
    if (value !== undefined) {
      payload[field] = value;
    }
  }

  return Object.keys(payload).length > 0 ? payload : null;
}

function inferStatus(payload: Record<string, unknown> | null, step: number, currentStep?: number): WorkflowStepStatus {
  if (!payload) {
    return currentStep !== undefined && step < currentStep ? 'skipped' : 'pending';
  }

  const values = Object.values(payload);
  const completed = values.some((value) => {
    if (!value || typeof value !== 'object') {
      return false;
    }

    const completedAt = (value as { completedAt?: string }).completedAt;
    return Boolean(completedAt);
  });

  if (completed) {
    return 'completed';
  }

  if (currentStep !== undefined && currentStep === step) {
    return 'in_progress';
  }

  return 'completed';
}

function inferCompletedAt(payload: Record<string, unknown> | null): Date | null {
  if (!payload) {
    return null;
  }

  for (const value of Object.values(payload)) {
    if (value && typeof value === 'object') {
      const completedAt = (value as { completedAt?: string }).completedAt;
      if (completedAt) {
        const parsed = new Date(completedAt);
        if (!Number.isNaN(parsed.getTime())) {
          return parsed;
        }
      }
    }
  }

  return null;
}

export async function syncWorkflowSteps(
  articleId: string,
  workflowData: WorkflowData,
  currentStep?: number
): Promise<void> {
  for (const definition of WORKFLOW_FIELD_TO_STEP) {
    const payload = getStepPayload(workflowData, definition.step);
    const status = inferStatus(payload, definition.step, currentStep);
    const completedAt = status === 'completed' ? inferCompletedAt(payload) || new Date() : null;

    await prisma.workflowStep.upsert({
      where: {
        articleId_step: {
          articleId,
          step: definition.step,
        },
      },
      create: {
        articleId,
        step: definition.step,
        status,
        data: JSON.stringify(payload || {}),
        completedAt,
      },
      update: {
        status,
        data: JSON.stringify(payload || {}),
        completedAt,
      },
    });
  }
}

export async function hydrateWorkflowDataFromSteps(articleId: string): Promise<WorkflowData> {
  const steps = await prisma.workflowStep.findMany({
    where: { articleId },
    orderBy: { step: 'asc' },
  });

  const workflowData: WorkflowData = {};
  for (const step of steps) {
    try {
      const parsed = JSON.parse(step.data || '{}') as WorkflowData;
      Object.assign(workflowData, parsed);
    } catch {
      continue;
    }
  }

  return workflowData;
}

export async function getEffectiveWorkflowData(articleId: string, workflowJson?: string | null): Promise<WorkflowData> {
  try {
    const parsed = workflowJson ? JSON.parse(workflowJson) as WorkflowData : {};
    if (Object.keys(parsed).length > 0) {
      return parsed;
    }
  } catch {
    // Fallback to structured storage below.
  }

  return hydrateWorkflowDataFromSteps(articleId);
}
