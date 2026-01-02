import React from 'react';
import { Activity } from 'lucide-react';

const RetrievalCard = ({ item, onClick, index }) => {
    return (
        <div
            onClick={onClick}
            className="group p-3 rounded-xl border border-slate-100 bg-white hover:border-blue-400 hover:ring-1 hover:ring-blue-100 hover:shadow-md cursor-pointer transition-all duration-200 relative"
        >
            <div className="flex justify-between items-start mb-2">
                <div className="font-bold text-slate-800 text-sm group-hover:text-blue-700 transition-colors">{item.id}</div>
                <div className="text-[10px] font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full border border-blue-100">
                    {(item.similarity * 100).toFixed(1)}% Sim
                </div>
            </div>

            <div className="flex flex-wrap gap-1 mb-1">
                {item.diagnosis.map((tag, i) => (
                    <span key={i} className="text-[10px] bg-slate-50 text-slate-600 px-1.5 py-0.5 rounded border border-slate-200 font-medium">
                        {tag}
                    </span>
                ))}
            </div>
        </div>
    );
};

export default RetrievalCard;
