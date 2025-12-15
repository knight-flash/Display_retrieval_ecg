
import React from 'react';
import PatientHeader from './PatientHeader';
import ECGCanvas from '../common/ECGCanvas';

const MonitorPanel = ({ activeGroup, detailedCase, displayCase }) => {
    // Debugging: Check what MonitorPanel is actually receiving
    console.log("MonitorPanel Props:");
    console.log(" - displayCase ID:", displayCase?.id);
    console.log(" - detailedCase:", detailedCase ? "Shape: " + Object.keys(detailedCase) : "NULL");
    console.log(" - Has Leads?", detailedCase?.leads ? `YES(${Object.keys(detailedCase.leads).length} leads)` : "NO");
    console.log(" - activeGroup:", activeGroup);
    console.log(" - displayCase:", displayCase);

    return (
        <div className="col-span-7 flex flex-col h-full min-h-0 gap-3">
            {/* Patient Info Card */}
            <PatientHeader />

            {/* Main ECG Display */}
            <div className="flex-1 bg-white rounded-xl shadow-sm border border-slate-200 relative flex flex-col overflow-hidden">
                <div className="h-8 border-b border-slate-100 bg-slate-50 flex items-center justify-between px-3 shrink-0">
                    <span className="text-xs font-bold text-slate-600 uppercase tracking-wider">
                        Live 12-Lead Monitor {displayCase ? `• ${displayCase.id} ` : ''}
                    </span>
                    <div className="flex items-center gap-2">
                        {activeGroup.rank === 2 && <span className="text-[10px] text-amber-600 font-bold bg-amber-100 px-1.5 rounded">Flutter Waves Detected</span>}
                        <span className="text-[10px] font-mono text-slate-400">25mm/s • 10mm/mV • 100Hz</span>
                    </div>
                </div>
                <div className="flex-1 relative overflow-hidden">
                    <ECGCanvas
                        activeGroupRank={activeGroup.rank}
                        leads={detailedCase?.leads}
                        signalData={displayCase?.previewSignal}
                    />
                </div>
            </div>
        </div>
    );
};

export default MonitorPanel;
