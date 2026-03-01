import React, { useRef, useState } from 'react';

interface ChartDataset {
  label: string;
  data: number[];
  color: string;
}

interface TooltipData {
    index: number;
    datasets: { label: string; value: number; color: string }[];
}

interface BarChartProps {
  labels: string[];
  datasets: ChartDataset[];
  onHover?: (state: { visible: boolean; data: TooltipData; x: number; y: number } | null) => void;
}

const formatValue = (value: number) => {
    if (Math.abs(value) >= 1000000) return (value / 1000000).toFixed(1).replace('.', ',') + 'M';
    if (Math.abs(value) >= 1000) return (value / 1000).toFixed(1).replace('.', ',') + 'k';
    return value.toLocaleString('pt-BR');
};

const getNiceScale = (max: number, ticks: number) => {
    if (max <= 0) return { niceMax: 100, niceTickStep: 25 };
    const range = max;
    const tickStep = range / ticks;
    const mag = Math.pow(10, Math.floor(Math.log10(tickStep)));
    const residual = tickStep / mag;
    let niceTickStep = mag;
    if (residual > 5) niceTickStep = 10 * mag;
    else if (residual > 2) niceTickStep = 5 * mag;
    else if (residual > 1) niceTickStep = 2 * mag;
    
    const niceMax = Math.ceil(max / niceTickStep) * niceTickStep;
    return { niceMax, niceTickStep };
};

export const BarChart: React.FC<BarChartProps> = ({ labels, datasets, onHover }) => {
  const chartRef = useRef<HTMLDivElement>(null);
  const [activeIndex, setActiveIndex] = useState<number | null>(null);

  if (!datasets || datasets.length === 0 || labels.length === 0) {
    return (
        <div className="flex flex-col items-center justify-center h-full text-slate-500 gap-4 py-12">
            <div className="w-16 h-16 rounded-full bg-slate-800/50 flex items-center justify-center border border-slate-700/30">
                <svg className="w-8 h-8 text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"/></svg>
            </div>
            <span className="font-medium">Nenhum dado disponível para o gráfico</span>
        </div>
    );
  }
  
  const ticks = 4;
  const rawMax = Math.max(...datasets.flatMap(ds => ds.data.map(v => Math.max(0, v))), 10);
  const { niceMax, niceTickStep } = getNiceScale(rawMax, ticks);
  
  const handleMouseMove = (event: React.MouseEvent<HTMLDivElement>) => {
    if (!chartRef.current || !onHover) return;
    const rect = chartRef.current.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const width = rect.width;
    const index = Math.floor((x / width) * labels.length);

    if (index >= 0 && index < labels.length) {
        if (index !== activeIndex) setActiveIndex(index);

        const tooltipData: TooltipData = {
            index,
            datasets: datasets.map(ds => ({
                label: ds.label,
                value: ds.data[index],
                color: ds.color,
            }))
        };
        
        const pointX = (index + 0.5) * (width / labels.length);
        onHover({ visible: true, data: tooltipData, x: rect.left + pointX, y: rect.top + (rect.height / 3) });
    }
  };

  const handleMouseLeave = () => {
    setActiveIndex(null);
    if (onHover) onHover(null);
  };

  return (
    <div className="w-full h-full flex flex-col font-sans select-none pt-4">
        <div className="flex-1 flex min-h-0 relative">
            {/* Y-Axis Labels */}
            <div className="w-16 h-full flex flex-col justify-between pr-3 text-[10px] text-slate-500 font-bold text-right border-r border-slate-800/50 pb-6">
                {Array.from({ length: ticks + 1 }).map((_, i) => {
                    const val = Math.max(0, niceMax - niceTickStep * i);
                    return <div key={i} className="h-0 flex items-center justify-end">{formatValue(val)}</div>
                })}
            </div>

            {/* Chart Container */}
            <div className="flex-1 relative flex flex-col h-full">
                <div 
                    ref={chartRef}
                    className="flex-1 relative ml-2 group/chart"
                    onMouseMove={handleMouseMove}
                    onMouseLeave={handleMouseLeave}
                >
                    {/* Grid Lines */}
                    <div className="absolute inset-0 flex flex-col justify-between pointer-events-none pb-6">
                        {Array.from({ length: ticks + 1 }).map((_, i) => (
                            <div 
                                key={i} 
                                className={`w-full border-t border-dashed border-slate-700/40 ${i === ticks ? 'border-solid border-slate-700' : ''}`}
                            ></div>
                        ))}
                    </div>

                    {/* Bars Container */}
                    <div className="absolute inset-0 flex items-stretch justify-around px-4 pb-6">
                        {labels.map((_, labelIndex) => (
                            <div 
                                key={labelIndex} 
                                className="flex-1 flex items-end justify-center gap-3 max-w-[140px] relative transition-all duration-300"
                            >
                                {/* Vertical Hover Highlight Line */}
                                {activeIndex === labelIndex && (
                                    <div className="absolute inset-y-0 w-full bg-blue-500/10 rounded-2xl pointer-events-none -z-0"></div>
                                )}

                                {datasets.map((dataset, dsIndex) => {
                                    const val = Math.max(0, dataset.data[labelIndex] || 0);
                                    const heightPercent = (val / niceMax) * 100;
                                    
                                    return (
                                        <div 
                                            key={dsIndex}
                                            className="flex-1 min-w-[20px] max-w-[45px] relative transition-all duration-700 ease-out"
                                            style={{ height: `${heightPercent}%` }}
                                        >
                                            {/* Bar Body with Gradient */}
                                            <div 
                                                className="w-full h-full rounded-t-xl relative transition-all duration-300"
                                                style={{ 
                                                    background: `linear-gradient(to top, ${dataset.color}ee, ${dataset.color}77)`,
                                                    opacity: activeIndex !== null && activeIndex !== labelIndex ? 0.3 : 1,
                                                    boxShadow: `0 10px 15px -3px ${dataset.color}40, 0 4px 6px -2px ${dataset.color}20`,
                                                } as any}
                                            >
                                                {/* Top Highlight Edge */}
                                                <div className="absolute inset-x-0 top-0 h-[2px] bg-white/30 rounded-t-xl"></div>
                                                
                                                {/* Inner Glass Flare */}
                                                <div className="absolute inset-0 bg-gradient-to-r from-white/10 to-transparent rounded-t-xl"></div>
                                                
                                                {/* Individual Value Tag on Top */}
                                                {(activeIndex === labelIndex || labels.length < 8) && heightPercent > 5 && (
                                                    <div className={`absolute -top-7 left-1/2 -translate-x-1/2 text-[11px] font-black whitespace-nowrap transition-all duration-300 ${activeIndex === labelIndex ? 'text-white translate-y-0 opacity-100' : 'text-slate-500 opacity-0 translate-y-1'}`}>
                                                        {formatValue(val)}
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        ))}
                    </div>
                </div>

                {/* X-Axis Labels Section */}
                <div className="h-6 flex pl-2 relative w-full border-t border-slate-800/50">
                    <div className="absolute inset-0 flex justify-around px-4 pointer-events-none">
                        {labels.map((label, index) => (
                            <div 
                                key={index} 
                                className="flex-1 max-w-[120px] h-full flex flex-col items-center"
                            >
                                {/* Tick Marker */}
                                <div className="w-[1px] h-1.5 bg-slate-700"></div>
                                {/* Label Text */}
                                <div 
                                    className={`mt-1.5 text-[10px] font-black tracking-tight transition-all duration-300 ${activeIndex === index ? 'text-blue-400 scale-110' : 'text-slate-500'}`}
                                >
                                    {label}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    </div>
  );
};
