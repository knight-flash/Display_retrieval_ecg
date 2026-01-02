import React, { useState, useMemo, useEffect } from 'react';

// Data Helpers
import { generateMetadata } from './data/mockMetadata';

// Layout
import Sidebar from './components/layout/Sidebar';
import Header from './components/layout/Header';
import ComparisonView from './components/layout/ComparisonView';

// GLOB IMPORTS FOR ALL POTENTIAL DATA
// We load all manifests at once to know what databases exist
// Keys will be like "./data/database/manifest.json", "./data/database1/manifest.json"
const allManifestModules = import.meta.glob('./data/*/manifest.json');

function App() {
  // --- DATABASE SELECTION STATE ---
  const [databases, setDatabases] = useState([]);
  const [currentDatabase, setCurrentDatabase] = useState(null);

  // Discover Databases on Mount
  useEffect(() => {
    // Extract database names from paths like "./data/database/manifest.json" -> "database"
    const dbNames = Object.keys(allManifestModules).map(path => {
      const parts = path.split('/');
      return parts[2]; // ., data, [database], manifest.json
    });
    setDatabases(dbNames);
    if (dbNames.length > 0 && !currentDatabase) {
      // Default to 'database' if exists, else first one
      setCurrentDatabase(dbNames.includes('database') ? 'database' : dbNames[0]);
    }
  }, []);


  // --- PATIENT & CASE STATE ---
  const [patientManifest, setPatientManifest] = useState([]);
  const [currentPatientIndex, setCurrentPatientIndex] = useState(0);
  const [rawCases, setRawCases] = useState([]); // Retrieval matches for current patient

  // Load Manifest when Database or Selection Changes
  useEffect(() => {
    if (!currentDatabase) return;

    const loadManifest = async () => {
      try {
        const path = `./data/${currentDatabase}/manifest.json`;
        if (allManifestModules[path]) {
          const mod = await allManifestModules[path]();
          const data = mod.default || mod;
          setPatientManifest(data);
          setCurrentPatientIndex(0); // Reset index on DB switch
        }
      } catch (e) {
        console.error("Error loading manifest:", e);
      }
    };
    loadManifest();
  }, [currentDatabase]);

  // Load Retrieval Data (Matches) when Patient Changes
  // We need Dynamic Imports for the specific database folder
  // Vite's import.meta.glob must be static strings conceptually, so we might need a broader glob
  // Strategy: Glob EVERYTHING under data and filter at runtime.
  // This might be heavy if data is huge, but standard for this tool type.
  const allRetrievalModules = useMemo(() => import.meta.glob(['./data/*/retrievals/*.json', './data/*/index.json']), []);
  const allCaseModules = useMemo(() => import.meta.glob('./data/*/cases/*.json'), []);

  useEffect(() => {
    if (!currentDatabase || patientManifest.length === 0) return;

    const currentPatient = patientManifest[currentPatientIndex];
    if (!currentPatient) return;

    const loadRetrieval = async () => {
      try {
        // Construct expected path: ./data/{db}/retrievals/{file}
        // manifest.retrievalFile is likely "retrievals/retrieval_xxx.json" or similar relative path
        const relativePath = currentPatient.retrievalFile;
        const fullPath = `./data/${currentDatabase}/${relativePath}`;

        // Find matching module
        const modKey = Object.keys(allRetrievalModules).find(k => k === fullPath)
          || Object.keys(allRetrievalModules).find(k => k.endsWith(relativePath.split('/').pop()));

        if (modKey) {
          const mod = await allRetrievalModules[modKey]();
          setRawCases(mod.default || mod);
        } else {
          console.warn("Retrieval file not found:", fullPath);
          setRawCases([]);
        }
      } catch (e) {
        console.error("Error loading retrieval:", e);
      }
    };
    loadRetrieval();
  }, [currentDatabase, currentPatientIndex, patientManifest]);


  // --- PROCESSING & UI STATE ---
  // Pre-process cases (Fix formatting, add missing fields)
  const processedCases = useMemo(() => {
    if (!rawCases) return [];
    return rawCases.map(c => {
      // Fix diagnosis format
      let diagArray = [];
      if (Array.isArray(c.diagnosis)) {
        diagArray = (c.diagnosis.length > 0 && c.diagnosis[0].includes('|'))
          ? c.diagnosis[0].split('|')
          : c.diagnosis;
      } else if (typeof c.diagnosis === 'string') {
        diagArray = c.diagnosis.split('|');
      }

      // Determine Group Rank (use medicalGroup or unknown)
      const rank = c.medicalGroup || 'unknown';

      return {
        ...c,
        diagnosis: diagArray,
        groupRank: rank,
        // Ensure ID is string
        id: String(c.id),
        fileName: c.fileName || `cases/${c.id}.json` // Ensure fileName exists for detailed loading
      };
    });
  }, [rawCases]);

  // Separate Query Case (if included in list) and Retrieval Results
  const { queryCaseStub, retrievalResults } = useMemo(() => {
    const query = processedCases.find(c => c.isQueryCase) || null;
    const results = processedCases.filter(c => !c.isQueryCase);
    return { queryCaseStub: query, retrievalResults: results };
  }, [processedCases]);

  // Generate Metadata (Groups) for Selector
  const dynamicGroups = useMemo(() => generateMetadata(retrievalResults), [retrievalResults]);

  // UI State
  const [activeGroupId, setActiveGroupId] = useState(null);
  const [selectedCaseStub, setSelectedCaseStub] = useState(null);

  // Active Group Object
  const activeGroup = useMemo(() => {
    if (activeGroupId) return dynamicGroups.find(g => g.rank === activeGroupId) || dynamicGroups[0];
    return dynamicGroups.length > 0 ? dynamicGroups[0] : null;
  }, [activeGroupId, dynamicGroups]);

  // Filtered Display List
  const displayCases = useMemo(() => {
    if (!activeGroup) return [];
    // New Logic: Filter by checking if the case has the selected diagnosis tag
    // activeGroup.rank is now the tag string (e.g., "Atrial Fibrillation")
    return retrievalResults.filter(c => {
      if (Array.isArray(c.diagnosis)) {
        return c.diagnosis.map(d => d.trim()).includes(activeGroup.rank);
      }
      return false;
    });
  }, [activeGroup, retrievalResults]);

  // --- DETAILED DATA LOADING (Full Signals) ---
  const [queryCaseFull, setQueryCaseFull] = useState(null);
  const [selectedCaseFull, setSelectedCaseFull] = useState(null);

  // 1. Load Query Case Full Data
  useEffect(() => {
    // Reset when patient changes
    setQueryCaseFull(null);

    const loadQuery = async () => {
      // If we have a query stub from the list, use it to find the file
      // If not (e.g. manifest has ID but it's not in retrieval list), we might need to use manifest data directly
      // For now, assume retrieval list contains the query case marked isQueryCase=true OR we use the patient manifest info

      // BETTER APPROCH: Use manifest "fileName" to load the query case directly
      // currentPatient in manifest has: id, fileName, etc.
      const currentPatient = patientManifest[currentPatientIndex];
      if (!currentPatient) return;

      try {
        const fullPath = `./data/${currentDatabase}/${currentPatient.fileName}`;
        const modKey = Object.keys(allCaseModules).find(k => k === fullPath)
          || Object.keys(allCaseModules).find(k => k.endsWith(currentPatient.fileName.split('/').pop()));

        if (modKey) {
          const mod = await allCaseModules[modKey]();
          const data = mod.default || mod;
          setQueryCaseFull(data);
        }
      } catch (e) { console.error("Error loading query case", e); }
    };

    loadQuery();
  }, [currentDatabase, currentPatientIndex, patientManifest]);

  // 2. Load Selected Comparison Case Full Data
  useEffect(() => {
    if (!selectedCaseStub) {
      setSelectedCaseFull(null);
      return;
    }

    const loadSelected = async () => {
      try {
        // Stub has fileName relative to its database? Check mock data structure.
        // Usually retrieval items have "fileName": "cases/xxxx.json"
        const fullPath = `./data/${currentDatabase}/${selectedCaseStub.fileName}`;
        const modKey = Object.keys(allCaseModules).find(k => k === fullPath)
          || Object.keys(allCaseModules).find(k => k.endsWith(selectedCaseStub.fileName.split('/').pop()));

        if (modKey) {
          const mod = await allCaseModules[modKey]();
          const data = mod.default || mod;
          // Inject similarity from stub into full data for display
          setSelectedCaseFull({ ...data, similarity: selectedCaseStub.similarity });
        }
      } catch (e) { console.error("Error loading comparison case", e); }
    };
    loadSelected();
  }, [selectedCaseStub, currentDatabase]);


  return (
    <div className="flex h-screen bg-slate-100 font-sans text-slate-800 overflow-hidden selection:bg-blue-100">

      {/* 1. Sidebar (Optional, can hide if redundant now) */}
      <Sidebar
        groups={dynamicGroups}
        activeGroupId={activeGroup?.rank}
        onSelectGroup={setActiveGroupId}
      />

      {/* 2. Main Content */}
      <div className="flex-1 flex flex-col min-w-0">
        <Header
          doctorName="Dr. Yan"
          version="BETA v3.1"
          onPrevPatient={() => setCurrentPatientIndex(prev => Math.max(0, prev - 1))}
          onNextPatient={() => setCurrentPatientIndex(prev => Math.min(patientManifest.length - 1, prev + 1))}
          currentPatientIndex={currentPatientIndex}
          totalPatients={patientManifest.length}
          databases={databases}
          currentDatabase={currentDatabase}
          onDatabaseChange={setCurrentDatabase}
        />

        <main className="flex-1 overflow-hidden relative">
          <ComparisonView
            queryCase={queryCaseFull}
            detailedCase={selectedCaseFull}
            selectedCase={selectedCaseStub}
            retrievedCases={displayCases}
            activeGroup={activeGroup}
            groups={dynamicGroups}
            onSelectCase={setSelectedCaseStub}
            onGroupChange={(g) => setActiveGroupId(g.rank)}
          />
        </main>
      </div>
    </div>
  );
}

export default App;