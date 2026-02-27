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

const formatCurrency = (value: number) => {
    if (Math.abs(value) >= 1000) {
        return (value / 1000).toFixed(1).replace('.', ',') + 'k';
    }
    return value.toLocaleString('pt-BR');
};

export const BarChart: React.FC<BarChartProps> = ({ labels, datasets, onHover }) => {
  const chartRef = useRef<HTMLDivElement>(null);
  const [activeIndex, setActiveIndex] = useState<number | null>(null);

  if (!datasets || datasets.length === 0 || labels.length === 0) {
    return <div className="flex items-center justify-center h-full text-slate-400">Sem dados para exibir</div>;
  }
  
  const allValues = datasets.flatMap(ds => ds.data);
  const minValue = Math.min(...allValues, 0);
  const maxValue = Math.max(...allValues, 0);
  const paddedMin = minValue < 0 ? minValue * 1.1 : 0;
  const paddedMax = maxValue > 0 ? maxValue * 1.1 : 50;
  const range = paddedMax - paddedMin || 1;

  const yAxisLabelsCount = 5;

  const handleMouseMove = (event: React.MouseEvent<HTMLDivElement>) => {
    if (!chartRef.current || !onHover) return;
    const rect = chartRef.current.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const width = rect.width;
    const index = Math.floor((x / width) * labels.length);

    if (index >= 0 && index < labels.length && index !== activeIndex) {
        setActiveIndex(index);

        const tooltipData: TooltipData = {
            index,
            datasets: datasets.map(ds => ({
                label: ds.label,
                value: ds.data[index],
                color: ds.color,
            }))
        };
        
        const pointX = (index + 0.5) * (width / labels.length);
        
        onHover({ 
            visible: true, 
            data: tooltipData, 
            x: rect.left + pointX, 
            y: rect.top + (rect.height / 2) // Middle of the chart
        });
    }
  };

  const handleMouseLeave = () => {
    setActiveIndex(null);
    if (onHover) onHover(null);
  };

  return (
    <div className="w-full h-full flex" style={{ fontFamily: 'sans-serif', fontSize: '11px' }}>
        <div className="h-full flex flex-col justify-between pr-2 text-slate-400 text-right">
            {Array.from({ length: yAxisLabelsCount + 1 }).map((_, i) => {
                const value = paddedMax - (range / yAxisLabelsCount) * i;
                return <div key={i}>{formatCurrency(value)}</div>
            })}
        </div>
        <div 
            ref={chartRef}
            className="w-full h-full flex flex-col relative"
            onMouseMove={handleMouseMove}
            onMouseLeave={handleMouseLeave}
        >
            <div className="w-full h-full flex items-end justify-around border-l border-b border-slate-700/50">
                {/* Y-Axis grid lines */}
                {Array.from({ length: yAxisLabelsCount + 1 }).map((_, i) => (
                    <div 
                        key={i} 
                        className="absolute w-full border-t border-slate-700/10" 
                        style={{ top: `${(i / yAxisLabelsCount) * 100}%` }}
                    ></div>
                ))}

                {/* Zero line */}
                {paddedMin < 0 && (
                    <div 
                        className="absolute w-full border-t border-slate-500/30 border-dashed" 
                        style={{ top: `${(paddedMax / range) * 100}%` }}
                    ></div>
                )}

                {labels.map((_, labelIndex) => (
                    <div key={labelIndex} className="flex-1 flex items-end justify-center gap-[4px] h-full px-2 relative group" style={{ printColorAdjust: 'exact', WebkitPrintColorAdjust: 'exact' } as any}>
                        {activeIndex === labelIndex && (
                            <div className="absolute inset-x-0 top-0 bottom-0 bg-white/5 rounded-t-lg -z-10 transition-colors"></div>
                        )}
                        {datasets.map((dataset, dsIndex) => {
                            const val = dataset.data[labelIndex];
                            const heightPercent = (Math.abs(val) / range) * 100;
                            const isPositive = val >= 0;
                            
                            return (
                                <div 
                                    key={dsIndex}
                                    className="flex-1 transition-all duration-500 rounded-t-[4px] shadow-sm hover:brightness-110"
                                    style={{ 
                                        height: `${heightPercent}%`,
                                        backgroundColor: dataset.color,
                                        opacity: 1, // Change from 0.9 to 1 for print clarity
                                        position: 'relative',
                                        marginBottom: isPositive ? `${(Math.max(0, -paddedMin) / range) * 100}%` : 0,
                                        marginTop: !isPositive ? `${(paddedMax / range) * 100}%` : 0,
                                        alignSelf: isPositive ? 'flex-end' : 'flex-start',
                                        minWidth: '6px',
                                        printColorAdjust: 'exact',
                                        WebkitPrintColorAdjust: 'exact'
                                    } as any}
                                >
                                    <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent rounded-t-[4px] print:hidden"></div>
                                </div>
                            );
                        })}
                    </div>
                ))}
            </div>
            <div className="w-full flex justify-around pt-2">
                {labels.map((label, index) => (
                    <div key={index} className="flex-1 text-slate-400 text-center text-[10px] truncate px-1" title={label}>
                        {label}
                    </div>
                ))}
            </div>
        </div>
    </div>
  );
};