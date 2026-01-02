import React, { useRef, useEffect } from 'react';
import { generateECGPath, dataToPath } from '../../utils/ecgRenderer';

/**
 * ECGCanvas Component - Standardized Medical Scale Implementation
 * 
 * Corrections:
 * 1. Horizontal Scrolling: Validated 10s data on standard grid.
 * 2. Scale: 
 *    - Paper Speed 25mm/s.
 *    - 1 large grid (5mm) = 0.2s.
 *    - 1 small grid (1mm) = 0.04s.
 *    - 10s = 50 large grids.
 *    - Using 50px per large grid (screen representation):
 *      Total Width = 50 * 50px = 2500px.
 * 
 * Configuration:
 * - Container Width: Fixed 2500px to force scroll.
 * - SVG ViewBox: 0 0 2500 80.
 * - Data Rendering: Stretched to 2500px.
 */
const ECGCanvas = ({ activeGroupRank = 1, isCompact = false, signalData = null, leads = null }) => {
    const leadNames = [
        "I", "II", "III", "aVR", "aVL", "aVF",
        "V1", "V2", "V3", "V4", "V5", "V6"
    ];

    // Standard Width Calculation for 10s at 25mm/s (assuming 50px = 5mm large grid)
    const STANDARD_WIDTH_PX = 2500;

    return (
        <div className="h-full w-full relative bg-white overflow-hidden">

            {/* Scrollable Container (Both X and Y) */}
            <div className="h-full w-full overflow-auto custom-scrollbar relative z-0">

                {/* Fixed Width Content Wrapper to Enforce 10s Scale */}
                <div
                    className="relative"
                    style={{
                        width: `${STANDARD_WIDTH_PX}px`,
                        // Standard ECG Grid: Small 1mm boxes, Large 5mm boxes
                        // Layering: Large Grid (Darker/Thicker 2px) on TOP, then Small Grid
                        backgroundImage: `
                            linear-gradient(#fca5a5 1.25px, transparent 1.25px), 
                            linear-gradient(90deg, #fca5a5 1.25px, transparent 1.25px),
                            linear-gradient(#ffe4e6 1px, transparent 1px), 
                            linear-gradient(90deg, #ffe4e6 1px, transparent 1px)
                        `,
                        // Matching sizes for the layers above: 50px (Large), 50px (Large), 10px (Small), 10px (Small)
                        backgroundSize: '50px 50px, 50px 50px, 10px 10px, 10px 10px',
                        backgroundAttachment: 'local'
                    }}
                >
                    {leadNames.map((leadName, i) => {
                        let pathData;
                        // Use real lead data if available (Scale: 50 units = 1mV to match 10mm grid)
                        if (leads && leads[leadName]) {
                            pathData = dataToPath(leads[leadName], STANDARD_WIDTH_PX, 80, 50);
                        }
                        // Fallback to preview signal if available
                        else if (signalData) {
                            pathData = dataToPath(signalData, STANDARD_WIDTH_PX, 80, 50);
                        }
                        // Fallback to synthetic
                        else {
                            pathData = generateECGPath(STANDARD_WIDTH_PX, 40, "dynamic", i, activeGroupRank);
                        }

                        return (
                            <div key={i} className="h-40 border-b-2 border-red-400 relative shrink-0">
                                {/* Lead Label - Enhanced Visibility, Sticky Left */}
                                <div className="sticky left-0 z-10 top-1 ml-2 mt-1 inline-block">
                                    <span className="text-xs font-bold text-red-900 bg-white/90 px-1.5 py-0.5 rounded backdrop-blur-[2px] border border-red-100 shadow-sm">
                                        {leadName}
                                    </span>
                                </div>

                                {/* ECG Path Container */}
                                <div className="absolute inset-0 flex items-center w-full h-full">
                                    <svg viewBox={`0 0 ${STANDARD_WIDTH_PX} 80`} preserveAspectRatio="none" className="w-full h-full text-slate-800 display-block">
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

                    {/* Bottom Spacer */}
                    {!isCompact && <div className="h-4" />}
                </div>

                {/* Time Axis (Fixed at bottom relative to scroll content? No, ideally sticky) 
                     If we put it here inside scroll, it scrolls with content. 
                     That allows seeing "8s", "9s" etc. 
                 */}
                {!isCompact && (
                    <div className="h-8 shrink-0 bg-white/80 backdrop-blur border-t-2 border-red-400 relative select-none shadow-[0_-2px_10px_rgba(0,0,0,0.02)]" style={{ width: `${STANDARD_WIDTH_PX}px` }}>
                        <div className="absolute inset-0 w-full">
                            {/* 10s = 50 grids = 2500px. 1s = 250px. */}
                            {Array.from({ length: 11 }).map((_, i) => (
                                <div key={i} className="absolute top-0 h-full flex flex-col items-center" style={{ left: `${i * 250}px`, transform: 'translateX(-50%)' }}>
                                    <div className="h-1.5 w-px bg-red-500 mb-0.5"></div>
                                    <span className="text-[10px] text-slate-500 font-mono font-bold leading-none">
                                        {i}s
                                    </span>
                                </div>
                            ))}
                            {/* Minor Ticks (0.2s = 50px) */}
                            {Array.from({ length: 51 }).map((_, i) => (
                                <div key={`tick-${i}`} className="absolute top-0 h-1 w-px bg-red-300" style={{ left: `${i * 50}px` }}></div>
                            ))}
                        </div>
                    </div>
                )}
            </div>
        </div>
    )
};

export default ECGCanvas;
