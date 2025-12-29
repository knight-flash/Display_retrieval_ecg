import React from 'react';
import { MoreHorizontal, Maximize2 } from 'lucide-react';

const PatientHeader = ({ caseData, detailedData }) => {
    // 1. Extract Basic Info
    const id = caseData?.id || "None provided";

    // 2. Extract Demographics (Gender, Age)
    let gender = "Unknown";
    let age = "??";

    if (detailedData?.meta) {
        gender = detailedData.meta.gender || "Unknown";
        age = detailedData.meta.age || "??";
    } else if (caseData?.demographics) {
        // Parse "Male, 67yr" or "Unknown, 80 yr"
        const parts = caseData.demographics.split(',').map(s => s.trim());
        if (parts.length > 0) gender = parts[0];
        if (parts.length > 1) age = parts[1].replace('yr', '').trim();
    }

    // 3. Extract Symptom / Diagnosis
    // Use first diagnosis or medical group
    let symptom = "Assessment Required";

    // Simulate new input for query cases: Hide diagnosis
    if (!caseData?.isQueryCase) {
        if (caseData?.cleanName) {
            symptom = caseData.cleanName;
        } else if (caseData?.diagnosis && caseData.diagnosis.length > 0) {
            symptom = caseData.diagnosis[0]; // Fallback
            // Capitalize first letter
            symptom = symptom.charAt(0).toUpperCase() + symptom.slice(1);
        } else if (caseData?.medicalGroup) {
            symptom = caseData.medicalGroup;
        }
    }

    // New: Medical Category
    const category = caseData?.medicalCategory || null;

    // 4. Extract Time
    // Try detailedData.meta.time, else parse ID
    let time = "None provided";
    if (detailedData?.meta?.time) {
        time = detailedData.meta.time;
    } else if (id && id.length > 15) {
        // Try to find YYYYMMDD... pattern in ID
        // IDs: de_115848437_20110314222032_...
        const matches = id.match(/_(\d{14})/);
        if (matches && matches[1]) {
            const ts = matches[1];
            // Format: YYYY-MM-DD HH:MM
            time = `${ts.substring(0, 4)}-${ts.substring(4, 6)}-${ts.substring(6, 8)} ${ts.substring(8, 10)}:${ts.substring(10, 12)}`;
        }
    }

    return (
        <div className="bg-white p-3 rounded-xl shadow-sm border border-slate-200 shrink-0 flex justify-between items-center">
            <div>
                <h2 className="font-bold text-lg text-slate-800 flex items-center gap-2">
                    {id}
                    <span className="text-xs font-normal text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full">{age}y</span>
                </h2>
                <div className="text-xs text-slate-500 mt-1 flex gap-3 items-center">
                    <span className="text-red-500 font-medium flex items-center gap-2">
                        ⚠️ {symptom}
                    </span>
                    <span>• {time}</span>
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
