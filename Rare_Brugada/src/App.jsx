import React, { useState, useMemo, useEffect } from 'react';
import Header from './components/layout/Header';
import MonitorPanel from './components/monitor/MonitorPanel';
import TwinView from './components/special/TwinView';
import DiverseView from './components/special/DiverseView';

// Globals
// Globals
const manifestModules = import.meta.glob('./data/database2/manifest.json');
const caseModules = import.meta.glob('./data/database2/cases/*.json');
const retrievalModules = import.meta.glob('./data/database2/retrievals/*.json');

function App() {
  const [manifest, setManifest] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [currentTask, setCurrentTask] = useState(null);

  // Load Manifest
  useEffect(() => {
    async function load() {
      for (const path in manifestModules) {
        const mod = await manifestModules[path]();
        const data = mod.default || mod;
        setManifest(data);
        if (data.length > 0) setCurrentTask(data[0]);
      }
    }
    load();
  }, []);

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
    if (!currentTask) return;

    async function fetchData() {
      try {
        // Load Query Case
        const casePath = `./data/database2/${currentTask.fileName}`;
        // Find matching key
        const caseKey = Object.keys(caseModules).find(k => k.endsWith(currentTask.fileName.split('/').pop()));
        if (caseKey) {
          const cMod = await caseModules[caseKey]();
          setQueryCase(cMod.default || cMod);
        }

        // Load Retrieval List
        const rName = currentTask.retrievalFile.split('/').pop();
        const rKey = Object.keys(retrievalModules).find(k => k.endsWith(rName));
        if (rKey) {
          const rMod = await retrievalModules[rKey]();
          const list = [...(rMod.default || rMod)]; // Copy array to avoid mutation issues

          // [REMOVED] Single Twin Pre-loading. Now using DiverseView for list.
          // if (currentTask.taskType === 'VisualTwins' && list.length > 0) { ... }
          setRetrievedCases(list);
        } else {
          setRetrievedCases([]);
        }

      } catch (e) {
        console.error("Error loading task data", e);
      }
    }
    fetchData();
  }, [currentTask]);

  if (!currentTask || !queryCase) {
    return <div className="flex items-center justify-center h-screen bg-slate-100">Loading Task...</div>;
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
        {/* Unified View for Multiple Candidates */}
        <DiverseView
          queryCase={queryCase}
          diverseCases={retrievedCases}
          viewMode={currentTask.taskType === 'VisualTwins' ? 'candidates' : 'variations'}
        />
      </main>
    </div>
  );
}

export default App;