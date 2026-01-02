import React from 'react';
import { Share2, User, ChevronDown, Database } from 'lucide-react';

const Header = ({
    doctorName = "Dr. Yan",
    version = "BETA v3.1",
    onPrevPatient,
    onNextPatient,
    currentPatientIndex,
    totalPatients,
    databases = [],
    currentDatabase,
    onDatabaseChange
}) => {
    return (
        <header className="h-14 bg-white border-b border-slate-200 flex items-center justify-between px-6 shadow-sm shrink-0 z-10">
            <div className="flex items-center gap-6">
                <div className="flex items-center gap-3">
                    <h1 className="text-lg font-bold text-slate-900 tracking-tight">ECG-RAG <span className="text-slate-400 font-normal">Clinical Assistant</span></h1>
                    <span className="bg-blue-50 text-blue-700 text-[10px] font-bold px-2 py-0.5 rounded-full border border-blue-100">{version}</span>
                </div>

                {/* Database Selector */}
                {databases.length > 0 && (
                    <div className="flex items-center gap-2 px-3 py-1.5 bg-slate-100 rounded-lg border border-slate-200">
                        <Database size={14} className="text-slate-500" />
                        <select
                            value={currentDatabase}
                            onChange={(e) => onDatabaseChange(e.target.value)}
                            className="bg-transparent text-sm font-semibold text-slate-700 outline-none cursor-pointer min-w-[100px]"
                        >
                            {databases.map(db => (
                                <option key={db} value={db}>{db}</option>
                            ))}
                        </select>
                    </div>
                )}
            </div>

            <div className="flex items-center gap-4">
                {/* Patient Navigation */}
                {onPrevPatient && onNextPatient && (
                    <div className="flex items-center bg-slate-100 rounded-lg p-1 gap-2">
                        <button
                            onClick={onPrevPatient}
                            disabled={currentPatientIndex === 0}
                            className="p-1 hover:bg-white hover:shadow-sm rounded-md disabled:opacity-30 disabled:hover:bg-transparent transition-all"
                            title="Previous Patient"
                        >
                            <ChevronDown size={18} className="rotate-90 text-slate-600" />
                        </button>
                        <span className="text-xs font-mono font-bold text-slate-500 min-w-[60px] text-center">
                            CASE {currentPatientIndex + 1}/{totalPatients}
                        </span>
                        <button
                            onClick={onNextPatient}
                            disabled={currentPatientIndex >= totalPatients - 1}
                            className="p-1 hover:bg-white hover:shadow-sm rounded-md disabled:opacity-30 disabled:hover:bg-transparent transition-all"
                            title="Next Patient"
                        >
                            <ChevronDown size={18} className="-rotate-90 text-slate-600" />
                        </button>
                    </div>
                )}

                <div className="h-8 w-[1px] bg-slate-200"></div>

                <div className="flex items-center gap-2 text-sm font-medium text-slate-600">
                    <User size={16} className="text-slate-400" /> {doctorName}
                    <ChevronDown size={14} className="text-slate-400" />
                </div>
            </div>
        </header>
    );
};

export default Header;
