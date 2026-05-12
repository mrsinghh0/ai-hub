'use client';

import { useAppStore } from '@/lib/store';
import { BottomNav } from '@/components/bottom-nav';
import { ChatView } from '@/components/chat-view';
import { ModelsView } from '@/components/models-view';
import { HistoryView } from '@/components/history-view';
import { AnalyticsView } from '@/components/analytics-view';
import { SettingsView } from '@/components/settings-view';
import { motion, AnimatePresence } from 'framer-motion';

export default function Home() {
  const { activeTab } = useAppStore();

  const renderView = () => {
    switch (activeTab) {
      case 'chat':
        return <ChatView />;
      case 'models':
        return <ModelsView />;
      case 'history':
        return <HistoryView />;
      case 'analytics':
        return <AnalyticsView />;
      case 'settings':
        return <SettingsView />;
      default:
        return <ChatView />;
    }
  };

  return (
    <div className="flex flex-col h-dvh bg-background">
      <main className="flex-1 overflow-hidden">
        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.15 }}
            className="h-full"
          >
            {renderView()}
          </motion.div>
        </AnimatePresence>
      </main>
      <BottomNav />
    </div>
  );
}
