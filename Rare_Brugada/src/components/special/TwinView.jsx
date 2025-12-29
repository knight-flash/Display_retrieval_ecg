import React from 'react';
import MonitorPanel from '../monitor/MonitorPanel';
import { ArrowLeftRight, AlertTriangle } from 'lucide-react';

const TwinView = ({ queryCase, twinCase }) => {
    if (!twinCase) return <div className="p-10 text-center">Waiting for Twin Data...</div>;

    // Calculate similarity difference textual description
    const diffDiagnosis = () => {
        const d1 = queryCase.diagnosis.join(', ');
        const d2 = twinCase.diagnosis.join(', ');
        return d1 !== d2;
    };

    return (
        <div className="h-full flex flex-col gap-4">
            {/* Contrast Header */}
            <div className={`p-3 rounded-lg border flex items-center justify-between ${diffDiagnosis() ? 'bg-red-50 border-red-200' : 'bg-green-50 border-green-200'}`}>
                <div className="flex items-center gap-4 flex-1">
                    <div className="flex flex-col max-w-[40%]">
                        <span className="text-xs uppercase font-bold text-slate-500 mb-1">Case A (Source)</span>
                        <div className="flex flex-wrap gap-1">
                            {queryCase.diagnosis.map((d, i) => (
                                <span key={i} className="px-1.5 py-0.5 bg-slate-100 text-slate-700 text-xs font-semibold rounded border">
                                    {d}
                                </span>
                            ))}
                        </div>
                    </div>
                    <ArrowLeftRight className="text-slate-400 shrink-0" />
                    <div className="flex flex-col text-right max-w-[40%] items-end">
                        <span className="text-xs uppercase font-bold text-slate-500 mb-1">Case B (Twin)</span>
                        <div className="flex flex-wrap gap-1 justify-end">
                            {twinCase.diagnosis.map((d, i) => (
                                <span key={i} className="px-1.5 py-0.5 bg-blue-50 text-blue-700 text-xs font-semibold rounded border border-blue-100">
                                    {d}
                                </span>
                            ))}
                        </div>
                    </div>
                </div>

                <div className="flex items-center gap-6 ml-4">
                    <div className="text-right">
                        <div className="text-xs text-slate-500">Visual Similarity</div>
                        <div className="text-2xl font-mono font-bold text-blue-600">{(twinCase.similarity * 100).toFixed(1)}%</div>
                    </div>
                    {diffDiagnosis() && (
                        <div className="flex items-center gap-2 text-red-600 bg-white px-3 py-1 rounded-full border border-red-100 shadow-sm">
                            <AlertTriangle size={16} />
                            <span className="font-bold text-sm">Diagnosis Mismatch</span>
                        </div>
                    )}
                </div>
            </div>

            {/* Split View */}
            <div className="flex-1 grid grid-cols-2 gap-4 min-h-0">
                <div className="border border-slate-200 rounded-xl overflow-hidden shadow-sm flex flex-col">
                    <div className="bg-slate-50 px-4 py-2 border-b flex justify-between">
                        <span className="font-bold text-slate-600">Source Waveform</span>
                        <span className="text-xs text-slate-400">{queryCase.id}</span>
                    </div>
                    <div className="flex-1 relative">
                        {/* We use MonitorPanel but strictly controlled */}
                        <div className="absolute inset-0">
                            <MonitorPanel detailedCase={queryCase} displayCase={queryCase} activeGroup={null} />
                        </div>
                    </div>
                </div>

                <div className="border border-slate-200 rounded-xl overflow-hidden shadow-sm flex flex-col">
                    <div className="bg-slate-50 px-4 py-2 border-b flex justify-between">
                        <span className="font-bold text-slate-600">Twin Waveform</span>
                        <span className="text-xs text-slate-400">{twinCase.id}</span>
                    </div>
                    <TwinMonitorLoader caseId={twinCase.id} initialData={twinCase} />
                </div>
            </div>
        </div>
    );
};

// Helper to load full case if needed
import { useEffect, useState } from 'react';
const TwinMonitorLoader = ({ caseId, initialData }) => {
    const [fullData, setFullData] = useState(null);

    return (
        <div className="flex-1 relative">
            {fullData || initialData.leads ? (
                <div className="absolute inset-0">
                    <MonitorPanel detailedCase={fullData || initialData} displayCase={fullData || initialData} />
                </div>
            ) : (
                <div className="h-full flex items-center justify-center text-slate-400">
                    <span className="text-center">
                        Loading Twin Data... <br />
                        (ID: {caseId})
                    </span>
                </div>
            )}
        </div>
    );
}

export default TwinView;
