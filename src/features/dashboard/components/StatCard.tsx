import React from 'react';
import { TrendingUp, TrendingDown } from 'lucide-react';

interface StatCardProps {
    title: string;
    value: string;
    subtext: string;
    subtextPositive?: boolean;
    icon: React.ElementType;
    color: string;
    onClick?: () => void;
    comparisonLabel?: string;
}

export const StatCard: React.FC<StatCardProps> = ({ 
    title, 
    value, 
    subtext, 
    subtextPositive = true, 
    icon: Icon, 
    color, 
    onClick,
    comparisonLabel = 'vs período anterior'
}) => {
    const TrendIcon = subtextPositive ? TrendingUp : TrendingDown;
    const trendColorClass = subtextPositive 
        ? 'bg-green-500/10 text-green-600 dark:text-green-400' 
        : 'bg-red-500/10 text-red-600 dark:text-red-400';

    return (
        <div
            onClick={onClick}
            className={`glass p-6 rounded-xl border border-slate-200 dark:border-white/5 shadow-sm relative overflow-hidden group ${onClick ? 'cursor-pointer hover:border-primary-500/50 transition-colors' : ''}`}
        >
            <div className={`absolute top-0 right-0 p-20 rounded-full blur-3xl opacity-10 -mr-10 -mt-10 transition-opacity group-hover:opacity-20 ${color}`}></div>

            <div className="flex justify-between items-start relative z-10">
                <div>
                    <p className="text-sm font-medium text-slate-500 dark:text-slate-400 mb-1 font-display">{title}</p>
                    <p className="text-3xl font-bold text-slate-900 dark:text-white font-display tracking-tight">{value}</p>
                </div>
                <div className={`p-3 rounded-xl ${color} bg-opacity-10 dark:bg-opacity-20 ring-1 ring-inset ring-white/10`}>
                    <Icon size={20} className={color.replace('bg-', 'text-')} />
                </div>
            </div>
            <p className="text-xs text-slate-500 mt-3 flex items-center gap-1 relative z-10">
                <span className={`${trendColorClass} px-1.5 py-0.5 rounded text-xs font-bold flex items-center gap-1`}>
                    <TrendIcon size={10} /> {subtext}
                </span>
                <span className="ml-1 dark:text-slate-500">{comparisonLabel}</span>
            </p>
        </div>
    );
};
