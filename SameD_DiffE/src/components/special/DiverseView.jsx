import React, { useState, useEffect } from 'react';
import MonitorPanel from '../monitor/MonitorPanel';
import RetrievalCard from '../retrieval/RetrievalCard'; // Direct use to avoid RetrievalList's selector
import { AlertCircle, ArrowLeft } from 'lucide-react';

// Load case files dynamically to fetch full signal data on demand
// Load case files dynamically to fetch full signal data on demand
const caseModules = import.meta.glob('../../data/*/cases/*.json');

// Helper to render tags
const TagList = ({ tags }) => (
    <div className="flex flex-wrap gap-1 mt-1">
        {tags?.map((t, i) => (
            <span key={i} className="px-1.5 py-0.5 bg-blue-50 text-blue-700 text-[10px] font-semibold rounded border border-blue-100">
                {t}
            </span>
        ))}
    </div>
);

const DiverseView = ({ queryCase, diverseCases, manifest, currentIndex, onTaskChange }) => {
    // State to track which diverse case is "Selected" for comparison
    const [selectedCase, setSelectedCase] = useState(null);
    const [fullSelectedCase, setFullSelectedCase] = useState(null);

    // activeGroup is needed for MonitorPanel but we can pass null or mock
    const mockGroup = { name: queryCase?.cleanName || "Disease", rank: "1" };

    // Auto-select first case on mount if available (optional, but good for "comparison" feel)
    useEffect(() => {
        if (diverseCases && diverseCases.length > 0 && !selectedCase) {
            setSelectedCase(diverseCases[0]);
        }
    }, [diverseCases]);

    // Effect to load full case data when a case is selected
    useEffect(() => {
        if (!selectedCase) {
            setFullSelectedCase(null);
            return;
        }

        async function loadFullData() {
            // If the selected case already has leads (unlikely for retrieval items), use it directly
            if (selectedCase.leads) {
                setFullSelectedCase(selectedCase);
                return;
            }

            setFullSelectedCase(null); // Show loading state

            try {
                // The retrieval item has fileName like "cases/de_123.json"
                // The glob keys are like "../../data/database/cases/de_123.json"
                // Match by basename
                const basename = selectedCase.fileName.split('/').pop();
                const moduleKey = Object.keys(caseModules).find(k => k.endsWith(basename));

                if (moduleKey) {
                    const mod = await caseModules[moduleKey]();
                    const fullData = mod.default || mod;
                    // Merge full data with retrieval context (like similarity score)
                    setFullSelectedCase({ ...fullData, similarity: selectedCase.similarity });
                } else {
                    console.error("Could not find full case file for:", basename);
                    // Fallback to what we have (will likely show error in MonitorPanel if leads missing)
                    setFullSelectedCase(selectedCase);
                }
            } catch (err) {
                console.error("Error loading full case details:", err);
                setFullSelectedCase(selectedCase);
            }
        }

        loadFullData();
    }, [selectedCase]);

    return (
        <div className="h-full w-full flex overflow-hidden">
            {/* 1. Left Panel: Disease Prototype (Reference) */}
            <div className="flex-1 flex flex-col min-w-0 border-r border-slate-200 bg-slate-50/50">
                <div className="bg-blue-50 px-4 py-3 border-b border-blue-100 flex flex-col justify-center shrink-0 h-20">
                    <div className="flex justify-between items-center">
                        <h3 className="font-bold text-blue-900 flex items-center gap-2">
                            <span className="bg-blue-200 text-blue-700 text-xs px-2 py-0.5 rounded uppercase tracking-wider">Prototype</span>
                            Reference Case
                        </h3>
                    </div>
                    <TagList tags={queryCase?.diagnosis} />
                </div>
                <div className="flex-1 relative p-2">
                    <MonitorPanel
                        detailedCase={queryCase}
                        displayCase={queryCase}
                        activeGroup={mockGroup}
                    />
                </div>
            </div>

            <div className="flex-1 flex flex-col min-w-0 border-r border-slate-200 bg-white">
                <div className="bg-white px-4 py-3 border-b border-slate-100 flex flex-col justify-center shrink-0 h-20">
                    <div className="flex justify-between items-center">
                        <h3 className="font-bold text-slate-800 flex items-center gap-2">
                            <span className="bg-purple-100 text-purple-700 text-xs px-2 py-0.5 rounded uppercase tracking-wider">Variation</span>
                            Selected Manifestation
                        </h3>
                        {selectedCase && (
                            <span className="text-xs font-mono text-slate-400">
                                Sim: {(selectedCase.similarity * 100).toFixed(1)}%
                            </span>
                        )}
                    </div>
                    <TagList tags={selectedCase?.diagnosis} />
                </div>
                <div className="flex-1 relative p-2">
                    {fullSelectedCase ? (
                        fullSelectedCase.leads ? (
                            <MonitorPanel
                                detailedCase={fullSelectedCase}
                                displayCase={fullSelectedCase}
                                activeGroup={mockGroup}
                            />
                        ) : (
                            <div className="absolute inset-0 flex flex-col items-center justify-center text-slate-400">
                                <AlertCircle className="w-8 h-8 mb-2 opacity-50" />
                                <p>Signal data unavailable</p>
                            </div>
                        )
                    ) : (
                        <div className="absolute inset-0 flex flex-col items-center justify-center">
                            {selectedCase ? (
                                <>
                                    <div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin mb-3"></div>
                                    <span className="text-sm text-slate-500 font-medium">Loading signal...</span>
                                </>
                            ) : (
                                <span className="text-slate-400 italic">Select a case from the list</span>
                            )}
                        </div>
                    )}
                </div>
            </div>

            {/* 3. Right Panel: Selection List */}
            <div className="w-80 flex flex-col bg-white shrink-0 border-l border-slate-200 shadow-xl z-10">
                {/* Fixed Diagnosis Header - No Selection needed as per user request */}
                <div className="p-4 border-b border-slate-100 bg-slate-50">
                    <h4 className="text-xs font-bold text-slate-400 uppercase mb-2 tracking-wider">Target Diagnosis</h4>
                    <div className="bg-white border border-blue-200 rounded-lg p-3 shadow-sm">
                        <div className="font-bold text-blue-700 text-sm leading-tight flex flex-wrap gap-1">
                            {queryCase?.diagnosis?.map((d, i) => (
                                <span key={i} className="px-1.5 py-0.5 bg-blue-50 text-blue-700 text-xs font-semibold rounded border border-blue-100">
                                    {d}
                                </span>
                            )) || "Unknown Diagnosis"}
                        </div>
                        <div className="text-[10px] text-slate-400 mt-2 uppercase tracking-wider">
                            Same Disease • Semantic Contrast
                        </div>
                    </div>
                </div>

                {/* List Header */}
                <div className="px-4 py-2 bg-slate-50/50 border-b border-slate-100 flex justify-between items-center">
                    <span className="text-xs font-bold text-slate-500 uppercase">Variations ({diverseCases.length})</span>
                </div>

                {/* Scrollable List */}
                <div className="flex-1 overflow-y-auto p-3 space-y-3 custom-scrollbar bg-slate-50/30">
                    {diverseCases.map((item, index) => (
                        <div key={index} className={`transition-all duration-200 ${selectedCase?.id === item.id ? 'ring-2 ring-blue-500 rounded-xl shadow-md' : ''}`}>
                            <RetrievalCard
                                item={item}
                                index={index}
                                onClick={() => setSelectedCase(item)}
                            />
                        </div>
                    ))}
                    {diverseCases.length === 0 && (
                        <div className="p-8 text-center text-slate-400 flex flex-col items-center">
                            <AlertCircle className="mb-2 opacity-50" />
                            <span className="text-xs">No variations found.</span>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default DiverseView;
