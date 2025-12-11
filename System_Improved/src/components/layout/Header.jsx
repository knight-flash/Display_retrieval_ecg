import React from 'react';
import { Share2, User, ChevronDown } from 'lucide-react';

const Header = ({ doctorName = "Dr. Yan", version = "BETA v2.1" }) => {
    return (
        <header className="h-14 bg-white border-b border-slate-200 flex items-center justify-between px-6 shadow-sm shrink-0 z-10">
            <div className="flex items-center gap-3">
                <h1 className="text-lg font-bold text-slate-900 tracking-tight">ECG-RAG <span className="text-slate-400 font-normal">Clinical Assistant</span></h1>
                <span className="bg-blue-50 text-blue-700 text-[10px] font-bold px-2 py-0.5 rounded-full border border-blue-100">{version}</span>
            </div>
            <div className="flex items-center gap-4">
                <button className="p-2 text-slate-400 hover:bg-slate-50 rounded-full"><Share2 size={18} /></button>
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
