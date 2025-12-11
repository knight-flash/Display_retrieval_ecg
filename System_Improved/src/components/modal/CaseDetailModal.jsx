import React from 'react';
import { FileText, CheckCircle2, BarChart3, Activity, X, BookOpen } from 'lucide-react';
import ECGCanvas from '../common/ECGCanvas';
import { knowledgeBase } from '../../data/mockMetadata';
import { generateECGPath } from '../../utils/ecgRenderer';

// We need a local TwelveLeadView for the modal if we want it to be 6x2 or 1x12?
// The original code had a 1x12 view in the modal too (implied by reusing TwelveLeadView).
// Let's create a local reusable 1x12 view or import ECGCanvas.
// The plan suggests reusing logic. Let's reuse ECGCanvas but maybe we want a non-compact version?
// ECGCanvas already accepts isCompact.



const CaseDetailModal = ({ caseData, onClose }) => {
    if (!caseData) return null;

    return (
        <div className="fixed inset-0 bg-slate-900/60 z-50 flex items-center justify-center p-6 backdrop-blur-sm animate-in fade-in duration-200" onClick={onClose}>
            <div className="bg-white w-full max-w-6xl h-[90vh] rounded-2xl shadow-2xl flex flex-col overflow-hidden ring-1 ring-white/20" onClick={e => e.stopPropagation()}>

                {/* Modal Header */}
                <div className="h-16 border-b border-slate-200 flex items-center justify-between px-6 bg-slate-50 shrink-0">
                    <div className="flex items-center gap-4">
                        <div className="p-2 bg-blue-100 rounded-lg text-blue-600"><FileText size={20} /></div>
                        <div>
                            <h2 className="font-bold text-lg text-slate-900 leading-tight">Reference Case: {caseData.id}</h2>
                            <span className="flex items-center gap-1 text-xs text-green-600 font-medium">
                                <CheckCircle2 size={12} /> Verified Diagnosis
                            </span>
                        </div>
                    </div>

                    <div className="flex items-center gap-6">
                        <div className="flex items-center gap-3 bg-blue-50 px-4 py-1.5 rounded-lg border border-blue-100">
                            <div className="text-right">
                                <div className="text-[10px] text-blue-400 uppercase font-bold tracking-wider">Similarity</div>
                                <div className="text-xl font-black text-blue-700 leading-none">{(caseData.similarity * 100).toFixed(1)}%</div>
                            </div>
                            <BarChart3 size={24} className="text-blue-500" />
                        </div>
                        <button onClick={onClose} className="p-2 hover:bg-slate-200 rounded-full text-slate-400 hover:text-slate-600 transition-colors"><X size={24} /></button>
                    </div>
                </div>

                {/* Modal Body */}
                <div className="flex-1 overflow-y-auto bg-slate-50/50 p-6 custom-scrollbar">
                    <div className="grid grid-cols-12 gap-6 h-full min-h-[600px]">

                        {/* TOP: Full 12-Lead ECG View */}
                        <div className="col-span-12 bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden flex flex-col h-[560px] shrink-0">
                            <div className="px-4 py-2 border-b border-slate-100 bg-white flex justify-between items-center">
                                <h3 className="font-bold text-slate-700 flex items-center gap-2 text-sm"><Activity size={16} className="text-red-500" /> Historical 12-Lead Record</h3>
                            </div>
                            <div className="flex-1 relative p-1">
                                {/* Reusing ECGCanvas, assuming normal rank/pattern for historical case unless we store pattern in case data */}
                                <ECGCanvas activeGroupRank={caseData.groupRank || 1} />
                            </div>
                        </div>

                        {/* BOTTOM LEFT: Report */}
                        <div className="col-span-5 bg-white rounded-xl shadow-sm border border-slate-200 p-5 flex flex-col">
                            <h3 className="font-bold text-slate-800 mb-4 flex items-center gap-2 border-b border-slate-100 pb-2">
                                <FileText size={18} className="text-blue-500" /> Physician Report
                            </h3>
                            <div className="mb-4 flex flex-wrap gap-2">
                                {caseData.diagnosis.map((tag, i) => (
                                    <span key={i} className={`px-3 py-1 rounded-md text-sm font-bold border ${i === 0 ? 'bg-blue-50 text-blue-700 border-blue-200' : 'bg-slate-50 text-slate-600 border-slate-200'}`}>
                                        {tag}
                                    </span>
                                ))}
                            </div>
                            <div className="flex-1 bg-amber-50/50 rounded-lg border border-amber-100 p-4 font-serif text-slate-700 text-sm leading-relaxed">
                                <span className="font-bold text-slate-900 block mb-1">Observation:</span>
                                "{caseData.report}"
                            </div>
                            <div className="mt-3 pt-3 border-t border-slate-100 text-xs text-slate-400 flex justify-between">
                                <span>ID: {caseData.id}</span>
                                <span>Demographics: {caseData.demographics}</span>
                            </div>
                        </div>

                        {/* BOTTOM RIGHT: Knowledge */}
                        <div className="col-span-7 bg-white rounded-xl shadow-sm border border-slate-200 p-5 flex flex-col">
                            <h3 className="font-bold text-slate-800 mb-4 flex items-center gap-2 border-b border-slate-100 pb-2">
                                <BookOpen size={18} className="text-purple-500" /> Feature Mapping
                            </h3>
                            <div className="flex-1 overflow-y-auto space-y-3 custom-scrollbar pr-1">
                                {caseData.diagnosis.map((tag, idx) => (
                                    knowledgeBase[tag] && (
                                        <div key={idx} className="flex flex-col sm:flex-row gap-4 p-3 rounded-lg border border-slate-100 bg-slate-50/30 hover:bg-white hover:shadow-sm transition-all">
                                            <div className="sm:w-1/3 shrink-0">
                                                <div className="text-[10px] text-slate-400 font-bold uppercase">Diagnostic Label</div>
                                                <div className="font-bold text-slate-800">{tag}</div>
                                            </div>
                                            <div className="flex-1 sm:border-l sm:border-slate-200 sm:pl-4">
                                                <div className="text-[10px] text-slate-400 font-bold uppercase mb-1">Typical ECG Features</div>
                                                <ul className="space-y-1">
                                                    {knowledgeBase[tag].map((feature, fIdx) => (
                                                        <li key={fIdx} className="text-sm text-slate-600 flex items-start gap-2">
                                                            <span className="text-blue-400 mt-1">•</span> {feature}
                                                        </li>
                                                    ))}
                                                </ul>
                                            </div>
                                        </div>
                                    )
                                ))}
                            </div>
                        </div>

                    </div>
                </div>
            </div>
        </div>
    );
};

export default CaseDetailModal;
