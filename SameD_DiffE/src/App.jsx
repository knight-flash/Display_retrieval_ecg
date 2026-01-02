import React, { useState, useMemo, useEffect } from 'react';
import Header from './components/layout/Header';
import MonitorPanel from './components/monitor/MonitorPanel';

import DiverseView from './components/special/DiverseView';

// Globals
// import.meta.glob must span all potential directories
const allManifestModules = import.meta.glob('./data/*/manifest.json');
const allCaseModules = import.meta.glob('./data/*/cases/*.json');
const allRetrievalModules = import.meta.glob('./data/*/retrievals/*.json');

function App() {
  // --- DATABASE STATE ---
  const [databases, setDatabases] = useState([]);
  const [currentDatabase, setCurrentDatabase] = useState(null);

  // Discover Databases
  useEffect(() => {
    const dbNames = Object.keys(allManifestModules).map(path => {
      const parts = path.split('/');
      return parts[2]; // ./data/[database]/manifest.json
    });
    setDatabases(dbNames);
    if (dbNames.length > 0 && !currentDatabase) {
      // Prefer 'database' if exists
      setCurrentDatabase(dbNames.includes('database') ? 'database' : dbNames[0]);
    }
  }, []);

  const [manifest, setManifest] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [currentTask, setCurrentTask] = useState(null);

  // Load Manifest when DB Changes
  useEffect(() => {
    if (!currentDatabase) return;

    async function load() {
      try {
        const path = `./data/${currentDatabase}/manifest.json`;
        if (allManifestModules[path]) {
          const mod = await allManifestModules[path]();
          const data = mod.default || mod;
          setManifest(data);
          if (data.length > 0) {
            setCurrentIndex(0);
            setCurrentTask(data[0]);
          } else {
            setCurrentTask(null);
          }
        }
      } catch (e) {
        console.error("Error loading manifest:", e);
      }
    }
    load();
  }, [currentDatabase]);

  // Update Task when Index Changes
  useEffect(() => {
    if (manifest[currentIndex]) {
      setCurrentTask(manifest[currentIndex]);
    }
  }, [currentIndex, manifest]);

  // Load Context Data (Query Case + Retrieval List)
  const [queryCase, setQueryCase] = useState(null);
  const [retrievedCases, setRetrievedCases] = useState([]);

  useEffect(() => {
    if (!currentTask || !currentDatabase) return;

    async function fetchData() {
      try {
        // Load Query Case
        const casePath = `./data/${currentDatabase}/${currentTask.fileName}`;
        // Find matching key
        const caseKey = Object.keys(allCaseModules).find(k => k === casePath) ||
          Object.keys(allCaseModules).find(k => k.endsWith(currentTask.fileName.split('/').pop()));

        if (caseKey) {
          const cMod = await allCaseModules[caseKey]();
          setQueryCase(cMod.default || cMod);
        }

        // Load Retrieval List
        const rName = currentTask.retrievalFile.split('/').pop();
        const rPath = `./data/${currentDatabase}/retrievals/${rName}`;

        const rKey = Object.keys(allRetrievalModules).find(k => k === rPath) ||
          Object.keys(allRetrievalModules).find(k => k.endsWith(rName));

        if (rKey) {
          const rMod = await allRetrievalModules[rKey]();
          const list = [...(rMod.default || rMod)];

          // [VisualTwins Logic] Fully load the first retrieved case if needed
          if (currentTask.taskType === 'VisualTwins' && list.length > 0) {
            const twinSummary = list[0];
            const twinFileName = twinSummary.fileName.split('/').pop();
            // Try to find twin case in same DB
            const twinPath = `./data/${currentDatabase}/cases/${twinFileName}`;
            const twinKey = Object.keys(allCaseModules).find(k => k === twinPath) ||
              Object.keys(allCaseModules).find(k => k.endsWith(twinFileName));

            if (twinKey) {
              const twinMod = await allCaseModules[twinKey]();
              const twinDetail = twinMod.default || twinMod;
              list[0] = { ...twinDetail, similarity: twinSummary.similarity };
            }
          }
          setRetrievedCases(list);
        } else {
          setRetrievedCases([]);
        }

      } catch (e) {
        console.error("Error loading task data", e);
      }
    }
    fetchData();
  }, [currentTask, currentDatabase]);

  if (!currentTask || !queryCase) {
    return <div className="flex items-center justify-center h-screen bg-slate-100">Loading Task... (Check Database Selection)</div>;
  }

  return (
    <div className="flex flex-col h-screen bg-slate-100 font-sans text-slate-800 overflow-hidden">
      {/* Header with Navigation */}
      <Header
        doctorName="Dr. Yan"
        version="SameD / Visual Twins"
        onPrevPatient={() => setCurrentIndex(p => Math.max(0, p - 1))}
        onNextPatient={() => setCurrentIndex(p => Math.min(manifest.length - 1, p + 1))}
        currentPatientIndex={currentIndex}
        totalPatients={manifest.length}
        databases={databases}
        currentDatabase={currentDatabase}
        onDatabaseChange={setCurrentDatabase}
      />

      {/* Task Info Bar */}
      <div className="bg-white border-b border-slate-200 px-6 py-2 flex items-center justify-between shadow-sm z-10">
        <div className="flex items-center gap-4">
          <span className={`px-2 py-1 rounded text-xs font-bold uppercase ${currentTask.taskType === 'VisualTwins' ? 'bg-purple-100 text-purple-700' : 'bg-blue-100 text-blue-700'}`}>
            {currentTask.taskType}
          </span>
          <span className="font-semibold text-slate-700">{currentTask.description}</span>
        </div>
        <div className="text-xs text-slate-400 font-mono">
          ID: {currentTask.id}
        </div>
      </div>

      {/* Main Content View Switcher */}
      <main className="flex-1 overflow-hidden p-4 relative">
        <DiverseView
          queryCase={queryCase}
          diverseCases={retrievedCases}
          manifest={manifest}
          currentIndex={currentIndex}
          onTaskChange={setCurrentIndex}
        />
      </main>
    </div>
  );
}

export default App;