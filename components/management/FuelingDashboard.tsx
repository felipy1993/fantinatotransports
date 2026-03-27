import React, { useState, useMemo } from 'react';
import { useTrips } from '../../context/TripContext';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/Card';
import { BarChart } from '../charts/BarChart';
import { ICONS } from '../../constants';
import { Select } from '../ui/Select';

import { View } from '../../App';

const formatCurrency = (value: number) => {
    if (typeof value !== 'number') return 'R$ 0,00';
    return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
};

export const FuelingDashboard: React.FC<{ setView: (view: View) => void }> = ({ setView }) => {
    const { fuelingRecords = [], vehicles = [] } = useTrips();
    
    // Filter States
    const [selectedYear, setSelectedYear] = useState<string>(new Date().getFullYear().toString());
    const [selectedVehicleId, setSelectedVehicleId] = useState<string>('');

    const availableYears = useMemo(() => {
        const years = (fuelingRecords || []).map(f => f.date.split('-')[0]);
        return [...new Set([new Date().getFullYear().toString(), ...years])].sort((a, b) => b.localeCompare(a));
    }, [fuelingRecords]);

    const stats = useMemo(() => {
        const filtered = (fuelingRecords || []).filter(f => {
            const yearMatch = f.date.startsWith(selectedYear);
            const vehicleMatch = !selectedVehicleId || f.vehicleId === selectedVehicleId;
            return yearMatch && vehicleMatch;
        });

        const totalCost = filtered.reduce((sum, f) => sum + (f.totalAmount || 0), 0);
        const totalLiters = filtered.reduce((sum, f) => sum + (f.liters || 0), 0);
        
        // Group by month
        const monthlyData = Array(12).fill(0).map((_, i) => ({
            month: i + 1,
            cost: 0,
            liters: 0
        }));

        filtered.forEach(f => {
            const monthStr = f.date.split('-')[1];
            if (!monthStr) return;
            const month = parseInt(monthStr);
            if (month >= 1 && month <= 12) {
                monthlyData[month - 1].cost += (f.totalAmount || 0);
                monthlyData[month - 1].liters += (f.liters || 0);
            }
        });

        const monthLabels = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
        const costData = monthlyData.map(d => d.cost);
        const litersData = monthlyData.map(d => d.liters);

        return {
            totalCost,
            totalLiters,
            avgPrice: totalLiters > 0 ? totalCost / totalLiters : 0,
            chartData: {
                labels: monthLabels,
                costs: costData,
                liters: litersData
            }
        };
    }, [fuelingRecords, selectedYear, selectedVehicleId]);

    const [tooltipData, setTooltipData] = useState<any>(null);

    return (
        <div className="space-y-6">
            <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h2 className="text-2xl font-black text-white flex items-center gap-3">
                        <div className="p-2 bg-emerald-500/20 rounded-lg">
                            <ICONS.chartBar className="w-6 h-6 text-emerald-400" />
                        </div>
                        Relatório de Combustível
                    </h2>
                    <p className="text-slate-400 text-sm">Dashboard de consumo e custos de abastecimento</p>
                </div>
                
                <div className="flex flex-wrap gap-2">
                    <div className="w-32">
                        <Select id="yearFilter" label="" value={selectedYear} onChange={e => setSelectedYear(e.target.value)}>
                            {availableYears.map(y => <option key={y} value={y}>{y}</option>)}
                        </Select>
                    </div>
                    <div className="w-48">
                        <Select id="vehicleFilter" label="" value={selectedVehicleId} onChange={e => setSelectedVehicleId(e.target.value)}>
                            <option value="">Todos os Veículos</option>
                            {(vehicles || []).map(v => <option key={v.id} value={v.id}>{v.plate} - {v.model}</option>)}
                        </Select>
                    </div>
                    <button 
                        onClick={() => setView({ type: 'fuelingManagement' })}
                        className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold uppercase rounded-lg transition-all"
                    >
                        <ICONS.gasPump className="w-4 h-4" />
                        Gerenciar Lançamentos
                    </button>
                </div>
            </header>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <Card className="bg-[#0f172a] border-none shadow-xl">
                    <CardContent className="pt-6">
                        <p className="text-slate-400 text-xs font-bold uppercase tracking-wider mb-1">Gasto no Ano</p>
                        <p className="text-3xl font-black text-white">{formatCurrency(stats.totalCost)}</p>
                    </CardContent>
                </Card>
                <Card className="bg-[#0f172a] border-none shadow-xl">
                    <CardContent className="pt-6">
                        <p className="text-slate-400 text-xs font-bold uppercase tracking-wider mb-1">Total Litros</p>
                        <p className="text-3xl font-black text-emerald-400">{(stats.totalLiters || 0).toLocaleString('pt-BR')} L</p>
                    </CardContent>
                </Card>
                <Card className="bg-[#0f172a] border-none shadow-xl">
                    <CardContent className="pt-6">
                        <p className="text-slate-400 text-xs font-bold uppercase tracking-wider mb-1">Média Preço / L</p>
                        <p className="text-3xl font-black text-blue-400">{formatCurrency(stats.avgPrice)}</p>
                    </CardContent>
                </Card>
            </div>

            <Card className="bg-[#0f172a] border-none shadow-2xl">
                <CardHeader>
                    <div className="flex justify-between items-center">
                        <CardTitle className="text-lg font-bold text-white uppercase tracking-tight">Evolução Mensal de Gastos</CardTitle>
                        <div className="flex gap-4">
                            <div className="flex items-center gap-2">
                                <div className="w-3 h-3 rounded-full bg-blue-500"></div>
                                <span className="text-[10px] text-slate-400 uppercase font-black">Gastos (R$)</span>
                            </div>
                        </div>
                    </div>
                </CardHeader>
                <CardContent className="h-[400px] relative">
                    {tooltipData && tooltipData.visible && tooltipData.index !== undefined && stats.chartData.costs[tooltipData.index] !== undefined && (
                        <div 
                            className="absolute z-50 p-3 bg-slate-900 border border-white/10 rounded-lg shadow-2xl pointer-events-none min-w-[120px]"
                            style={{ 
                                left: `clamp(70px, ${tooltipData.x}px, calc(100% - 70px))`, 
                                top: tooltipData.y, 
                                transform: 'translate(-50%, -110%)' 
                            }}
                        >
                            <p className="text-xs font-bold text-slate-400 uppercase mb-2">{stats.chartData.labels[tooltipData.index]}</p>
                            <p className="text-lg font-black text-white">{formatCurrency(stats.chartData.costs[tooltipData.index])}</p>
                            <p className="text-xs text-emerald-400">{(stats.chartData.liters[tooltipData.index] || 0).toLocaleString('pt-BR')} Litros</p>
                        </div>
                    )}
                    <BarChart 
                        labels={stats.chartData.labels}
                        datasets={[
                            { label: 'Gastos', data: stats.chartData.costs, color: '#3b82f6' }
                        ]}
                        onHover={setTooltipData}
                    />
                </CardContent>
            </Card>

            <Card className="bg-[#0f172a] border-none shadow-2xl">
                <CardHeader>
                    <CardTitle className="text-lg font-bold text-white uppercase tracking-tight">Consumo em Litros por Mês</CardTitle>
                </CardHeader>
                <CardContent className="h-[300px]">
                    <BarChart 
                        labels={stats.chartData.labels}
                        datasets={[
                            { label: 'Litros', data: stats.chartData.liters, color: '#10b981' }
                        ]}
                    />
                </CardContent>
            </Card>
        </div>
    );
};
