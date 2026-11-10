import type { AiAnswer } from '../types';
import { http } from './api';

export async function ask(question: string, history: string[] = [], previousPlan?: unknown): Promise<AiAnswer> {
  return http<AiAnswer>('/api/chat/query', {
    method: 'POST', body: JSON.stringify({ question, history, previousPlan }),
    signal: AbortSignal.timeout(35000)
  });
}
export const getAssistantStatus = () => http<{ mode: string; configured: boolean; provider?: 'ollama' | 'gemini' | null; examples: string[] }>('/api/chat/status');
