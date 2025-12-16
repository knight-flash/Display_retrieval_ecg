import React, { useState } from 'react';
import { ChevronDown, CheckCircle2 } from 'lucide-react';
import ConfidenceBadge from '../common/ConfidenceBadge';

const DiagnosisSelector = ({ activeGroup, onChange, groups = [] }) => {
    const [isDropdownOpen, setIsDropdownOpen] = useState(false);

    return (
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-3 shrink-0 relative z-30">
            <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-bold text-slate-400 uppercase">Selected Diagnosis Candidate</span>
                <ConfidenceBadge level={activeGroup?.confidence || "Low"} />
            </div>

            <button
                className={`w-full p-3 rounded-lg flex justify-between items-center border transition-all group relative ${isDropdownOpen ? 'bg-blue-50 border-blue-400 ring-2 ring-blue-100' : 'bg-blue-50/30 border-blue-200 hover:bg-blue-50 hover:border-blue-300'}`}
                onClick={() => setIsDropdownOpen(!isDropdownOpen)}
            >
                <div className="flex flex-col items-start">
                    <div className="text-blue-800 font-bold text-lg flex items-center gap-2">
                        {activeGroup?.name || "Select Diagnosis"}
                    </div>
                    <div className="text-xs text-blue-500 font-medium mt-0.5">Score: {(activeGroup?.score || 0).toFixed(2)} • {activeGroup?.supportCount || 0} Supporting Cases</div>
                </div>
                <ChevronDown size={20} className={`text-blue-400 transition-transform duration-200 ${isDropdownOpen ? 'rotate-180 text-blue-600' : 'group-hover:text-blue-600'}`} />
            </button>

            {/* Dropdown Menu */}
            {isDropdownOpen && (
                <div className="absolute top-full left-0 right-0 mt-2 bg-white border border-slate-200 rounded-xl shadow-xl z-50 overflow-hidden animate-in fade-in zoom-in-95 duration-200">
                    <div className="p-2 bg-slate-50 border-b border-slate-100 text-xs font-bold text-slate-500 uppercase flex justify-between">
                        <span>Available Candidates</span>
                        <span>Relevance Score</span>
                    </div>
                    <div className="max-h-64 overflow-y-auto custom-scrollbar">
                        {groups.map((group) => (
                            <button
                                key={group.rank}
                                onClick={() => {
                                    onChange(group);
                                    setIsDropdownOpen(false);
                                }}
                                className={`w-full text-left p-3 hover:bg-slate-50 flex justify-between items-center border-b border-slate-50 last:border-0 transition-colors ${activeGroup?.rank === group.rank ? 'bg-blue-50/50' : ''}`}
                            >
                                <div className="flex items-center gap-3">
                                    <div className={`w-3 h-3 rounded-full shrink-0 ${activeGroup?.rank === group.rank ? 'bg-blue-600' : 'bg-slate-300'}`} />
                                    <div>
                                        <div className={`font-bold text-sm ${activeGroup?.rank === group.rank ? 'text-blue-700' : 'text-slate-700'}`}>{group.name}</div>
                                        <div className="text-xs text-slate-400">{group.supportCount} cases found</div>
                                    </div>
                                </div>
                                <div className="flex items-center gap-3">
                                    <span className="font-mono text-sm font-medium text-slate-600">{group.score.toFixed(2)}</span>
                                    {activeGroup?.rank === group.rank && <CheckCircle2 size={16} className="text-blue-600" />}
                                </div>
                            </button>
                        ))}
                    </div>
                </div>
            )}

            {/* Overlay to close dropdown */}
            {isDropdownOpen && <div className="fixed inset-0 z-[-1]" onClick={() => setIsDropdownOpen(false)}></div>}
        </div>
    );
};

export default DiagnosisSelector;
