import { Request, Response } from 'express';
import { store } from '../db/store.js';
import { askAssistant } from '../services/assistantService.js';
import { validatePlan, Plan } from '../services/localPlanner.js';

let activeRequests = 0;

export const handleChatQuery = async (req: Request, res: Response) => {
  const { question, history, previousPlan } = req.body;
  if (typeof question !== 'string' || !question.trim() || question.length > 4000) {
    return res.status(400).json({ error: 'Please enter a question between 1 and 4,000 characters.' });
  }
  if (history !== undefined && (!Array.isArray(history) || history.length > 16 || history.some(h => typeof h !== 'string' || h.length > 4000))) {
    return res.status(400).json({ error: 'Invalid conversation history.' });
  }
  let prior: Plan | undefined;
  try { if (previousPlan) prior = validatePlan(previousPlan); }
  catch { return res.status(400).json({ error: 'Invalid previous query context. Please start a new conversation.' }); }
  if (activeRequests >= 4) return res.status(429).json({ error: 'The assistant is busy. Please try again shortly.' });
  activeRequests++;
  const h = history ?? [];
  try {
    const answer = await askAssistant(question.trim(), h, store, prior);
    return res.json(answer);
  } catch (err) {
    console.error('Error in handleChatQuery:', err);
    return res.status(503).json({ error: 'The assistant could not complete this query. Please simplify the question or try again.' });
  } finally {
    activeRequests--;
  }
};
