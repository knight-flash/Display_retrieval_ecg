import React from 'react';
import { generateECGPath, dataToPath } from '../../utils/ecgRenderer';

/**
 * ECGCanvas Component - Full Implementation
 * 
 * Features:
 * 1. Full 12-lead scrollable display
 * 2. Grid background moves with content (CSS-based)
 * 3. Responsive fluid width (100% container)
 * 4. Fixed bottom time axis
 * 5. Proper scrolling functionality
 */
const ECGCanvas = ({ activeGroupRank = 1, isCompact = false, signalData = null, leads = null }) => {
    const leadNames = [
        "I", "II", "III", "aVR", "aVL", "aVF",
        "V1", "V2", "V3", "V4", "V5", "V6"
    ];

    return (
        <div className="h-full w-full relative bg-white overflow-hidden">

            {/* Scrollable Container with Grid Background */}
            <div className="h-full overflow-y-auto custom-scrollbar relative">

                {/* Content Wrapper with ECG Grid Background */}
                <div className="relative w-full"
                    style={{
                        // Standard ECG Grid: Small 1mm boxes, Large 5mm boxes
                        backgroundImage: `
                            linear-gradient(#ffe4e6 1px, transparent 1px), 
                            linear-gradient(90deg, #ffe4e6 1px, transparent 1px), 
                            linear-gradient(#fca5a5 1px, transparent 1px), 
                            linear-gradient(90deg, #fca5a5 1px, transparent 1px)
                        `,
                        backgroundSize: '10px 10px, 10px 10px, 50px 50px, 50px 50px',
                        backgroundAttachment: 'local' // Ensures bg scrolls with content
                    }}
                >
                    {leadNames.map((leadName, i) => {
                        let pathData;
                        // Use real lead data if available (Scale: 50 units = 1mV to match 10mm grid)
                        if (leads && leads[leadName]) {
                            pathData = dataToPath(leads[leadName], 500, 80, 50);
                        }
                        // Fallback to preview signal if available
                        else if (signalData) {
                            pathData = dataToPath(signalData, 500, 80, 50);
                        }
                        // Fallback to synthetic
                        else {
                            pathData = generateECGPath(500, 40, "dynamic", i, activeGroupRank);
                        }

                        return (
                            <div key={i} className="h-40 border-b border-red-200 relative shrink-0">
                                {/* Lead Label */}
                                <span className="absolute top-1 left-2 text-xs font-bold text-slate-500 z-10 bg-white/60 px-1 rounded backdrop-blur-[2px]">
                                    {leadName}
                                </span>

                                {/* ECG Path Container */}
                                <div className="absolute inset-0 flex items-center w-full h-full">
                                    {/* 
                                    SVG Configuration:
                                    - width/height: 100% to fill container
                                    - viewBox: "0 0 500 80" defines coordinate system
                                    - preserveAspectRatio: "none" stretches to fit container
                                    - vectorEffect: "non-scaling-stroke" keeps line thickness constant during stretch
                                     */}
                                    <svg viewBox="0 0 500 80" preserveAspectRatio="none" className="w-full h-full text-slate-800 display-block">
                                        <path
                                            d={pathData}
                                            fill="none"
                                            stroke="#0f172a"
                                            strokeWidth="1.5"
                                            vectorEffect="non-scaling-stroke"
                                            strokeLinecap="round"
                                            strokeLinejoin="round"
                                        />
                                    </svg>
                                </div>
                            </div>
                        );
                    })}

                    {/* Bottom Spacer to ensure last lead doesn't get cut off by Time Axis */}
                    {!isCompact && <div className="h-4" />}
                </div>
            </div>

            {/* Time Axis (Fixed at bottom of Component) */}
            {!isCompact && (
                <div className="h-8 shrink-0 bg-white/95 backdrop-blur border-t border-red-200 relative select-none z-20 shadow-[0_-2px_10px_rgba(0,0,0,0.02)]">
                    {/* Ticks 0-10s using Percentage for Fluid Layout */}
                    <div className="absolute inset-0 w-full">
                        {Array.from({ length: 11 }).map((_, i) => (
                            <div key={i} className="absolute top-0 h-full flex flex-col items-center" style={{ left: `${i * 10}%`, transform: 'translateX(-50%)' }}>
                                <div className="h-1.5 w-px bg-red-400 mb-0.5"></div>
                                <span className="text-[10px] text-slate-400 font-mono font-medium leading-none">
                                    {i}s
                                </span>
                            </div>
                        ))}
                        {/* Minor Ticks (every 2%) */}
                        {Array.from({ length: 51 }).map((_, i) => (
                            <div key={`tick-${i}`} className="absolute top-0 h-1 w-px bg-red-200" style={{ left: `${i * 2}%` }}></div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    )
};

export default ECGCanvas;
