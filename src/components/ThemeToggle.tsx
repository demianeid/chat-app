import React from 'react';
import type { ThemeMode } from '../hooks/useTheme';

interface ThemeToggleProps {
  theme: ThemeMode;
  setTheme: (theme: ThemeMode) => void;
}

export const ThemeToggle: React.FC<ThemeToggleProps> = ({ theme, setTheme }) => {
  const options: { mode: ThemeMode; label: string; icon: string }[] = [
    { mode: 'system', label: 'System', icon: 'bi-display' },
    { mode: 'light', label: 'Light', icon: 'bi-sun-fill' },
    { mode: 'dark', label: 'Dark', icon: 'bi-moon-stars-fill' },
  ];

  return (
    <div
      role="radiogroup"
      aria-label="Theme selection"
      className="inline-flex p-1 bg-gray-100 dark:bg-gray-700/60 rounded-full border border-gray-200 dark:border-gray-600/50 backdrop-blur-sm"
    >
      {options.map((opt) => {
        const isActive = theme === opt.mode;
        return (
          <button
            key={opt.mode}
            type="button"
            onClick={() => setTheme(opt.mode)}
            title={`Switch to ${opt.label} theme`}
            aria-pressed={isActive}
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium transition-all duration-200 ${
              isActive
                ? 'bg-white dark:bg-gray-800 text-teal-600 dark:text-teal-400 shadow-sm'
                : 'text-gray-500 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200'
            }`}
          >
            <i className={`${opt.icon} text-xs`}></i>
            <span className="hidden sm:inline capitalize">{opt.label}</span>
          </button>
        );
      })}
    </div>
  );
};

export default ThemeToggle;
