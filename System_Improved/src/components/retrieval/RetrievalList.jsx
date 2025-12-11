import React from 'react';
import { AlertCircle } from 'lucide-react';
import DiagnosisSelector from './DiagnosisSelector';
import RetrievalCard from './RetrievalCard';

const RetrievalList = ({ activeGroup, onGroupChange, cases, onSelectCase }) => {
    return (
        <div className="col-span-5 flex flex-col h-full min-h-0 gap-3">

            {/* Selector */}
            <DiagnosisSelector activeGroup={activeGroup} onChange={onGroupChange} />

            {/* List Container */}
            <div className="flex-1 bg-white rounded-xl shadow-sm border border-slate-200 flex flex-col overflow-hidden">
                <div className="px-4 py-3 border-b border-slate-100 bg-slate-50/80 backdrop-blur flex justify-between items-center shrink-0 z-10">
                    <h3 className="font-bold text-slate-700 text-sm">Retrieved Evidence</h3>
                    <span className="text-xs text-slate-400">{cases.length} results found</span>
                </div>

                {/* SCROLL AREA */}
                <div className="flex-1 overflow-y-auto p-3 space-y-3 custom-scrollbar">
                    {cases.map((item, index) => (
                        <RetrievalCard
                            key={index}
                            item={item}
                            index={index}
                            onClick={() => onSelectCase(item)}
                        />
                    ))}
                    {/* Empty state */}
                    {cases.length === 0 && (
                        <div className="p-8 text-center text-slate-400 flex flex-col items-center">
                            <AlertCircle className="mb-2 opacity-50" />
                            <span className="text-xs">No exact case matches found in database.</span>
                        </div>
                    )}
                    {/* Spacer for scroll bottom */}
                    <div className="h-2"></div>
                </div>
            </div>
        </div>
    );
};

export default RetrievalList;
