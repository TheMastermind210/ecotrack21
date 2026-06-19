import { useCallback, useState } from 'react';
import type { HistoryEntry } from '../../types';
import {
  getNarrativeRequest,
  parseActivityRequest,
} from './openRouterClient';

/**
 * Evaluate user's carbon reduction progress. Returns 0-100 score.
 *
 * Scoring weights:
 * - 60% improvement delta: did the latest entry improve vs prior? (reward trending down)
 * - 30% consistency: more logged entries = more engaged user (capped at 100 by clamp)
 * - 10% goal proximity: baseline offset (50 = neutral starting point)
 *
 * Score is clamped to [0, 100] and starts at 50 (neutral).
 */
/**
 * Custom React hook managing all AI-driven carbon tracking features.
 * Connects to OpenRouter to parse NLP activity inputs and generate
 * personalized reduction narratives.
 * 
 * @returns Object containing parsing/narrative functions and state flags
 */
export const useCarbonIntelligence = () => {
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /**
   * Parses free-text activity strings into structured carbon data.
   * Uses Anthropic Claude 3 Haiku via OpenRouter.
   * 
   * @param text - The raw activity text (e.g. "I drove 20 miles")
   * @returns A promise resolving to the structured NLPParsedResult
   * @throws Error if the API call fails or parsing is invalid
   */
  const parseActivity = useCallback(async (text: string) => {
    setIsProcessing(true);
    setError(null);
    try {
      return await parseActivityRequest(text);
    } catch (err) {
      setError('Failed to parse your activity. Please try rephrasing.');
      throw err;
    } finally {
      setIsProcessing(false);
    }
  }, []);

  /**
   * Analyzes recent carbon history to generate a single actionable insight.
   * Recommends counterfactual scenarios (e.g., "If you had... you would have saved...")
   * 
   * @param history - Array of recent user activities
   * @param signal - Optional AbortSignal for request cancellation
   * @returns A promise resolving to the generated narrative string
   */
  const getAttributionNarrative = useCallback(async (
    history: HistoryEntry[],
    signal?: AbortSignal,
  ) => {
    if (history.length === 0) return 'Not enough data yet.';
    
    try {
      return await getNarrativeRequest(history, signal);
    } catch (err: unknown) {
      if (err instanceof Error && err.name === 'AbortError') {
        throw err;
      }
      return 'Track more activities to unlock personalized insights.';
    }
  }, []);

  return { parseActivity, getAttributionNarrative, isProcessing, error };
};
