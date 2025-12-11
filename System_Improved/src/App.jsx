import React, { useState, useMemo } from 'react';

// Data
import { diagnosticGroups } from './data/mockMetadata';
import allCases from './data/database/index.json';

// Layout
import Sidebar from './components/layout/Sidebar';
import Header from './components/layout/Header';

// Components
import MonitorPanel from './components/monitor/MonitorPanel';
import RetrievalList from './components/retrieval/RetrievalList';
import CaseDetailModal from './components/modal/CaseDetailModal';

function App() {
  // State
  const [activeGroup, setActiveGroup] = useState(diagnosticGroups[0]);
  const [selectedCase, setSelectedCase] = useState(null);

  // Filter cases based on the active diagnosis group
  // We use `groupRank` to match cases to groups as defined in our index.json
  const filteredCases = useMemo(() => {
    return allCases.filter(c => c.groupRank === activeGroup.rank);
  }, [activeGroup]);

  return (
    <div className="flex h-screen bg-slate-100 font-sans text-slate-800 overflow-hidden selection:bg-blue-100">

      {/* 1. Sidebar */}
      <Sidebar />

      {/* 2. Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0">

        {/* Header */}
        <Header />

        {/* Workspace Grid */}
        <main className="flex-1 p-4 grid grid-cols-12 gap-4 overflow-hidden">

          {/* LEFT: Patient Monitor Panel */}
          <MonitorPanel activeGroup={activeGroup} />

          {/* RIGHT: Retrieval Panel (Diagnosis + Evidence List) */}
          <RetrievalList
            activeGroup={activeGroup}
            onGroupChange={setActiveGroup}
            cases={filteredCases}
            onSelectCase={setSelectedCase}
          />

        </main>
      </div>

      {/* 3. Modal Layer */}
      <CaseDetailModal
        caseData={selectedCase}
        onClose={() => setSelectedCase(null)}
      />


    </div>
  );
}

export default App;