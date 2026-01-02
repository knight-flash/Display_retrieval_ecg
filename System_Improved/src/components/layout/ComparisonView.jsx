import React from 'react';
import MonitorPanel from '../monitor/MonitorPanel';
import RetrievalList from '../retrieval/RetrievalList';
import DiagnosisWriter from '../diagnosis/DiagnosisWriter';
import { AlertCircle } from 'lucide-react';

const ComparisonView = ({
    queryCase,        // The main patient case (Left Panel)
    detailedCase,     // Full details of selected comparison case (Middle Panel) or NULL
    selectedCase,     // The basic selected item from the list
    retrievedCases,   // List of cases
    activeGroup,      // Result of DiagnosisSelector
    groups,           // All groups for selector
    onSelectCase,     // Action when clicking list item
    onGroupChange,    // Action when changing diagnosis group
}) => {
    return (
        <div className="h-full w-full flex overflow-hidden">
            {/* 1. Left Panel: Query Case (Reference) */}
            <div className="flex-1 flex flex-col min-w-0 border-r border-slate-200 bg-slate-50/50">
                <div className="bg-blue-50 px-4 py-3 border-b border-blue-100 flex justify-between items-center shrink-0 h-14">
                    <h3 className="font-bold text-blue-900 flex items-center gap-2">
                        <span className="bg-blue-200 text-blue-700 text-xs px-2 py-0.5 rounded uppercase tracking-wider">Target</span>
                        Patient Query
                    </h3>
                    <div className="flex gap-1">
                        {queryCase?.diagnosis?.map((d, i) => (
                            <span key={i} className="px-1.5 py-0.5 bg-white text-blue-700 text-[10px] font-semibold rounded border border-blue-100 shadow-sm">
                                {d}
                            </span>
                        ))}
                    </div>
                </div>
                <div className="flex-1 relative p-2 h-full flex flex-col">
                    <MonitorPanel
                        detailedCase={queryCase}
                        displayCase={queryCase}
                        activeGroup={{ rank: 'query' }} // Helper to avoid displaying unrelated markers
                    />
                </div>
            </div>

            {/* 2. Middle Panel: Selected Comparison */}
            <div className="flex-1 flex flex-col min-w-0 border-r border-slate-200 bg-white">
                <div className="bg-white px-4 py-3 border-b border-slate-100 flex justify-between items-center shrink-0 h-14">
                    <div className="flex items-center gap-3 overflow-hidden">
                        <h3 className="font-bold text-slate-800 flex items-center gap-2 shrink-0">
                            <span className="bg-purple-100 text-purple-700 text-xs px-2 py-0.5 rounded uppercase tracking-wider">
                                Retrieval
                            </span>
                            Selected Evidence
                        </h3>

                        {/* Diagnosis Tags */}
                        <div className="flex gap-1 overflow-x-auto no-scrollbar mask-linear-right">
                            {(detailedCase || selectedCase)?.diagnosis?.map((d, i) => (
                                <span key={i} className="px-1.5 py-0.5 bg-purple-50 text-purple-700 text-[10px] font-semibold rounded border border-purple-100 shadow-sm whitespace-nowrap">
                                    {d}
                                </span>
                            ))}
                        </div>
                    </div>

                    {selectedCase && (
                        <span className="text-xs font-mono text-slate-400 shrink-0 ml-2">
                            Sim: {(selectedCase.similarity * 100).toFixed(1)}%
                        </span>
                    )}
                </div>
                <div className="flex-1 relative p-2 h-full flex flex-col">
                    {detailedCase ? (
                        <MonitorPanel
                            detailedCase={detailedCase}
                            displayCase={detailedCase}
                            activeGroup={activeGroup}
                        />
                    ) : (
                        <div className="absolute inset-0 flex flex-col items-center justify-center text-slate-400">
                            {selectedCase ? (
                                <>
                                    <div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin mb-3"></div>
                                    <span className="text-sm text-slate-500 font-medium">Loading full signal data...</span>
                                </>
                            ) : (
                                <>
                                    <AlertCircle className="w-8 h-8 mb-2 opacity-50" />
                                    <span className="text-sm">Select a case from the list to compare</span>
                                </>
                            )}
                        </div>
                    )}
                </div>
            </div>

            {/* 3. Right Panel: List & Diagnosis */}
            <div className="w-96 flex flex-col bg-white shrink-0 border-l border-slate-200 shadow-xl z-10">
                {/* Top: Retrieval List (Flexible) */}
                <div className="flex-1 flex flex-col min-h-0">
                    <RetrievalList
                        className="flex-1"
                        activeGroup={activeGroup}
                        groups={groups}
                        onGroupChange={onGroupChange}
                        cases={retrievedCases}
                        onSelectCase={onSelectCase}
                    />
                </div>

                {/* Bottom: Diagnosis Writer (Fixed) */}
                <div className="h-1/5 min-h-[160px] border-t border-slate-200 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)] z-20">
                    <DiagnosisWriter caseId={queryCase?.id} />
                </div>
            </div>
        </div>
    );
};

export default ComparisonView;
