import React, { useState, useMemo } from 'react';

// Data
import { generateMetadata } from './data/mockMetadata';
import rawCases from './data/database/index.json';

// Layout
import Sidebar from './components/layout/Sidebar';
import Header from './components/layout/Header';

// Components
import MonitorPanel from './components/monitor/MonitorPanel';
import RetrievalList from './components/retrieval/RetrievalList';
import CaseDetailModal from './components/modal/CaseDetailModal';

function App() {
  // 1. Pre-process cases to fix data issues globally (Memoized first)
  const allCases = useMemo(() => {
    return rawCases.map(c => {
      // 1. Fix diagnosis format (handle pipe string vs array)
      let diagArray = [];
      if (Array.isArray(c.diagnosis)) {
        // Check if first element contains pipe
        if (c.diagnosis.length > 0 && c.diagnosis[0].includes('|')) {
          diagArray = c.diagnosis[0].split('|');
        } else {
          diagArray = c.diagnosis;
        }
      } else if (typeof c.diagnosis === 'string') {
        diagArray = c.diagnosis.split('|');
      }

      // 2. Determine Group Rank
      // Use the pre-calculated medicalGroup from the database as the rank ID
      // Fallback to 'unknown' if missing
      const rank = c.medicalGroup || 'unknown';

      // 3. Add missing fields defaults
      return {
        ...c,
        diagnosis: diagArray,
        groupRank: rank,
        report: c.report || `Automated generated report for case ${c.id}. The patient exhibits signs consistent with the tagged diagnoses.`,
        demographics: c.demographics || "None provided"
      };
    });
  }, []);

  // 2. Dynamically Generate Metadata based on actual processed cases
  const dynamicGroups = useMemo(() => generateMetadata(allCases), [allCases]);

  // State
  // Initialize with the first generated group or null
  const [activeGroupId, setActiveGroupId] = useState(null);
  const [selectedCase, setSelectedCase] = useState(null);

  // Derive activeGroup object
  const activeGroup = useMemo(() => {
    if (activeGroupId) return dynamicGroups.find(g => g.rank === activeGroupId) || dynamicGroups[0];
    return dynamicGroups.length > 0 ? dynamicGroups[0] : null;
  }, [activeGroupId, dynamicGroups]);

  // SEPARATE QUERY CASE AND RETRIEVAL RESULTS
  // 1. Identify the Query Case (The "Input" Patient)
  const queryCase = useMemo(() => allCases.find(c => c.isQueryCase), [allCases]);

  // 2. Filter retrieval results (exclude the query case itself from the list)
  const filteredCases = useMemo(() => {
    if (!activeGroup) return [];
    // Filter by group AND exclude the query case
    return allCases.filter(c => c.groupRank === activeGroup.rank && !c.isQueryCase);
  }, [activeGroup, allCases]);

  // 3. Dynamic Case Loading
  // Vite's import.meta.glob returns an object where keys are the relative paths from this file
  const caseModules = useMemo(() => import.meta.glob('./data/database/cases/*.json'), []);
  const [detailedCase, setDetailedCase] = useState(null);

  // Determine the case to display on the monitor:
  // Priority: 1. User Selected Case (Click) -> 2. Query Case (Default) -> 3. First Result (Fallback)
  const currentMonitorCase = selectedCase || queryCase || (filteredCases.length > 0 ? filteredCases[0] : null);

  // Function 1: Load detailed data when a case is CLICKED (User Action)
  React.useEffect(() => {
    if (!selectedCase) return; // Only process if user explicitly selected something

    const loadCaseData = async () => {
      try {
        const targetFilename = selectedCase.fileName.replace(/^.*[\\\/]/, '');
        const modulePath = Object.keys(caseModules).find(key => key.endsWith(targetFilename));

        if (modulePath) {
          const mod = await caseModules[modulePath]();
          setDetailedCase(mod.default || mod);
        } else {
          console.error(`Case file not found for: ${targetFilename}`);
          setDetailedCase(null);
        }
      } catch (err) {
        console.error("Error loading case details:", err);
        setDetailedCase(null);
      }
    };

    loadCaseData();
  }, [selectedCase, caseModules]);

  // Function 2: Initialize Monitor on Startup (Defaults to Query Case)
  React.useEffect(() => {
    // Only initialize if NO case is selected yet
    if (selectedCase) return;

    const initializeMonitor = async () => {
      try {
        // Default to the Query Case, or fallback to first result
        const targetCase = queryCase || filteredCases[0];

        if (!targetCase) return;

        console.log("Initializing Monitor with default case:", targetCase.id);

        const targetFilename = targetCase.fileName.replace(/^.*[\\\/]/, '');
        const modulePath = Object.keys(caseModules).find(key => key.endsWith(targetFilename));

        if (modulePath) {
          const mod = await caseModules[modulePath]();
          // We set detailedCase directly, effectively "auto-selecting" it for viewing without changing selectedCase state
          setDetailedCase(mod.default || mod);
        }
      } catch (err) {
        console.error("Error initializing monitor:", err);
      }
    };

    initializeMonitor();
  }, [selectedCase, queryCase, filteredCases, caseModules]);

  return (
    <div className="flex h-screen bg-slate-100 font-sans text-slate-800 overflow-hidden selection:bg-blue-100">

      {/* 1. Sidebar - Pass dynamic groups if Sidebar needs them */}
      <Sidebar groups={dynamicGroups} activeGroupId={activeGroup?.rank} onSelectGroup={setActiveGroupId} />

      {/* 2. Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0">

        {/* Header */}
        <Header />

        {/* Workspace Grid */}
        <main className="flex-1 p-4 grid grid-cols-12 gap-4 overflow-hidden">

          {/* LEFT: Patient Monitor Panel */}
          {/* Pass displayCase so we can show previewSignal while detailedCase is loading or if no case is selected */}
          <MonitorPanel
            activeGroup={activeGroup}
            detailedCase={detailedCase}
            displayCase={currentMonitorCase}
          />

          {/* RIGHT: Retrieval Panel (Diagnosis + Evidence List) */}
          <RetrievalList
            activeGroup={activeGroup} // Pass current selected group
            groups={dynamicGroups}    // Pass all groups for selector
            onGroupChange={(g) => setActiveGroupId(g.rank)}
            cases={filteredCases}
            onSelectCase={setSelectedCase}
          />

        </main>
      </div>

      {/* 3. Modal Layer */}
      <CaseDetailModal
        caseData={selectedCase}
        detailedCase={detailedCase}
        onClose={() => setSelectedCase(null)}
      />


    </div>
  );
}

export default App;