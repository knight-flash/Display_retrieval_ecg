import React from 'react';
import { MoreHorizontal, Maximize2 } from 'lucide-react';
import { currentPatient } from '../../data/mockMetadata'; // Using the mock data directly for now

const PatientHeader = () => {
    return (
        <div className="bg-white p-3 rounded-xl shadow-sm border border-slate-200 shrink-0 flex justify-between items-center">
            <div>
                <h2 className="font-bold text-lg text-slate-800 flex items-center gap-2">
                    {currentPatient.id}
                    <span className="text-xs font-normal text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full">{currentPatient.gender}, {currentPatient.age}y</span>
                </h2>
                <div className="text-xs text-slate-500 mt-1 flex gap-3">
                    <span className="text-red-500 font-medium">⚠️ {currentPatient.symptom}</span>
                    <span>• {currentPatient.time}</span>
                </div>
            </div>
            <div className="flex gap-2">
                <button className="p-2 text-slate-500 hover:bg-slate-100 rounded-lg border border-slate-200"><MoreHorizontal size={16} /></button>
                <button className="px-3 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg shadow hover:bg-blue-700 flex items-center gap-1">
                    Analyze <Maximize2 size={14} />
                </button>
            </div>
        </div>
    );
};

export default PatientHeader;
