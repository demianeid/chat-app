import React, { useEffect, useRef } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import type { Message } from '../hooks/useChat';

interface ChatMessagesProps {
  history: Message[];
  loading?: boolean;
  onRetry?: (msgId: string) => void;
}

export const ChatMessages: React.FC<ChatMessagesProps> = ({
  history,
  loading = false,
  onRetry,
}) => {
  const chatEndRef = useRef<HTMLDivElement>(null);
  const hasStreamingMsg = history.some((m) => m.isStreaming);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [history, loading]);

  return (
    <main className="flex-1 overflow-y-auto custom-scrollbar p-4 md:p-6 space-y-6 bg-gray-50 dark:bg-gray-900 transition-colors duration-300 relative">
      {/* Empty state */}
      {history.length === 0 && !loading && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className="text-center px-4">
            <div className="w-20 h-20 bg-teal-50 dark:bg-teal-900/20 rounded-full flex items-center justify-center mx-auto mb-4">
              <i className="bi-robot text-teal-500 dark:text-teal-400 text-4xl"></i>
            </div>
            <p className="text-gray-500 dark:text-gray-400 text-lg font-medium">Start the conversation</p>
            <p className="text-gray-400 dark:text-gray-500 text-sm mt-2">Send a message to begin chatting</p>
          </div>
        </div>
      )}

      {history.map((msg) => (
        <div
          key={msg.id}
          className={`flex ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}
        >
          {msg.sender === 'bot' && (
            <div className="w-8 h-8 rounded-full bg-teal-100 dark:bg-teal-900/40 flex items-center justify-center mr-2 mt-1 shrink-0">
              <i className="bi-stars text-teal-600 dark:text-teal-400 text-sm"></i>
            </div>
          )}

          <div
            className={`max-w-[85%] sm:max-w-[75%] px-5 py-3.5 rounded-2xl text-[15px] leading-relaxed ${
              msg.sender === 'user'
                ? 'bg-teal-600 text-white rounded-br-sm shadow-md'
                : 'bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 rounded-bl-sm shadow-sm border border-gray-100 dark:border-gray-700'
            }`}
          >
            {/* Show image if attached (user messages) */}
            {msg.imageUrl && (
              <img
                src={msg.imageUrl}
                alt="Attached"
                className="mb-2 max-h-48 w-auto rounded-xl object-cover shadow-sm"
              />
            )}
            {msg.sender === 'bot' ? (
              <>
                {msg.status && (
                  <div className="text-sm font-medium text-teal-600 dark:text-teal-400 italic mb-2 animate-pulse whitespace-pre-wrap">
                    {msg.status.trim()}
                  </div>
                )}
                {msg.text && (
                  <div className="prose prose-sm dark:prose-invert max-w-none
                    prose-p:my-1 prose-p:leading-relaxed
                    prose-headings:font-semibold prose-headings:mt-3 prose-headings:mb-1
                    prose-code:bg-gray-100 prose-code:dark:bg-gray-700 prose-code:px-1.5 prose-code:py-0.5 prose-code:rounded prose-code:text-sm prose-code:font-mono prose-code:before:content-none prose-code:after:content-none
                    prose-pre:bg-gray-100 prose-pre:dark:bg-gray-900 prose-pre:rounded-xl prose-pre:p-4 prose-pre:my-2 prose-pre:overflow-x-auto
                    prose-ul:my-1 prose-ol:my-1 prose-li:my-0.5
                    prose-strong:font-semibold
                    prose-blockquote:border-l-teal-500 prose-blockquote:text-gray-500 dark:prose-blockquote:text-gray-400
                    prose-a:text-teal-600 dark:prose-a:text-teal-400 prose-a:no-underline hover:prose-a:underline
                    prose-table:text-sm prose-th:bg-gray-100 dark:prose-th:bg-gray-700 prose-th:px-3 prose-th:py-1.5 prose-td:px-3 prose-td:py-1.5
                  ">
                    <ReactMarkdown remarkPlugins={[remarkGfm]}>
                      {msg.text}
                    </ReactMarkdown>
                    {msg.isStreaming && (
                      <span className="inline-block w-0.5 h-4 bg-teal-500 ml-0.5 align-middle animate-pulse" />
                    )}
                  </div>
                )}
                {!msg.text && msg.isStreaming && !msg.status && (
                  <span className="inline-block w-0.5 h-4 bg-teal-500 align-middle animate-pulse" />
                )}
                {msg.sources && msg.sources.length > 0 && (
                  <div className="mt-4 pt-3 border-t border-gray-100 dark:border-gray-700">
                    <p className="text-[11px] font-semibold text-gray-400 dark:text-gray-500 mb-1.5 uppercase tracking-wider">Sources</p>
                    <ul className="space-y-1">
                      {msg.sources.map((source, idx) => (
                        <li key={idx} className="text-xs truncate">
                          <a 
                            href={source.url} 
                            target="_blank" 
                            rel="noopener noreferrer" 
                            className="text-teal-600 dark:text-teal-400 hover:underline flex items-center space-x-1"
                          >
                            <span className="opacity-70 text-[10px]">🔗</span>
                            <span className="truncate">{source.title}</span>
                          </a>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </>
            ) : (
              <span>{msg.text}</span>
            )}
          </div>

          {/* Retry button on failed user messages */}
          {msg.sender === 'user' && msg.failed && onRetry && (
            <button
              onClick={() => onRetry(msg.id)}
              className="ml-2 mt-auto mb-1 flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-red-50 dark:bg-red-900/20 text-red-500 dark:text-red-400 text-xs font-medium border border-red-200 dark:border-red-800 hover:bg-red-100 dark:hover:bg-red-900/40 transition-all duration-200 shrink-0 self-end"
              title="Retry message"
            >
              <i className="bi-arrow-clockwise text-sm"></i>
              Retry
            </button>
          )}
        </div>
      ))}

      {/* Show typing indicator only when waiting for the first chunk */}
      {loading && !hasStreamingMsg && (
        <div className="flex justify-start">
          <div className="w-8 h-8 rounded-full bg-teal-100 dark:bg-teal-900/40 flex items-center justify-center mr-2 mt-1 shrink-0">
            <i className="bi-stars text-teal-600 dark:text-teal-400 text-sm"></i>
          </div>
          <div className="max-w-[85%] sm:max-w-[75%] px-5 py-4 rounded-2xl bg-white dark:bg-gray-800 rounded-bl-sm shadow-sm border border-gray-100 dark:border-gray-700">
            <div className="flex items-center space-x-2 mb-3">
              <span className="text-sm font-medium text-teal-600 dark:text-teal-400">AI is thinking</span>
              <div className="flex space-x-1 pt-1">
                <div className="w-1.5 h-1.5 bg-teal-600 dark:bg-teal-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
                <div className="w-1.5 h-1.5 bg-teal-600 dark:bg-teal-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
                <div className="w-1.5 h-1.5 bg-teal-600 dark:bg-teal-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
              </div>
            </div>
            <div className="space-y-2.5">
              <div className="h-2.5 bg-gray-200 dark:bg-gray-700 rounded-full w-48 animate-pulse"></div>
              <div className="h-2.5 bg-gray-200 dark:bg-gray-700 rounded-full w-32 animate-pulse"></div>
            </div>
          </div>
        </div>
      )}

      <div ref={chatEndRef} />
    </main>
  );
};

export default ChatMessages;
