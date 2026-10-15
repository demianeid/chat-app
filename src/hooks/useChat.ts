import { useState, useRef } from 'react';
import { streamMessage, resetChat } from '../services/groqService';
import { analyzeImageStream } from '../services/geminiService';
import type { Source } from '../services/groqService';

export type Message = {
  id: string;
  text: string;
  sender: 'user' | 'bot';
  isStreaming?: boolean;
  sources?: Source[];
  status?: string;
  imageUrl?: string;
  failed?: boolean;
  retryData?: { text: string; image?: { base64: string; mimeType: string; previewUrl: string } };
};

export function useChat() {
  const [history, setHistory] = useState<Message[]>([]);
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pendingImage, setPendingImage] = useState<{ base64: string; mimeType: string; previewUrl: string } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // ── Image picker ─────────────────────────────────────────────────────────
  const pickImage = () => fileInputRef.current?.click();

  const onFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = reader.result as string;
      const [header, base64] = dataUrl.split(',');
      const mimeType = header.match(/data:(.*);base64/)?.[1] ?? 'image/jpeg';
      setPendingImage({ base64, mimeType, previewUrl: dataUrl });
    };
    reader.readAsDataURL(file);
    // reset so same file can be re-selected
    e.target.value = '';
  };

  const removePendingImage = () => setPendingImage(null);

  // ── Send message (text or image+text) ────────────────────────────────────
  const sendMessage = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const trimmed = message.trim();
    if ((!trimmed && !pendingImage) || loading) return;

    const hasImage = !!pendingImage;
    const imageToSend = pendingImage;

    // Build user message for UI
    const userMsg: Message = {
      id: `user-${Date.now()}`,
      text: trimmed || (hasImage ? '🖼️ Attached image' : ''),
      sender: 'user',
      imageUrl: imageToSend?.previewUrl,
      retryData: { text: trimmed, image: imageToSend ?? undefined },
    };

    setHistory((prev) => [...prev, userMsg]);
    setMessage('');
    setPendingImage(null);
    setLoading(true);
    setError(null);

    const botMsgId = `bot-${Date.now()}`;
    setHistory((prev) => [
      ...prev,
      { id: botMsgId, text: '', sender: 'bot', isStreaming: true },
    ]);

    try {
      if (hasImage && imageToSend) {
        // ── Vision path: use Gemini ─────────────────────────────────────
        setHistory((prev) =>
          prev.map((msg) =>
            msg.id === botMsgId ? { ...msg, status: '*(Analyzing image with Gemini Vision... 🔍)*' } : msg
          )
        );

        const prompt = trimmed || 'Analyze this image in detail and explain everything you see.';

        for await (const chunk of analyzeImageStream(imageToSend.base64, imageToSend.mimeType, prompt)) {
          setHistory((prev) =>
            prev.map((msg) =>
              msg.id === botMsgId ? { ...msg, text: msg.text + chunk, status: undefined } : msg
            )
          );
        }
      } else {
        // ── Text path: use Groq ─────────────────────────────────────────
        for await (const event of streamMessage(trimmed)) {
          if (event.type === 'chunk') {
            setHistory((prev) =>
              prev.map((msg) =>
                msg.id === botMsgId ? { ...msg, text: msg.text + event.text, status: undefined } : msg
              )
            );
          } else if (event.type === 'status') {
            setHistory((prev) =>
              prev.map((msg) =>
                msg.id === botMsgId ? { ...msg, status: event.text } : msg
              )
            );
          } else if (event.type === 'sources') {
            setHistory((prev) =>
              prev.map((msg) =>
                msg.id === botMsgId ? { ...msg, sources: event.sources } : msg
              )
            );
          }
        }
      }

      setHistory((prev) =>
        prev.map((msg) =>
          msg.id === botMsgId ? { ...msg, isStreaming: false } : msg
        )
      );
    } catch (err) {
      // Mark the user message as failed so a Retry button appears
      setHistory((prev) =>
        prev.map((msg) =>
          msg.id === userMsg.id ? { ...msg, failed: true } : msg
        )
      );
      setHistory((prev) => prev.filter((msg) => msg.id !== botMsgId));
      const userMessage =
        (err as any)?.userMessage || 'Something went wrong. Please try again.';
      setError(userMessage);
      console.error('[useChat] sendMessage error:', err);
    } finally {
      setLoading(false);
    }
  };

  // ── Retry last failed message ─────────────────────────────────────────────
  const retryMessage = async (msgId: string) => {
    const failedMsg = history.find((m) => m.id === msgId);
    if (!failedMsg?.retryData) return;

    // Clear the failed state
    setHistory((prev) =>
      prev.map((m) => m.id === msgId ? { ...m, failed: false } : m)
    );
    setError(null);

    const { text: retryText, image: retryImage } = failedMsg.retryData;
    const botMsgId = `bot-${Date.now()}`;
    setHistory((prev) => [
      ...prev,
      { id: botMsgId, text: '', sender: 'bot', isStreaming: true },
    ]);
    setLoading(true);

    try {
      if (retryImage) {
        setHistory((prev) =>
          prev.map((m) =>
            m.id === botMsgId ? { ...m, status: '*(Analyzing image with Gemini Vision... 🔍)*' } : m
          )
        );
        const prompt = retryText || 'Analyze this image in detail and explain everything you see.';
        for await (const chunk of analyzeImageStream(retryImage.base64, retryImage.mimeType, prompt)) {
          setHistory((prev) =>
            prev.map((m) =>
              m.id === botMsgId ? { ...m, text: m.text + chunk, status: undefined } : m
            )
          );
        }
      } else {
        for await (const event of streamMessage(retryText)) {
          if (event.type === 'chunk') {
            setHistory((prev) =>
              prev.map((m) =>
                m.id === botMsgId ? { ...m, text: m.text + event.text, status: undefined } : m
              )
            );
          } else if (event.type === 'status') {
            setHistory((prev) =>
              prev.map((m) =>
                m.id === botMsgId ? { ...m, status: event.text } : m
              )
            );
          } else if (event.type === 'sources') {
            setHistory((prev) =>
              prev.map((m) =>
                m.id === botMsgId ? { ...m, sources: event.sources } : m
              )
            );
          }
        }
      }
      setHistory((prev) =>
        prev.map((m) => m.id === botMsgId ? { ...m, isStreaming: false } : m)
      );
    } catch (err) {
      setHistory((prev) =>
        prev.map((m) => m.id === msgId ? { ...m, failed: true } : m)
      );
      setHistory((prev) => prev.filter((m) => m.id !== botMsgId));
      const userMessage = (err as any)?.userMessage || 'Something went wrong.';
      setError(userMessage);
    } finally {
      setLoading(false);
    }
  };

  const clearChat = () => {
    setHistory([]);
    setError(null);
    setMessage('');
    setPendingImage(null);
    resetChat();
  };

  return {
    history,
    message,
    setMessage,
    loading,
    error,
    sendMessage,
    clearChat,
    retryMessage,
    pendingImage,
    pickImage,
    onFileChange,
    removePendingImage,
    fileInputRef,
  };
}
