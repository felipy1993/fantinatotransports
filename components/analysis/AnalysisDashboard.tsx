import React, { useState, useMemo } from 'react';
import { useTrips } from '../../context/TripContext';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/Card';
import { BarChart } from '../charts/BarChart';
import { FixedExpense, WorkshopExpense } from '../../types';
import { Tooltip } from '../ui/Tooltip';
import { Button } from '../ui/Button';
import { ICONS } from '../../constants';
import { calculateTrechoMetrics } from '../../utils/tripMetrics';
import { exportToXLSX } from '../../utils/exportUtils';

const formatCurrency = (value: number) => {
    return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
};

const KPICard: React.FC<{ title: string; value: number; colorClass?: string; tooltipText: string }> = ({ title, value, colorClass = 'text-white', tooltipText }) => (
    <div className="bg-slate-800 p-4 rounded-lg shadow-lg border border-slate-700/50 print:bg-white print:border-slate-300 print:shadow-none">
        <div className="flex items-center gap-1.5 mb-1">
            <p className="text-sm text-slate-400 print:text-slate-600">{title}</p>
            <Tooltip text={tooltipText}>
                <ICONS.info className="w-4 h-4 text-slate-500 hover:text-slate-300 transition-colors no-print" />
            </Tooltip>
        </div>
        <p className={`text-2xl font-bold ${colorClass} print:text-slate-900`}>{formatCurrency(value)}</p>
    </div>
);


export const AnalysisDashboard: React.FC = () => {
    const { trips, fixedExpenses, workshopExpenses, financialEntries, getVehicle, vehicles } = useTrips();
    
    const today = new Date();
    const formatToMonthString = (date: Date) => `${date.getFullYear()}-${(date.getMonth() + 1).toString().padStart(2, '0')}`;

    const [viewMode, setViewMode] = useState<'fleet' | 'financial'>('fleet');
    const [selectedVehicleId, setSelectedVehicleId] = useState<string>(''); 
    const [startDate, setStartDate] = useState<string>(formatToMonthString(today));
    const [endDate, setEndDate] = useState<string>(formatToMonthString(today));

    const [lineTooltip, setLineTooltip] = useState<{ visible: boolean; data: any; x: number; y: number } | null>(null);

    const handlePrint = () => {
        window.print();
    };

    const filteredData = useMemo(() => {
        const [startYear, startMonth] = startDate.split('-').map(Number);
        const [endYear, endMonth] = endDate.split('-').map(Number);
        
        const start = new Date(Date.UTC(startYear, startMonth - 1, 1));
        const end = new Date(Date.UTC(endYear, endMonth, 0, 23, 59, 59, 999));
        
        const filteredTrips = trips.filter(trip => {
            const tripDate = new Date(`${trip.startDate}T00:00:00Z`);
            const vehicleMatch = !selectedVehicleId || String(trip.vehicleId) === String(selectedVehicleId);
            const dateMatch = tripDate >= start && tripDate <= end;
            return vehicleMatch && dateMatch;
        });

        const getExpensesInRange = (expenses: (FixedExpense | WorkshopExpense)[]) => {
            const relevantExpenses: { date: Date, amount: number, vehicleId: string }[] = [];
            const source = selectedVehicleId ? expenses.filter(e => String(e.vehicleId) === String(selectedVehicleId)) : expenses;

            source.forEach(expense => {
                const installmentAmount = expense.totalAmount / expense.installments;
                const firstPaymentDate = new Date(`${expense.firstPaymentDate}T00:00:00Z`);

                for (let i = 0; i < expense.installments; i++) {
                    const paymentDate = new Date(firstPaymentDate);
                    paymentDate.setUTCMonth(paymentDate.getUTCMonth() + i);

                    if (paymentDate >= start && paymentDate <= end) {
                        relevantExpenses.push({
                            date: paymentDate,
                            amount: installmentAmount,
                            vehicleId: expense.vehicleId,
                        });
                    }
                }
            });
            return relevantExpenses;
        };
        
        const filteredFixedExpenses = getExpensesInRange(fixedExpenses);
        const filteredWorkshopExpenses = getExpensesInRange(workshopExpenses);
        
        const filteredFinancialEntries = financialEntries.filter(entry => {
            const dueDate = new Date(`${entry.dueDate}T00:00:00Z`);
            return dueDate >= start && dueDate <= end;
        });

        return { filteredTrips, filteredFixedExpenses, filteredWorkshopExpenses, filteredFinancialEntries };
    }, [startDate, endDate, selectedVehicleId, trips, fixedExpenses, workshopExpenses, financialEntries]);

    // Specialized KPI Logic
    const stats = useMemo(() => {
        const totalRevenue = filteredData.filteredTrips.reduce((sum, trip) => {
            return sum + (trip.cargo || []).reduce((cargoSum, c) => cargoSum + (c.weight * c.pricePerTon), 0);
        }, 0);

        const tripCosts = filteredData.filteredTrips.reduce((sum, trip) => {
            const tripNetRevenue = (trip.cargo || []).reduce((cargoSum, c) => cargoSum + (c.weight * c.pricePerTon) - (c.tax || 0), 0);
            const tripFueling = (trip.fueling || []).reduce((fuelSum, f) => fuelSum + f.totalAmount, 0);
            const tripOtherExpenses = (trip.expenses || []).reduce((expSum, e) => expSum + e.amount, 0);
            const driverCommission = (tripNetRevenue * (trip.driverCommissionRate || 0)) / 100;
            return sum + tripFueling + tripOtherExpenses + driverCommission;
        }, 0);

        const maintenanceCosts = filteredData.filteredWorkshopExpenses.reduce((sum, exp) => sum + exp.amount, 0);
        const fixedCosts = filteredData.filteredFixedExpenses.reduce((sum, exp) => sum + exp.amount, 0);
        const financialCosts = (filteredData.filteredFinancialEntries || []).reduce((sum, exp) => sum + exp.amount, 0);

        return {
            revenue: totalRevenue,
            tripCosts,
            maintenance: maintenanceCosts,
            fixed: fixedCosts,
            financial: financialCosts,
            operationalResult: totalRevenue - tripCosts - maintenanceCosts,
            netProfit: totalRevenue - tripCosts - maintenanceCosts - fixedCosts - financialCosts
        };
    }, [filteredData]);

    const monthlyAnalysisData = useMemo(() => {
        const [startYear, startMonth] = startDate.split('-').map(Number);
        const [endYear, endMonth] = endDate.split('-').map(Number);

        const monthlyDataMap = new Map<string, { revenue: number; fleetExpenses: number; globalExpenses: number }>();
        
        const finalMonth = new Date(Date.UTC(endYear, endMonth - 1, 1));
        let currentMonth = new Date(Date.UTC(startYear, startMonth - 1, 1));
        
        while (currentMonth <= finalMonth) {
            const key = `${currentMonth.getUTCFullYear()}-${(currentMonth.getUTCMonth() + 1).toString().padStart(2, '0')}`;
            monthlyDataMap.set(key, { revenue: 0, fleetExpenses: 0, globalExpenses: 0 });
            currentMonth.setUTCMonth(currentMonth.getUTCMonth() + 1);
        }

        filteredData.filteredTrips.forEach(trip => {
            const tripDate = new Date(`${trip.startDate}T00:00:00Z`);
            const key = `${tripDate.getUTCFullYear()}-${(tripDate.getUTCMonth() + 1).toString().padStart(2, '0')}`;
            const monthData = monthlyDataMap.get(key);

            if (monthData) {
                const tripGross = (trip.cargo || []).reduce((sum, c) => sum + (c.weight * c.pricePerTon), 0);
                const tripNet = (trip.cargo || []).reduce((sum, c) => sum + (c.weight * c.pricePerTon) - (c.tax || 0), 0);
                const tripOpExpenses = (trip.fueling || []).reduce((sum, f) => sum + f.totalAmount, 0) + 
                                     (trip.expenses || []).reduce((sum, e) => sum + e.amount, 0) + 
                                     ((tripNet * (trip.driverCommissionRate || 0)) / 100);

                monthData.revenue += tripGross;
                monthData.fleetExpenses += tripOpExpenses;
            }
        });

        filteredData.filteredWorkshopExpenses.forEach(exp => {
            const key = `${exp.date.getUTCFullYear()}-${(exp.date.getUTCMonth() + 1).toString().padStart(2, '0')}`;
            const monthData = monthlyDataMap.get(key);
            if (monthData) monthData.fleetExpenses += exp.amount;
        });

        filteredData.filteredFixedExpenses.forEach(exp => {
            const key = `${exp.date.getUTCFullYear()}-${(exp.date.getUTCMonth() + 1).toString().padStart(2, '0')}`;
            const monthData = monthlyDataMap.get(key);
            if (monthData) monthData.globalExpenses += exp.amount;
        });

        filteredData.filteredFinancialEntries.forEach(entry => {
            const entryDate = new Date(`${entry.dueDate}T00:00:00Z`);
            const key = `${entryDate.getUTCFullYear()}-${(entryDate.getUTCMonth() + 1).toString().padStart(2, '0')}`;
            const monthData = monthlyDataMap.get(key);
            if (monthData) monthData.globalExpenses += entry.amount;
        });

        const sortedKeys = Array.from(monthlyDataMap.keys()).sort();
        const labels: string[] = [];
        const revenue: number[] = [];
        const fleetExpenses: number[] = [];
        const totalExpenses: number[] = [];
        const result: number[] = [];

        sortedKeys.forEach(key => {
            const data = monthlyDataMap.get(key)!;
            const [year, month] = key.split('-');
            labels.push(`${month}/${year.slice(2)}`);
            revenue.push(data.revenue);
            fleetExpenses.push(data.fleetExpenses);
            totalExpenses.push(data.fleetExpenses + data.globalExpenses);
            result.push(data.revenue - (data.fleetExpenses + data.globalExpenses));
        });

        return { labels, revenue, fleetExpenses, totalExpenses, result };
    }, [filteredData, startDate, endDate]);

    const handleExportExcel = () => {
        const dataToExport = monthlyAnalysisData.labels.map((label, index) => ({
            'Mês': label,
            'Receitas': monthlyAnalysisData.revenue[index],
            'Despesas Operacionais': monthlyAnalysisData.fleetExpenses[index],
            'Despesas Totais': monthlyAnalysisData.totalExpenses[index],
            'Resultado Saldo': monthlyAnalysisData.result[index]
        }));
        exportToXLSX(dataToExport, `Analise_${startDate}_a_${endDate}`, 'Analise_Mensal');
    };

    const hasData = monthlyAnalysisData.labels.length > 0;

    return (
        <div className="space-y-6 relative">
            <style dangerouslySetInnerHTML={{ __html: `
                @media print {
                    @page { size: landscape; margin: 1cm; }
                    .no-print { display: none !important; }
                    body { background: white !important; color: black !important; }
                }
            `}} />
            
             {lineTooltip?.visible && (
                <div 
                    className="absolute z-50 p-4 bg-slate-950/90 backdrop-blur-xl border border-white/10 rounded-2xl shadow-[0_20px_50px_rgba(0,0,0,0.5)] text-sm pointer-events-none min-w-[180px] ring-1 ring-white/5"
                    style={{ left: lineTooltip.x, top: lineTooltip.y, transform: 'translate(-50%, -115%)' }}
                >
                    <p className="font-black text-[11px] mb-3 text-slate-500 uppercase tracking-[0.2em]">
                        {monthlyAnalysisData.labels[lineTooltip.data.index]}
                    </p>
                    <div className="space-y-3">
                        <div className="flex justify-between items-center gap-6">
                            <div className="flex items-center gap-2">
                                <div className="w-1.5 h-1.5 rounded-sm bg-[#10b981]"></div>
                                <span className="text-slate-400 font-bold text-[10px] uppercase">Receita</span>
                            </div>
                            <span className="font-black text-white text-sm">{formatCurrency(monthlyAnalysisData.revenue[lineTooltip.data.index])}</span>
                        </div>
                        <div className="flex justify-between items-center gap-6">
                            <div className="flex items-center gap-2">
                                <div className="w-1.5 h-1.5 rounded-sm bg-[#f43f5e]"></div>
                                <span className="text-slate-400 font-bold text-[10px] uppercase">Despesas</span>
                            </div>
                            <span className="font-black text-white text-sm">
                                {formatCurrency(viewMode === 'fleet' ? monthlyAnalysisData.fleetExpenses[lineTooltip.data.index] : monthlyAnalysisData.totalExpenses[lineTooltip.data.index])}
                            </span>
                        </div>
                        <div className="mt-4 pt-3 border-t border-white/5 flex justify-between items-center gap-6">
                            <span className="text-slate-500 font-black uppercase text-[10px] tracking-wider">Saldo</span>
                            <span className={`font-black text-sm ${monthlyAnalysisData.result[lineTooltip.data.index] >= 0 ? 'text-emerald-400' : 'text-rose-500'}`}>
                                {formatCurrency(monthlyAnalysisData.result[lineTooltip.data.index])}
                            </span>
                        </div>
                    </div>
                </div>
            )}

            <Card className="border-none shadow-2xl shadow-blue-500/5 bg-slate-900/40 backdrop-blur-xl">
                <CardHeader className="border-b border-slate-800/50 pb-8 px-4 sm:px-8">
                    <div className="flex flex-col lg:flex-row justify-between lg:items-center gap-6">
                        <div className="space-y-1">
                            <CardTitle className="text-xl sm:text-2xl font-black bg-gradient-to-r from-white to-slate-500 bg-clip-text text-transparent">Centro de Inteligência</CardTitle>
                            <p className="text-slate-500 text-xs sm:text-sm font-medium">Monitore o desempenho operacional e financeiro em tempo real</p>
                        </div>
                        
                        <div className="flex flex-wrap items-center gap-3 no-print">
                            {/* Premium Tab Switcher */}
                            <div className="bg-slate-800 p-1 rounded-xl flex border border-slate-700/50 w-full sm:w-auto">
                                <button 
                                    onClick={() => setViewMode('fleet')}
                                    className={`flex-1 sm:flex-none px-4 sm:px-6 py-2 rounded-lg text-xs font-bold transition-all duration-300 ${viewMode === 'fleet' ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/20' : 'text-slate-400 hover:text-white'}`}
                                >
                                    FROTA
                                </button>
                                <button 
                                    onClick={() => setViewMode('financial')}
                                    className={`flex-1 sm:flex-none px-4 sm:px-6 py-2 rounded-lg text-xs font-bold transition-all duration-300 ${viewMode === 'financial' ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/20' : 'text-slate-400 hover:text-white'}`}
                                >
                                    FINANCEIRO
                                </button>
                            </div>

                             <select
                                id="vehicle-selector"
                                value={selectedVehicleId}
                                onChange={e => setSelectedVehicleId(e.target.value)}
                                className="bg-slate-800 border-slate-700/50 rounded-xl py-2 px-4 text-white text-sm font-semibold focus:ring-2 ring-blue-500 w-full sm:w-auto"
                            >
                                <option value="">Toda a Frota</option>
                                {vehicles.map(v => <option key={v.id} value={v.id}>{v.plate} ({v.model})</option>)}
                            </select>
                            
                            <div className="flex bg-slate-800 rounded-xl border border-slate-700/50 w-full sm:w-auto">
                                <input type="month" value={startDate} onChange={e => setStartDate(e.target.value)} className="bg-transparent border-none py-2 ps-4 pe-2 text-white text-sm font-semibold outline-none flex-1" />
                                <div className="py-2 text-slate-600">|</div>
                                <input type="month" value={endDate} onChange={e => setEndDate(e.target.value)} className="bg-transparent border-none py-2 ps-2 pe-4 text-white text-sm font-semibold outline-none flex-1" />
                            </div>

                            <Button onClick={handleExportExcel} variant="secondary" className="bg-slate-800 hover:bg-slate-700 border-none rounded-xl w-full sm:w-auto">
                                <ICONS.printer className="w-4 h-4 mr-2" />
                                Exportar Excel
                            </Button>
                            <Button onClick={handlePrint} variant="secondary" className="bg-slate-800 hover:bg-slate-700 border-none rounded-xl w-full sm:w-auto">
                                <ICONS.printer className="w-4 h-4 mr-2" />
                                Relatório PDF
                            </Button>
                        </div>
                    </div>
                </CardHeader>
                
                <CardContent className="pt-8 px-4 sm:px-8 pb-12">
                    {hasData ? (
                        <div className="space-y-12">
                            {/* Dynamic KPI Section */}
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                                {viewMode === 'fleet' ? (
                                    <>
                                        <KPICard title="Receita Operacional" value={stats.revenue} colorClass="text-blue-400" tooltipText="Total de fretes realizados pelos veículos selecionados." />
                                        <KPICard title="Custos de Viagem" value={stats.tripCosts} colorClass="text-rose-400" tooltipText="Diesel, Diárias, Pedágios e Comissões." />
                                        <KPICard title="Manutenção (Oficina)" value={stats.maintenance} colorClass="text-amber-400" tooltipText="Gastos com oficina e peças no período." />
                                        <KPICard title="Margem de Contribuição" value={stats.operationalResult} colorClass={stats.operationalResult >= 0 ? "text-emerald-400" : "text-rose-600"} tooltipText="Receita - (Custos de Viagem + Oficina). É o quanto a frota gera sobrando." />
                                    </>
                                ) : (
                                    <>
                                        <KPICard title="Faturamento Global" value={stats.revenue} colorClass="text-blue-400" tooltipText="Faturamento consolidado da empresa no período." />
                                        <KPICard title="Despesas Estruturais" value={stats.fixed} colorClass="text-orange-400" tooltipText="Seguros, Pneus e despesas vinculadas aos veículos mas fixas." />
                                        <KPICard title="Despesas Financeiras" value={stats.financial} colorClass="text-slate-400" tooltipText="Salários, Aluguel, Impostos e Geral." />
                                        <KPICard title="Resultado Líquido" value={stats.netProfit} colorClass={stats.netProfit >= 0 ? "text-emerald-400" : "text-rose-600"} tooltipText="Lucro final após TODAS as despesas operacionais e administrativas." />
                                    </>
                                )}
                            </div>
                            
                            {/* Main Performance Chart */}
                            <div className="bg-slate-900/40 p-4 sm:p-10 rounded-3xl border border-slate-800/80 shadow-inner flex flex-col min-h-[500px]">
                                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-6 mb-10">
                                    <div className="space-y-1">
                                        <h3 className="text-lg font-bold text-white tracking-tight uppercase">
                                            {viewMode === 'fleet' ? 'Desempenho da Operação' : 'Consolidado Financeiro'}
                                        </h3>
                                        <p className="text-xs text-slate-500 font-medium">Visualização mensal de {viewMode === 'fleet' ? 'Eficiência Operacional' : 'Sustentabilidade Financeira'}</p>
                                    </div>
                                    <div className="flex flex-wrap gap-4 items-center bg-slate-800/80 px-4 sm:px-5 py-3 rounded-2xl border border-slate-700/50 w-full sm:w-auto">
                                        <div className="flex items-center gap-2 px-3 py-1 bg-emerald-500/10 rounded-full border border-emerald-500/20">
                                            <div className="w-2 h-2 sm:w-2.5 sm:h-2.5 rounded-full bg-[#10b981]"></div>
                                            <span className="text-[9px] sm:text-[10px] font-black text-emerald-400 uppercase tracking-widest whitespace-nowrap">Receitas</span>
                                        </div>
                                        <div className="flex items-center gap-2 px-3 py-1 bg-rose-500/10 rounded-full border border-rose-500/20">
                                            <div className="w-2 h-2 sm:w-2.5 sm:h-2.5 rounded-full bg-[#f43f5e]"></div>
                                            <span className="text-[9px] sm:text-[10px] font-black text-rose-400 uppercase tracking-widest whitespace-nowrap">Despesas</span>
                                        </div>
                                    </div>
                                </div>
                                <div className="h-[450px] w-full relative">
                                    <BarChart 
                                        labels={monthlyAnalysisData.labels}
                                        datasets={[
                                            { label: 'Receitas', data: monthlyAnalysisData.revenue, color: '#10b981' },
                                            { label: 'Despesas', data: viewMode === 'fleet' ? monthlyAnalysisData.fleetExpenses : monthlyAnalysisData.totalExpenses, color: '#f43f5e' }
                                        ]}
                                        onHover={setLineTooltip}
                                    />
                                </div>
                            </div>
                            
                            {/* Operational Specifics */}
                            {viewMode === 'fleet' && filteredData.filteredTrips.some(t => t.trechos && t.trechos.length > 0) && (
                                <div className="pt-10 border-t border-slate-800/80">
                                    <div className="flex items-center gap-3 mb-8">
                                        <div className="bg-blue-500/20 p-2 rounded-lg">
                                            <ICONS.truck className="w-5 h-5 text-blue-500" />
                                        </div>
                                        <h3 className="text-xl font-bold text-white uppercase tracking-tight">Análise de Consumo & Eficiência</h3>
                                    </div>
                                    
                                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-6">
                                        {(() => {
                                            let totalKmC = 0, totalKmV = 0, totalL = 0, totalKm = 0;
                                            filteredData.filteredTrips.forEach(trip => {
                                                const tripL = (trip.fueling || []).reduce((sum, f) => sum + f.liters, 0);
                                                const tripKm = trip.endKm > trip.startKm ? trip.endKm - trip.startKm : 0;
                                                const metrics = calculateTrechoMetrics(trip.trechos || [], tripL, tripKm);
                                                totalKmC += metrics.kmCarregado; totalKmV += metrics.kmVazio;
                                                totalL += tripL; totalKm += tripKm;
                                            });

                                            const getMedia = (dist: number, litros: number) => litros > 0 ? (dist / litros).toFixed(2) : '0.00';
                                            // Realistic weighting
                                            const lC_est = (totalKmC / 2.8), lV_est = (totalKmV / 4.5);
                                            const k = totalL / ((lC_est + lV_est) || 1);

                                            return (
                                                <>
                                                    <div className="bg-slate-800/30 p-5 rounded-2xl border border-slate-700/30"><p className="text-[10px] font-black text-slate-500 uppercase mb-2">KM Carregado</p><p className="text-2xl font-black text-blue-400">{totalKmC.toLocaleString()}</p></div>
                                                    <div className="bg-slate-800/30 p-5 rounded-2xl border border-slate-700/30"><p className="text-[10px] font-black text-slate-500 uppercase mb-2">KM Vazio</p><p className="text-2xl font-black text-blue-400">{totalKmV.toLocaleString()}</p></div>
                                                    <div className="bg-blue-500/5 p-5 rounded-2xl border border-blue-500/20"><p className="text-[10px] font-black text-blue-400 uppercase mb-2">Total KM</p><p className="text-2xl font-black text-blue-400">{totalKm.toLocaleString()}</p></div>
                                                    <div className="bg-slate-800/30 p-5 rounded-2xl border border-slate-700/30">
                                                        <p className="text-[10px] font-black text-slate-500 uppercase mb-2">Média Carregado</p>
                                                        <p className="text-2xl font-black text-amber-400">{getMedia(totalKmC, lC_est * k)}</p>
                                                        <p className="text-[9px] text-slate-600 mt-1 font-bold">KM/L</p>
                                                    </div>
                                                    <div className="bg-slate-800/30 p-5 rounded-2xl border border-slate-700/30">
                                                        <p className="text-[10px] font-black text-slate-500 uppercase mb-2">Média Vazio</p>
                                                        <p className="text-2xl font-black text-amber-400">{getMedia(totalKmV, lV_est * k)}</p>
                                                        <p className="text-[9px] text-slate-600 mt-1 font-bold">KM/L</p>
                                                    </div>
                                                    <div className="bg-amber-500/5 p-5 rounded-2xl border border-amber-500/20">
                                                        <p className="text-[10px] font-black text-amber-500 uppercase mb-2">Média Real</p>
                                                        <p className="text-2xl font-black text-amber-400">{getMedia(totalKm, totalL)}</p>
                                                        <p className="text-[9px] text-slate-600 mt-1 font-bold">KM/L</p>
                                                    </div>
                                                </>
                                            );
                                        })()}
                                    </div>
                                </div>
                            )}
                        </div>
                    ) : (
                        <div className="py-20 flex flex-col items-center justify-center space-y-4">
                            <div className="bg-slate-800 p-4 rounded-full"><ICONS.chartBar className="w-8 h-8 text-slate-600" /></div>
                            <p className="text-slate-500 font-bold uppercase tracking-widest text-xs">Dados insuficientes para análise no período</p>
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
};
