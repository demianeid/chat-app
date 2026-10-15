import React from 'react';
import { ThemeToggle } from './ThemeToggle';
import type { ThemeMode } from '../hooks/useTheme';
import brandIcon from '../assets/brand/icon.png';

interface ChatHeaderProps {
  title?: string;
  subtitle?: string;
  iconSrc?: string;
  iconClass?: string;
  onClear?: () => void;
  theme?: ThemeMode;
  setTheme?: (theme: ThemeMode) => void;
}

export const ChatHeader: React.FC<ChatHeaderProps> = ({
  title = 'AI Chat',
  subtitle = 'Your AI assistant',
  iconSrc = brandIcon,
  iconClass,
  onClear,
  theme,
  setTheme,
}) => {
  return (
    <header className="bg-white dark:bg-gray-800 px-4 sm:px-6 py-4 sm:py-5 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between shrink-0 z-10 shadow-sm transition-colors duration-300">
      <div className="flex items-center min-w-0 mr-3">
        <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-2xl bg-teal-50 dark:bg-teal-950/60 p-1.5 sm:p-2 border border-teal-100 dark:border-teal-800/50 flex items-center justify-center mr-3 sm:mr-4 shrink-0 shadow-xs">
          {iconSrc ? (
            <img src={iconSrc} alt="Brand Icon" className="w-full h-full object-contain" />
          ) : (
            <i className={`${iconClass || 'bi-stars'} text-teal-600 dark:text-teal-400 text-xl sm:text-2xl`}></i>
          )}
        </div>
        <div className="min-w-0">
          <h1 className="text-lg sm:text-xl font-bold text-gray-900 dark:text-white truncate">{title}</h1>
          <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 truncate">{subtitle}</p>
        </div>
      </div>

      <div className="flex items-center gap-2 sm:gap-3 shrink-0">
        {theme && setTheme && (
          <ThemeToggle theme={theme} setTheme={setTheme} />
        )}

        {onClear && (
          <button
            onClick={onClear}
            title="Clear conversation"
            className="w-9 h-9 sm:w-10 sm:h-10 rounded-full flex items-center justify-center text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-all duration-200 border border-transparent hover:border-red-200 dark:hover:border-red-900/40"
            aria-label="Clear conversation"
          >
            <i className="bi-trash3 text-base sm:text-lg"></i>
          </button>
        )}
      </div>
    </header>
  );
};

export default ChatHeader;
