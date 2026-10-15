import React from 'react';

interface ChatInputsProps {
  message: string;
  setMessage: (value: string) => void;
  sendMessage: (e?: React.FormEvent) => void;
  loading?: boolean;
  error?: string | null;
  placeholder?: string;
  pendingImage?: { previewUrl: string } | null;
  pickImage?: () => void;
  onFileChange?: (e: React.ChangeEvent<HTMLInputElement>) => void;
  removePendingImage?: () => void;
  fileInputRef?: React.RefObject<HTMLInputElement | null>;
}

export const ChatInputs: React.FC<ChatInputsProps> = ({
  message,
  setMessage,
  sendMessage,
  loading = false,
  error = null,
  placeholder = 'Message AI...',
  pendingImage,
  pickImage,
  onFileChange,
  removePendingImage,
  fileInputRef,
}) => {
  return (
    <footer className="p-4 sm:p-6 bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 shrink-0 transition-colors duration-300 z-10 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)] sm:shadow-none">
      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={onFileChange}
      />

      {/* Image preview */}
      {pendingImage && (
        <div className="mb-3 flex items-start gap-2 max-w-4xl mx-auto">
          <div className="relative inline-block">
            <img
              src={pendingImage.previewUrl}
              alt="Pending upload"
              className="h-20 w-20 object-cover rounded-2xl border-2 border-teal-400 shadow-md"
            />
            <button
              type="button"
              onClick={removePendingImage}
              className="absolute -top-2 -right-2 w-5 h-5 bg-red-500 hover:bg-red-600 text-white rounded-full flex items-center justify-center text-xs shadow transition-all"
              aria-label="Remove image"
            >
              <i className="bi-x"></i>
            </button>
          </div>
          <p className="text-xs text-teal-600 dark:text-teal-400 mt-1 italic">
            🔍 Image will be analyzed by Gemini Vision
          </p>
        </div>
      )}

      <form onSubmit={sendMessage} className="flex items-end gap-3 max-w-4xl mx-auto">
        {/* Image attach button */}
        {pickImage && (
          <button
            type="button"
            onClick={pickImage}
            disabled={loading}
            title="Attach image"
            className="w-12 h-12 rounded-full bg-gray-100 dark:bg-gray-700 hover:bg-teal-50 dark:hover:bg-teal-900/30 text-gray-500 dark:text-gray-400 hover:text-teal-600 dark:hover:text-teal-400 flex items-center justify-center transition-all duration-200 disabled:opacity-50 shrink-0 border border-gray-200 dark:border-gray-600"
            aria-label="Attach image"
          >
            <i className="bi-image text-xl"></i>
          </button>
        )}

        <div className="flex-1 relative">
          <input
            type="text"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder={pendingImage ? 'Ask about the image... (optional)' : placeholder}
            disabled={loading}
            className="w-full bg-gray-100 dark:bg-gray-900 text-gray-900 dark:text-gray-100 px-6 py-4 rounded-full border border-transparent focus:bg-white focus:dark:bg-gray-800 focus:border-teal-500 dark:focus:border-teal-500 focus:ring-4 focus:ring-teal-500/20 dark:focus:ring-teal-500/20 transition-all duration-200 disabled:opacity-50 shadow-inner"
          />
        </div>
        <button
          type="submit"
          disabled={loading || (!message.trim() && !pendingImage)}
          className="w-14 h-14 rounded-full bg-teal-600 hover:bg-teal-500 active:bg-teal-700 text-white flex items-center justify-center transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed shrink-0 shadow-lg hover:shadow-teal-600/30 hover:-translate-y-0.5 disabled:hover:translate-y-0"
          aria-label="Send message"
        >
          <i className="bi-send-fill text-xl ml-[-2px]"></i>
        </button>
      </form>
      {error && (
        <p className="text-red-500 dark:text-red-400 text-xs mt-2 ml-4 flex items-center">
          <i className="bi-exclamation-circle-fill mr-1"></i> {error}
        </p>
      )}
    </footer>
  );
};

export default ChatInputs;
