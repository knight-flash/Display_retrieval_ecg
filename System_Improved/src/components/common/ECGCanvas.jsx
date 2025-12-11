import React, { useState, useEffect, useRef } from 'react';
import { generateECGPath } from '../../utils/ecgRenderer';

// Grid Background Component
export const ECGGrid = ({ children, className = "" }) => (
    <div className={`relative bg-white overflow-hidden ${className}`}>
        {/* Small Grid (1mm) */}
        <div className="absolute inset-0 pointer-events-none z-0"
            style={{
                backgroundImage: 'linear-gradient(#ffe4e6 1px, transparent 1px), linear-gradient(90deg, #ffe4e6 1px, transparent 1px)',
                backgroundSize: '10px 10px'
            }}>
        </div>
        {/* Large Grid (5mm) */}
        <div className="absolute inset-0 pointer-events-none z-0"
            style={{
                backgroundImage: 'linear-gradient(#fca5a5 1px, transparent 1px), linear-gradient(90deg, #fca5a5 1px, transparent 1px)',
                backgroundSize: '50px 50px'
            }}>
        </div>
        <div className="relative z-10 h-full w-full">{children}</div>
    </div>
);

// Main Drawing Component
const ECGCanvas = ({ activeGroupRank = 1, isCompact = false }) => {
    const leads = [
        "I", "II", "III", "aVR", "aVL", "aVF",
        "V1", "V2", "V3", "V4", "V5", "V6"
    ];

    const containerRef = useRef(null);
    const [width, setWidth] = useState(500); // Default width

    useEffect(() => {
        if (!containerRef.current) return;

        const resizeObserver = new ResizeObserver((entries) => {
            for (let entry of entries) {
                if (entry.contentRect) {
                    setWidth(entry.contentRect.width);
                }
            }
        });

        resizeObserver.observe(containerRef.current);

        return () => {
            resizeObserver.disconnect();
        };
    }, []);

    return (
        <div ref={containerRef} className="h-full w-full flex flex-col relative bg-white">

            <div className="flex-1 min-h-0 overflow-y-auto custom-scrollbar relative bg-white">
                {/* Grid Background applied to the scrolling content wrapper 
             so it extends and scrolls with content 
         */}
                <div className="absolute top-0 left-0 min-w-full min-h-full pointer-events-none z-0"
                    style={{
                        width: '100%',
                        height: `${leads.length * 160}px`,
                        backgroundImage: 'linear-gradient(#ffe4e6 1px, transparent 1px), linear-gradient(90deg, #ffe4e6 1px, transparent 1px), linear-gradient(#fca5a5 1px, transparent 1px), linear-gradient(90deg, #fca5a5 1px, transparent 1px)',
                        backgroundSize: '10px 10px, 10px 10px, 50px 50px, 50px 50px',
                        backgroundPosition: '0 0, 0 0, 0 0, 0 0'
                    }}
                ></div>

                <div className="flex flex-col w-full border-l border-t border-red-200 relative z-10">
                    {leads.map((leadName, idx) => (
                        <div key={idx} className="relative border-b border-r border-red-200 overflow-hidden shrink-0 h-40">
                            <span className="absolute top-1 left-1.5 text-[10px] font-bold text-slate-700 z-20">{leadName}</span>
                            <div className="h-full w-full flex items-center">
                                {/* SVG Width is dynamic based on container width */}
                                <svg className="w-full h-full" preserveAspectRatio="none" viewBox={`0 0 ${width} 80`}>
                                    <path
                                        d={generateECGPath(width, 40, "dynamic", idx, activeGroupRank)}
                                        fill="none"
                                        stroke="#0f172a"
                                        strokeWidth="1.5"
                                        strokeLinejoin="round"
                                        vectorEffect="non-scaling-stroke"
                                    />
                                </svg>
                            </div>
                        </div>
                    ))}
                    {!isCompact && <div className="h-8 shrink-0"></div>}
                </div>
            </div>

            {!isCompact && (
                <div className="h-6 w-full bg-red-50/90 backdrop-blur border-t border-red-200 relative shrink-0 select-none z-20 shadow-sm">
                    <div className="absolute inset-0 w-full h-full overflow-hidden">
                        <div className="w-full h-full relative">
                            {/* Dynamic time axis ticks to match resizing logic */}
                            {Array.from({ length: Math.ceil(width / 250) + 1 }).map((_, i) => (
                                <div
                                    key={i}
                                    className="absolute bottom-0 h-full flex flex-col justify-end items-center"
                                    style={{ left: `${i * 250}px`, transform: 'translateX(-50%)' }}
                                >
                                    <span className="text-[9px] text-red-800 font-mono font-medium mb-0.5">{i}s</span>
                                    <div className="h-1.5 w-px bg-red-400"></div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default ECGCanvas;
