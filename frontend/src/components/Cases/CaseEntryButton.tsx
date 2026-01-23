import { useState } from 'react';
import CaseEntryModal from './CaseEntryModal';
import type { TabId } from '../Layout/Sidebar';

interface CaseEntryButtonProps {
  activeTab: TabId;
}

export default function CaseEntryButton({ activeTab }: CaseEntryButtonProps) {
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Only show on dashboard and analytics tabs
  const shouldShow = activeTab === 'dashboard' || activeTab === 'analytics';

  if (!shouldShow) return null;

  return (
    <>
      {/* Floating Action Button */}
      <button
        onClick={() => setIsModalOpen(true)}
        className="fixed bottom-6 right-6 z-40 w-14 h-14 bg-blue-600 hover:bg-blue-700 text-white rounded-full shadow-lg hover:shadow-xl transition-all duration-200 flex items-center justify-center group"
        aria-label="Quick case entry"
        title="Quick Case Entry"
      >
        <svg
          className="w-6 h-6 transition-transform group-hover:rotate-90 duration-200"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
        </svg>
      </button>

      {/* Modal */}
      <CaseEntryModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} />
    </>
  );
}
