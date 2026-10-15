import { useChat } from './hooks/useChat';
import { useTheme } from './hooks/useTheme';
import { ChatHeader, ChatMessages, ChatInputs } from './components';
import './App.css';

function App() {
  const { theme, setTheme } = useTheme();
  const { history, message, setMessage, loading, error, sendMessage, clearChat, retryMessage,
          pendingImage, pickImage, onFileChange, removePendingImage, fileInputRef } = useChat();

  return (
    <div className="min-h-screen w-full bg-gray-50 dark:bg-gray-900 flex justify-center items-center p-0 sm:p-4 md:p-8 transition-colors duration-300">
      {/* Full-screen, single-column chat window with large rounded corners on larger screens */}
      <div className="w-full h-screen sm:h-[90vh] max-w-4xl flex flex-col bg-gray-50 dark:bg-gray-900 sm:bg-white sm:dark:bg-gray-950 sm:rounded-[2.5rem] sm:shadow-2xl overflow-hidden border border-transparent sm:border-gray-200 sm:dark:border-gray-800">
        <ChatHeader
          title="Demo AI Agent"
          subtitle="Smart chat & image analysis "
          onClear={clearChat}
          theme={theme}
          setTheme={setTheme}
        />
        <ChatMessages history={history} loading={loading} onRetry={retryMessage} />
        <ChatInputs
          message={message}
          setMessage={setMessage}
          sendMessage={sendMessage}
          loading={loading}
          error={error}
          pendingImage={pendingImage}
          pickImage={pickImage}
          onFileChange={onFileChange}
          removePendingImage={removePendingImage}
          fileInputRef={fileInputRef}
        />
      </div>
    </div>
  );
}

export default App;
