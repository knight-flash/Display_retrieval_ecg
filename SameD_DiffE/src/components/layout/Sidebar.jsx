import React from 'react';
import { Activity, Search, FileText, LayoutGrid } from 'lucide-react';

const Sidebar = () => {
    return (
        <div className="w-16 bg-slate-900 flex flex-col items-center py-6 space-y-6 shadow-2xl z-20 shrink-0">
            <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center shadow-lg hover:bg-blue-500 transition cursor-pointer">
                <Activity className="w-6 h-6 text-white" />
            </div>
            <div className="flex flex-col gap-4 w-full items-center">
                <div className="p-3 bg-slate-800 rounded-xl text-blue-400 cursor-pointer"><Search size={20} /></div>
                <div className="p-3 text-slate-400 hover:text-white hover:bg-slate-800 rounded-xl transition cursor-pointer"><FileText size={20} /></div>
                <div className="p-3 text-slate-400 hover:text-white hover:bg-slate-800 rounded-xl transition cursor-pointer"><LayoutGrid size={20} /></div>
            </div>
            <div className="mt-auto pb-4">
                <div className="w-8 h-8 rounded-full bg-slate-700 flex items-center justify-center text-slate-400 text-xs">JD</div>
            </div>
        </div>
    );
};

export default Sidebar;
