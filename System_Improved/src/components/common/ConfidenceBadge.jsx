import React from 'react';

const ConfidenceBadge = ({ level }) => {
    const styles = {
        High: 'text-green-600 bg-green-50 border-green-100',
        Medium: 'text-amber-600 bg-amber-50 border-amber-100',
        Low: 'text-slate-500 bg-slate-100 border-slate-200',
        "Very Low": 'text-slate-400 bg-slate-50 border-slate-100' // Added handling for Very Low
    };

    const defaultStyle = styles.Low;
    const activeStyle = styles[level] || defaultStyle;

    return (
        <span className={`text-xs font-bold px-2 py-0.5 rounded-full border ${activeStyle}`}>
            {level} Confidence
        </span>
    );
};

export default ConfidenceBadge;
