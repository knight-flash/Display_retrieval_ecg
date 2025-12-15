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
        demographics: c.demographics || "Male, 65yr"
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


  // Filter cases based on the active diagnosis group
  const filteredCases = useMemo(() => {
    if (!activeGroup) return [];
    return allCases.filter(c => c.groupRank === activeGroup.rank);
  }, [activeGroup, allCases]);

  // 3. Dynamic Case Loading
  const caseModules = useMemo(() => import.meta.glob('./data/database/cases/*.json'), []);
  const [detailedCase, setDetailedCase] = useState(null);

  // Load detailed data when a case is selected
  React.useEffect(() => {
    if (!selectedCase) {
      setDetailedCase(null);
      return;
    }

    const loadCaseData = async () => {
      try {
        // Construct the key expected by import.meta.glob
        // selectedCase.fileName is typically "cases/filename.json"
        // We need "./data/database/cases/filename.json"
        const filename = selectedCase.fileName.split('/').pop();
        const path = `./data/database/cases/${filename}`;

        if (caseModules[path]) {
          const mod = await caseModules[path]();
          setDetailedCase(mod.default || mod); // Handle potential default export wrapper
        } else {
          console.error(`Case file not found: ${path}`);
          setDetailedCase(null);
        }
      } catch (err) {
        console.error("Error loading case details:", err);
        setDetailedCase(null);
      }
    };

    loadCaseData();
  }, [selectedCase, caseModules]);

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
          <MonitorPanel activeGroup={activeGroup} detailedCase={detailedCase} />

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