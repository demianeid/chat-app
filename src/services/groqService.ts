import Groq from 'groq-sdk';
import type { ChatCompletionMessageParam } from 'groq-sdk/resources/chat/completions';

// ─── Env Validation ────────────────────────────────────────────────────────
const API_KEY = import.meta.env.VITE_GROQ_API_KEY as string | undefined;
const MODEL   = (import.meta.env.VITE_GROQ_MODEL as string | undefined) ?? 'allam-2-7b';
const SEARCH_API_KEY = import.meta.env.VITE_WEB_SEARCH_API_KEY as string | undefined;

if (!API_KEY) {
  throw new Error('[groqService] Missing VITE_GROQ_API_KEY. Add it to your .env file.');
}

// ─── Typed Errors ──────────────────────────────────────────────────────────
export type ErrorCode =
  | 'API_KEY_INVALID'
  | 'RATE_LIMITED'
  | 'CONTENT_BLOCKED'
  | 'NETWORK_ERROR'
  | 'TIMEOUT'
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

// ─── Client ────────────────────────────────────────────────────────────────
const client = new Groq({ apiKey: API_KEY, dangerouslyAllowBrowser: true });

// ─── Multi-turn Chat History ───────────────────────────────────────────────
let chatHistory: ChatCompletionMessageParam[] = [];

export function resetChat(): void {
  chatHistory = [];
}

// ─── Error Mapping ─────────────────────────────────────────────────────────
function mapError(err: unknown): AppError {
  const msg = err instanceof Error ? err.message.toLowerCase() : String(err).toLowerCase();

  if (msg.includes('401') || msg.includes('invalid api key') || msg.includes('api_key')) {
    return new AppError('API_KEY_INVALID', 'Invalid Groq API key. Check your .env file.', err);
  }
  if (msg.includes('429') || msg.includes('rate limit') || msg.includes('quota')) {
    return new AppError('RATE_LIMITED', 'Too many requests. Please wait a moment and try again.', err);
  }
  if (msg.includes('timeout') || msg.includes('timed out')) {
    return new AppError('TIMEOUT', 'Request timed out. Please try again.', err);
  }
  if (msg.includes('failed to fetch') || msg.includes('network') || msg.includes('cors')) {
    return new AppError('NETWORK_ERROR', 'Network error. Check your internet connection.', err);
  }

  return new AppError('UNKNOWN', 'Something went wrong. Please try again.', err);
}

// ─── Arabic City Mapping & Normalization for Weather ───────────────────────
const ARABIC_CITY_MAP: Record<string, string> = {
  'اسكندرية': 'Alexandria',
  'الاسكندرية': 'Alexandria',
  'اسكندريه': 'Alexandria',
  'الاسكندريه': 'Alexandria',
  'الإسكندرية': 'Alexandria',
  'الإسكندريه': 'Alexandria',
  'القاهرة': 'Cairo',
  'القاهره': 'Cairo',
  'قاهرة': 'Cairo',
  'قاهره': 'Cairo',
  'الجيزة': 'Giza',
  'الجيزه': 'Giza',
  'جيزة': 'Giza',
  'جيزه': 'Giza',
  'المنصورة': 'Mansoura',
  'المنصوره': 'Mansoura',
  'طنطا': 'Tanta',
  'اسوان': 'Aswan',
  'أسوان': 'Aswan',
  'الاقصر': 'Luxor',
  'الأقصر': 'Luxor',
  'الغردقة': 'Hurghada',
  'الغردقه': 'Hurghada',
  'شرم الشيخ': 'Sharm El-Sheikh',
  'بورسعيد': 'Port Said',
  'بور سعيد': 'Port Said',
  'السويس': 'Suez',
  'الاسماعيلية': 'Ismailia',
  'الاسماعيليه': 'Ismailia',
  'الإسماعيلية': 'Ismailia',
  'الإسماعيليه': 'Ismailia',
  'دمياط': 'Damietta',
  'الزقازيق': 'Zagazig',
  'بنها': 'Banha',
  'دمنهور': 'Damanhour',
  'الفيوم': 'Fayoum',
  'بني سويف': 'Beni Suef',
  'المنيا': 'Minya',
  'اسيوط': 'Asyut',
  'أسيوط': 'Asyut',
  'سوهاج': 'Sohag',
  'قنا': 'Qena',
  'الرياض': 'Riyadh',
  'جدة': 'Jeddah',
  'جده': 'Jeddah',
  'مكة': 'Mecca',
  'مكه': 'Mecca',
  'المدينة': 'Medina',
  'المدينه': 'Medina',
  'الدمام': 'Dammam',
  'دبي': 'Dubai',
  'ابو ظبي': 'Abu Dhabi',
  'أبو ظبي': 'Abu Dhabi',
  'الدوحة': 'Doha',
  'الدوحه': 'Doha',
  'الكويت': 'Kuwait City',
  'المنامة': 'Manama',
  'المنامه': 'Manama',
  'مسقط': 'Muscat',
  'عمان': 'Amman',
  'بيروت': 'Beirut',
  'دمشق': 'Damascus',
  'بغداد': 'Baghdad',
  'القدس': 'Jerusalem',
  'غزة': 'Gaza',
  'غزه': 'Gaza',
  'طرابلس': 'Tripoli',
  'تونس': 'Tunis',
  'الجزائر': 'Algiers',
  'الرباط': 'Rabat',
  'الدار البيضاء': 'Casablanca',
  'كازابلانكا': 'Casablanca',
  'مراكش': 'Marrakesh',
  'الخرطوم': 'Khartoum',
  'صنعاء': 'Sanaa',
};

function getSearchCandidates(rawLocation: string): string[] {
  let cleaned = rawLocation
    .replace(/[?؟.,!;:()\[\]{}"'،]/g, ' ')
    .replace(/\b(اليوم|الآن|الان|غدا|غداً|بكرة|النهارده|حالياً|طقس|الطقس|جو|الجو|حرارة|درجة|درجه|الحرارة|الحراره|مناخ|المناخ|مدينة|مدينه|محافظة|محافظه|في|بـ|عن|ماهو|ما هو|كيف|weather|forecast|temperature|today|now|in|for|at|the)\b/gi, ' ')
    .trim();

  if (!cleaned) cleaned = rawLocation.trim();

  const candidates: string[] = [];
  const normalizedKey = cleaned.replace(/\s+/g, ' ').toLowerCase();

  if (ARABIC_CITY_MAP[normalizedKey]) {
    candidates.push(ARABIC_CITY_MAP[normalizedKey]);
  }

  candidates.push(cleaned);

  // Normalize ه/ة endings
  if (cleaned.endsWith('ه')) {
    candidates.push(cleaned.slice(0, -1) + 'ة');
  } else if (cleaned.endsWith('ة')) {
    candidates.push(cleaned.slice(0, -1) + 'ه');
  }

  // Handle 'ال' prefix
  if (cleaned.startsWith('ال') && cleaned.length > 4) {
    const withoutAl = cleaned.slice(2);
    candidates.push(withoutAl);
    if (ARABIC_CITY_MAP[withoutAl]) {
      candidates.push(ARABIC_CITY_MAP[withoutAl]);
    }
  }

  // Normalize Alef forms: ا / إ / أ / آ
  if (cleaned.startsWith('ا')) {
    candidates.push('إ' + cleaned.slice(1));
    candidates.push('أ' + cleaned.slice(1));
  } else if (cleaned.startsWith('إ') || cleaned.startsWith('أ')) {
    candidates.push('ا' + cleaned.slice(1));
  }

  return [...new Set(candidates.filter(c => c.length > 1))];
}

// ─── Tools ─────────────────────────────────────────────────────────────────

export type Source = { title: string; url: string; snippet: string };

async function fetchWeather(location: string): Promise<string> {
  try {
    const candidates = getSearchCandidates(location);
    let geoResult: any = null;

    for (const cand of candidates) {
      // 1. Try Arabic geocoding
      try {
        const geoResAr = await fetch(`https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(cand)}&count=1&language=ar`);
        const dataAr = await geoResAr.json();
        if (dataAr.results && dataAr.results.length > 0) {
          geoResult = dataAr.results[0];
          break;
        }
      } catch {
        // continue
      }

      // 2. Try Standard / English geocoding
      try {
        const geoResEn = await fetch(`https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(cand)}&count=1`);
        const dataEn = await geoResEn.json();
        if (dataEn.results && dataEn.results.length > 0) {
          geoResult = dataEn.results[0];
          break;
        }
      } catch {
        // continue
      }
    }

    if (!geoResult) {
      return `City not found: ${location}`;
    }

    const { latitude, longitude, name, country } = geoResult;
    const weatherRes = await fetch(
      `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&current=temperature_2m,relative_humidity_2m,apparent_temperature,wind_speed_10m&daily=temperature_2m_max,temperature_2m_min&timezone=auto`
    );
    const weatherData = await weatherRes.json();

    const temp = weatherData.current?.temperature_2m ?? 'N/A';
    const feelsLike = weatherData.current?.apparent_temperature ?? temp;
    const humidity = weatherData.current?.relative_humidity_2m ?? 'N/A';
    const wind = weatherData.current?.wind_speed_10m ?? 'N/A';

    const todayMax = weatherData.daily?.temperature_2m_max?.[0] ?? 'N/A';
    const todayMin = weatherData.daily?.temperature_2m_min?.[0] ?? 'N/A';
    const tomorrowMax = weatherData.daily?.temperature_2m_max?.[1] ?? 'N/A';
    const tomorrowMin = weatherData.daily?.temperature_2m_min?.[1] ?? 'N/A';

    return `City of ${name}, ${country || ''}:
- Current Temperature: ${temp}°C (Feels like: ${feelsLike}°C)
- Humidity: ${humidity}%
- Wind Speed: ${wind} km/h
- Today's Forecast: High ${todayMax}°C, Low ${todayMin}°C
- Tomorrow's Forecast: High ${tomorrowMax}°C, Low ${tomorrowMin}°C`;
  } catch (err) {
    return `Error fetching weather for ${location}.`;
  }
}

export type SearchResult = { sources: Source[], answer?: string };

async function fetchWebSearch(query: string): Promise<SearchResult> {
  if (!SEARCH_API_KEY) {
    throw new Error('VITE_WEB_SEARCH_API_KEY is missing in .env');
  }

  const res = await fetch('https://api.tavily.com/search', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      api_key: SEARCH_API_KEY,
      query: query,
      search_depth: "advanced",
      include_answer: true,
      max_results: 3
    })
  });

  if (!res.ok) {
    throw new Error(`Search API failed with status ${res.status}`);
  }

  const data = await res.json();
  return {
    answer: data.answer,
    sources: data.results.map((r: any) => ({
      title: r.title,
      url: r.url,
      snippet: r.content
    }))
  };
}

// ─── Intent Analyzer (Keyword-based - Fast & Reliable) ─────────────────────
function analyzeIntent(text: string): { action: 'weather' | 'search' | 'none', query?: string } {
  const t = text.trim().toLowerCase();
  const today = new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });

  // ── Weather detection ──
  const weatherKeywords = ['طقس', 'weather', 'حرارة', 'درجة الحرارة', 'درجه الحراره', 'درجة حرارة', 'مناخ', 'رياح', 'رطوبة', 'جو', 'الجو', 'أمطار', 'مطر', 'غيوم', 'forecast', 'temperature'];
  const isWeather = weatherKeywords.some(k => t.includes(k));

  if (isWeather) {
    // Extract city name using common Arabic/English patterns
    const cityPatterns = [
      /(?:في|بـ|ب|in|at|for)\s+(?:city|town|مدينة|محافظة|مدينه|محافظه)?\s*([^\?،.؟]+)/i,
      /(?:طقس|weather|حرارة|جو|مناخ)\s+(?:city|مدينة|محافظة|مدينه|محافظه)?\s*([^\?،.؟]+)/i,
    ];
    let city = '';
    for (const pattern of cityPatterns) {
      const match = text.match(pattern);
      if (match) { city = match[1].trim(); break; }
    }
    if (!city) city = text; // fallback: pass whole text and let search candidates handle it
    return { action: 'weather', query: city };
  }

  // ── Time/Date detection (answer locally, no search needed) ──
  const timeKeywords = ['الساعة', 'الوقت', 'وقت', 'ساعة كم', 'كم الساعه', 'كم الساعة', 'what time', 'current time', 'التاريخ اليوم', 'اليوم كام', 'today date'];
  if (timeKeywords.some(k => t.includes(k))) {
    return { action: 'none' };
  }

  // ── Search detection ──
  const searchKeywords = [
    // Sports
    'ماتش', 'مباراة', 'مباريات', 'match', 'score', 'goal', 'دوري', 'كأس', 'نتيجة', 'بطولة', 'league',
    // Prices & Finance
    'سعر', 'price', 'يساوي كام', 'بكام', 'اسعار', 'يعادل', 'صرف', 'بورصة', 'سهم', 'نفط', 'بترول', 'stock', 'crypto', 'bitcoin',
    // News
    'اخبار', 'news', 'أخبار', 'حدث', 'حوادث', 'آخر', 'جديد', 'تحديث', 'اليوم', 'امبارح', 'امس', 'latest',
    // Technology
    'إصدار', 'version', 'update', 'تحديث', 'اصدار', 'release',
    // General live queries
    'الآن', 'حالياً', 'الحالي', 'current', 'latest', 'recent', 'live', 'who won', 'who is',
  ];

  const isSearch = searchKeywords.some(k => t.includes(k));
  if (isSearch) {
    // Build a search query from the original text + today's date for time-sensitive queries
    const timeSensitive = ['اليوم', 'امبارح', 'امس', 'الآن', 'حالياً', 'today', 'yesterday', 'now', 'latest', 'current'];
    const addDate = timeSensitive.some(k => t.includes(k));
    const query = `${text.trim()}${addDate ? ` ${today}` : ''}`;
    return { action: 'search', query };
  }

  return { action: 'none' };
}

// ─── Public API ────────────────────────────────────────────────────────────

export type StreamEvent = 
  | { type: 'chunk', text: string }
  | { type: 'status', text: string }
  | { type: 'sources', sources: Source[] };

export async function* streamMessage(userMessage: string): AsyncGenerator<StreamEvent> {
  chatHistory.push({ role: 'user', content: userMessage });
  let fullResponse = '';

  try {
    // 1. Tool Routing (Keyword-based, instant)
    const intent = analyzeIntent(userMessage);
    
    // Create a temporary array for this specific API call to avoid polluting global history
    const currentTime = new Date().toLocaleString('en-US', { dateStyle: 'full', timeStyle: 'short' });
    
    let messagesToSend: any[] = [
      { role: 'system', content: `You are an intelligent, helpful AI assistant. (Background info: Current time and date is ${currentTime}). Respond naturally in the language used by the user.` },
      ...chatHistory
    ];
    
    if (intent.action === 'weather' && intent.query) {
      yield { type: 'status', text: "\n*(Checking live weather from satellites... 🛰️)*\n\n" };
      const weatherData = await fetchWeather(intent.query);
      
      messagesToSend.push({
        role: 'system',
        content: `[Live Satellite Weather Data - Open-Meteo API]
${weatherData}

Instructions: Provide the user with direct, accurate numbers in 1-2 sentences. Avoid unnecessary filler or apologies.`
      });

    } else if (intent.action === 'search' && intent.query) {
      yield { type: 'status', text: "\n*(Searching the web... 🌐)*\n\n" };
      
      try {
        const searchRes = await fetchWebSearch(intent.query);
        yield { type: 'sources', sources: searchRes.sources };
        
        const sourcesText = searchRes.sources.map((s, i) => `Source ${i+1}:\nTitle: ${s.title}\nSnippet: ${s.snippet}`).join('\n\n');
        
        messagesToSend.push({
          role: 'system',
          content: `[Web Search Results - Use this information to answer]:
${searchRes.answer ? `Summary: ${searchRes.answer}\n` : ''}${sourcesText}

Provide a concise, direct answer in up to 3 bullet points.`
        });

        // Pre-seed the assistant response
        messagesToSend.push({
          role: 'assistant',
          content: 'Based on the latest available data:\n'
        });
      } catch (searchErr) {
        console.error('Search failed:', searchErr);
        yield { type: 'status', text: "\n*(Web search unavailable. Answering based on existing knowledge.)*\n\n" };
      }
    }

    // 2. Normal Conversation Stream
    const stream = await client.chat.completions.create({
      model: MODEL,
      messages: messagesToSend,
      stream: true,
      max_tokens: 512,
      temperature: 0.2,
      stop: [
        'يرجى مراعاة',
        'يرجى ملاحظة',
        'كمساعد ذكاء اصطناعي',
        'يُفضل التواصل',
      ]
    });

    for await (const chunk of stream) {
      const text = chunk.choices[0]?.delta?.content ?? '';
      if (text) {
        fullResponse += text;
        yield { type: 'chunk', text };
      }
    }

    // Save only the clean assistant response to the global history
    chatHistory.push({ role: 'assistant', content: fullResponse });

  } catch (err) {
    if (chatHistory[chatHistory.length - 1]?.role === 'user') {
      chatHistory.pop();
    }
    if (err instanceof AppError) throw err;
    throw mapError(err);
  }
}
