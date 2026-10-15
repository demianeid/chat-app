import {
  GoogleGenerativeAI,
  HarmCategory,
  HarmBlockThreshold,
} from '@google/generative-ai';


// ─── Env Validation ────────────────────────────────────────────────────────
const API_KEY = import.meta.env.VITE_GEMINI_API_KEY as string | undefined;
const MODEL_NAME = (import.meta.env.VITE_GEMINI_MODEL as string | undefined) ?? 'gemini-3.8-flash';
const GROQ_API_KEY = import.meta.env.VITE_GROQ_API_KEY as string | undefined;

if (!API_KEY && !GROQ_API_KEY) {
  throw new Error('[geminiService] Missing API keys in .env');
}

// ─── Typed Errors ──────────────────────────────────────────────────────────
export type ErrorCode =
  | 'API_KEY_INVALID'
  | 'RATE_LIMITED'
  | 'CONTENT_BLOCKED'
  | 'NETWORK_ERROR'
  | 'TIMEOUT'
  | 'SERVER_ERROR'
  | 'UNKNOWN';

export class AppError extends Error {
  readonly code: ErrorCode;
  readonly userMessage: string;

  constructor(code: ErrorCode, userMessage: string, cause?: unknown) {
    super(userMessage, { cause });
    this.name = 'AppError';
    this.code = code;
    this.userMessage = userMessage;
  }
}

// ─── Client & Models ───────────────────────────────────────────────────────
const genAI = API_KEY ? new GoogleGenerativeAI(API_KEY) : null;

const CANDIDATE_MODELS = [
  MODEL_NAME,
  'gemini-3.8-flash',
  'gemini-flash-lite-latest',
  'gemini-3.1-flash-lite',
  'gemini-3.5-flash',
].filter((m, i, arr) => arr.indexOf(m) === i);

const safetySettings = [
  { category: HarmCategory.HARM_CATEGORY_HARASSMENT,        threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE },
  { category: HarmCategory.HARM_CATEGORY_HATE_SPEECH,       threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE },
  { category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT, threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE },
  { category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT, threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE },
];

function getModel(name: string) {
  if (!genAI) throw new Error('Gemini API key not configured.');
  return genAI.getGenerativeModel({
    model: name,
    safetySettings,
  });
}

// ─── Error Mapping ─────────────────────────────────────────────────────────
function mapError(err: unknown): AppError {
  const message = err instanceof Error ? err.message.toLowerCase() : String(err).toLowerCase();

  if (message.includes('api key') || message.includes('api_key') || message.includes('401')) {
    return new AppError('API_KEY_INVALID', 'Invalid Gemini API key. Please check your settings in .env.', err);
  }
  if (message.includes('429') || message.includes('quota') || message.includes('rate limit')) {
    return new AppError(
      'RATE_LIMITED',
      'لقد تم استهلاك الحصة المجانية المؤقتة لموديل الصور (Rate Limit). يرجى الانتظار دقيقة والمحاولة مجدداً أو تجديد مفتاح Gemini API.',
      err
    );
  }
  if (message.includes('503') || message.includes('high demand') || message.includes('overloaded')) {
    return new AppError('SERVER_ERROR', 'The AI service is experiencing high demand (503). Please try again.', err);
  }
  if (message.includes('404') || message.includes('not found') || message.includes('no longer available')) {
    return new AppError('UNKNOWN', 'The configured AI model is not found or deprecated (404).', err);
  }
  if (message.includes('blocked') || message.includes('safety') || message.includes('recitation')) {
    return new AppError('CONTENT_BLOCKED', 'Response blocked by safety filters. Please try rephrasing.', err);
  }
  if (message.includes('timeout') || message.includes('timed out')) {
    return new AppError('TIMEOUT', 'Request timed out. Please try again.', err);
  }
  if (message.includes('failed to fetch') || message.includes('network') || message.includes('cors')) {
    return new AppError('NETWORK_ERROR', 'Network connection error. Please check your internet.', err);
  }

  console.error('[geminiService] Unmapped error:', err);
  return new AppError('UNKNOWN', `An unexpected error occurred: ${message}. Please try again.`, err);
}

// ─── Image Analysis with Multi-Model Fallbacks & Retry ───────────────────
/**
 * Analyzes an image using Gemini Vision with automatic retry and model fallbacks.
 */
export async function* analyzeImageStream(
  base64Data: string,
  mimeType: string,
  prompt: string = 'Analyze this image in detail and describe its contents.'
): AsyncGenerator<string> {
  let lastError: unknown = null;

  if (genAI) {
    for (const modelName of CANDIDATE_MODELS) {
      // Try each model with up to 2 attempts
      for (let attempt = 0; attempt < 2; attempt++) {
        try {
          const currentModel = getModel(modelName);
          const result = await currentModel.generateContentStream([
            {
              inlineData: {
                data: base64Data,
                mimeType: mimeType,
              },
            },
            prompt,
          ]);

          for await (const chunk of result.stream) {
            const text = chunk.text();
            if (text) yield text;
          }
          return; // Success!
        } catch (err: any) {
          lastError = err;
          const errMsg = String(err?.message ?? '').toLowerCase();

          // If rate limited, wait 3 seconds and retry same model once
          if (errMsg.includes('429') && attempt === 0) {
            console.warn(`[geminiService] Rate limited on ${modelName}, waiting 3s before retry...`);
            await new Promise((resolve) => setTimeout(resolve, 3000));
            continue;
          }

          console.warn(`[geminiService] Gemini model ${modelName} attempt ${attempt + 1} failed:`, err);
          break; // Move to next model
        }
      }
    }
  }

  if (lastError instanceof AppError) throw lastError;
  throw mapError(lastError);
}



