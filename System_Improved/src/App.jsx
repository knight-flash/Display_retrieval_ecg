import React, { useState, useMemo } from 'react';

// Data
import { generateMetadata } from './data/mockMetadata';
// Removed static index.json import to support dynamic multi-patient loading

// Layout
import Sidebar from './components/layout/Sidebar';
import Header from './components/layout/Header';

// Components
import MonitorPanel from './components/monitor/MonitorPanel';
import RetrievalList from './components/retrieval/RetrievalList';
import CaseDetailModal from './components/modal/CaseDetailModal';
import DiagnosisWriter from './components/diagnosis/DiagnosisWriter';

function App() {
  // 0. State for Multi-Patient Workflow
  const [patientManifest, setPatientManifest] = useState([]);
  const [currentPatientIndex, setCurrentPatientIndex] = useState(0);
  const [rawCases, setRawCases] = useState([]); // Dynamic loaded cases for current patient

  // 1. Pre-process cases to fix data issues globally (Memoized first)
  const allCases = useMemo(() => {
    if (!rawCases || rawCases.length === 0) return [];

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
  }, [rawCases]); // Depend on dynamic rawCases

  // 2. Dynamically Generate Metadata based on actual processed cases
  // FIX: Exclude query case from metadata generation logic so counts match the visible retrieval list
  // The query case is shown in the Monitor, not the Retrieval List.
  const validRetrievalCases = useMemo(() => allCases.filter(c => !c.isQueryCase), [allCases]);
  const dynamicGroups = useMemo(() => generateMetadata(validRetrievalCases), [validRetrievalCases]);

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
  const retrievalModules = useMemo(() => import.meta.glob('./data/database/retrievals/*.json'), []);
  const manifestModules = useMemo(() => import.meta.glob('./data/database/manifest.json'), []);

  // 4. Case Loading Logic
  // Split into two states:
  // - patientData: The main case being analyzed (Monitor Panel) - FIXED
  // - selectedResultData: The retrieved case being viewed (Modal) - DYNAMIC

  const [patientData, setPatientData] = useState(null);       // For Monitor
  const [selectedResultData, setSelectedResultData] = useState(null); // For Modal

  // NEW: Load Manifest on Mount
  React.useEffect(() => {
    const loadManifest = async () => {
      try {
        // Find manifest module
        const path = Object.keys(manifestModules)[0]; // Should be only one
        if (path) {
          const mod = await manifestModules[path]();
          const manifest = mod.default || mod;
          if (Array.isArray(manifest) && manifest.length > 0) {
            setPatientManifest(manifest);
            setCurrentPatientIndex(0);
            // Also need to trigger load of first patient? 
            // The next Effect on [currentPatientIndex, patientManifest] will handle it.
          }
        } else {
          console.warn("Manifest not found. Please run datajson.py");
        }
      } catch (e) {
        console.error("Error loading manifest:", e);
      }
    };
    loadManifest();
  }, [manifestModules]);

  // NEW: Load Retrieval Data when Patient Changes
  React.useEffect(() => {
    if (patientManifest.length === 0) return;

    const currentPatient = patientManifest[currentPatientIndex];
    if (!currentPatient) return;

    const loadRetrieval = async () => {
      try {
        // Construct path key: ./data/database/retrievals/retrieval_{id}.json
        // Accessing retrievedFile property from manifest is safer if available
        // manifest item: { id, retrievalFile, ... } where retrievalFile is relative "retrievals/..."

        // We need to match the glob key. Glob keys are like "./data/database/retrievals/retrieval_de_123...json"
        const targetKey = `./data/database/${currentPatient.retrievalFile}`;

        // Try to find exact match
        let modulePath = Object.keys(retrievalModules).find(k => k === targetKey);

        // Fallback lookup
        if (!modulePath) {
          modulePath = Object.keys(retrievalModules).find(k => k.includes(currentPatient.id));
        }

        if (modulePath) {
          const mod = await retrievalModules[modulePath]();
          setRawCases(mod.default || mod);
          // Reset selections when patient changes
          setSelectedCase(null);
          setActiveGroupId(null);
          // Monitor data initialization will happen in separate effect below
        } else {
          console.error("Retrieval file not found for:", currentPatient.id);
        }

      } catch (e) {
        console.error("Error loading retrieval data:", e);
      }
    };

    loadRetrieval();
  }, [currentPatientIndex, patientManifest, retrievalModules]);

  // Function 1: Load detailed data when a case is CLICKED (User Action) -> Updates Modal Data
  React.useEffect(() => {
    if (!selectedCase) {
      setSelectedResultData(null);
      return;
    }

    const loadCaseData = async () => {
      try {
        const targetFilename = selectedCase.fileName.replace(/^.*[\\\/]/, '');
        const modulePath = Object.keys(caseModules).find(key => key.endsWith(targetFilename));

        if (modulePath) {
          const mod = await caseModules[modulePath]();
          setSelectedResultData(mod.default || mod);
        }
      } catch (err) {
        console.error("Error loading selected case details:", err);
      }
    };

    loadCaseData();
  }, [selectedCase, caseModules]);

  // Function 2: Initialize Monitor on Startup -> Updates Patient Data (Permanently)
  React.useEffect(() => {
    const initializeMonitor = async () => {
      try {
        // Default to the Query Case, or fallback to first result
        const targetCase = queryCase || (allCases.length > 0 ? allCases[0] : null);

        if (!targetCase) return;

        // Don't reload if we already have it
        if (patientData && patientData.id === targetCase.id) return;

        console.log("Initializing Monitor with default case:", targetCase.id);

        const targetFilename = targetCase.fileName.replace(/^.*[\\\/]/, '');
        const modulePath = Object.keys(caseModules).find(key => key.endsWith(targetFilename));

        if (modulePath) {
          const mod = await caseModules[modulePath]();
          setPatientData(mod.default || mod);
        }
      } catch (err) {
        console.error("Error initializing monitor:", err);
      }
    };

    initializeMonitor();
  }, [queryCase, allCases, caseModules]); // Removed selectedCase dependency, this run once (or when query changes)

  return (
    <div className="flex h-screen bg-slate-100 font-sans text-slate-800 overflow-hidden selection:bg-blue-100">

      {/* 1. Sidebar - Pass dynamic groups if Sidebar needs them */}
      <Sidebar groups={dynamicGroups} activeGroupId={activeGroup?.rank} onSelectGroup={setActiveGroupId} />

      {/* 2. Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0">

        {/* Header */}
        <Header
          doctorName="Dr. Yan"
          version="BETA v3.0"
          onPrevPatient={() => setCurrentPatientIndex(prev => Math.max(0, prev - 1))}
          onNextPatient={() => setCurrentPatientIndex(prev => Math.min(patientManifest.length - 1, prev + 1))}
          currentPatientIndex={currentPatientIndex}
          totalPatients={patientManifest.length}
        />

        {/* Workspace Grid */}
        <main className="flex-1 p-4 grid grid-cols-12 gap-4 overflow-hidden">

          {/* LEFT: Patient Monitor Panel */}
          {/* Pass displayCase so we can show previewSignal while detailedCase is loading or if no case is selected */}
          <MonitorPanel
            activeGroup={activeGroup}
            detailedCase={patientData}
            displayCase={queryCase || (allCases.length > 0 ? allCases[0] : null)}
          />

          {/* RIGHT: Retrieval Panel + Diagnosis Writer */}
          <div className="col-span-5 flex flex-col gap-4 h-full overflow-hidden">

            {/* Retrieval List (Flexible Height) */}
            <RetrievalList
              className="flex-1"
              activeGroup={activeGroup} // Pass current selected group
              groups={dynamicGroups}    // Pass all groups for selector
              onGroupChange={(g) => setActiveGroupId(g.rank)}
              cases={filteredCases}
              onSelectCase={setSelectedCase}
            />

            {/* Diagnosis Writer (Fixed Height ~1/5) */}
            <div className="h-48 shrink-0">
              <DiagnosisWriter caseId={queryCase?.id} />
            </div>

          </div>

        </main>
      </div>

      {/* 3. Modal Layer */}
      <CaseDetailModal
        caseData={selectedCase}
        detailedCase={selectedResultData}
        onClose={() => setSelectedCase(null)}
      />


    </div>
  );
}

export default App;