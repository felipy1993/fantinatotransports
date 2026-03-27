import React, { useState, useMemo } from 'react';
import { useTrips } from '../../context/TripContext';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/Card';
import { LineChart } from '../charts/LineChart';
import { FixedExpense, WorkshopExpense } from '../../types';
import { Tooltip } from '../ui/Tooltip';
import { Button } from '../ui/Button';
import { ICONS } from '../../constants';
import { calculateTrechoMetrics } from '../../utils/tripMetrics';
import { exportToXLSX } from '../../utils/exportUtils';

const formatCurrency = (value: number) => {
    return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
};

const calculateDays = (start: string, end: string) => {
    if (!start || !end) return 0;
    const s = new Date(start + 'T00:00:00');
    const e = new Date(end + 'T00:00:00');
    if (isNaN(s.getTime()) || isNaN(e.getTime())) return 0;
    const diffTime = e.getTime() - s.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return Math.max(0, diffDays + 1);
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
    const { trips, fixedExpenses, workshopExpenses, financialEntries, fuelingRecords = [], getVehicle, vehicles } = useTrips();
    
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
        
        const filteredFinancialEntries = selectedVehicleId ? [] : (financialEntries || []).filter(entry => {
            const dueDate = new Date(`${entry.dueDate}T00:00:00Z`);
            return dueDate >= start && dueDate <= end;
        });

        const filteredFuelingRecords = fuelingRecords.filter(f => {
            const fDate = new Date(`${f.date}T00:00:00Z`);
            const vehicleMatch = !selectedVehicleId || String(f.vehicleId) === String(selectedVehicleId);
            return vehicleMatch && fDate >= start && fDate <= end;
        });

        return { filteredTrips, filteredFixedExpenses, filteredWorkshopExpenses, filteredFinancialEntries, filteredFuelingRecords };
    }, [startDate, endDate, selectedVehicleId, trips, fixedExpenses, workshopExpenses, financialEntries, fuelingRecords]);

    // Specialized KPI Logic
    const stats = useMemo(() => {
        let taxCosts = 0;
        let dailyRateCosts = 0;

        const totalRevenue = filteredData.filteredTrips.reduce((sum, trip) => {
            return sum + (trip.cargo || []).reduce((cargoSum, c) => cargoSum + (c.weight * c.pricePerTon), 0);
        }, 0);

        const tripCostsNoFuel = filteredData.filteredTrips.reduce((sum, trip) => {
            const tripNetRevenue = (trip.cargo || []).reduce((cargoSum, c) => {
                const cargoTax = (c.tax || 0);
                taxCosts += cargoTax;
                return cargoSum + (c.weight * c.pricePerTon) - cargoTax;
            }, 0);
            
            const tripOtherExpenses = (trip.expenses || []).reduce((expSum, e) => expSum + e.amount, 0);
            
            // Diárias calculadas conforme o TripDetails
            const travelDays = calculateDays(trip.startDate, trip.endDate);
            const tripDailyAmount = trip.totalDailyAmount || (travelDays * (trip.dailyRate || 0));
            dailyRateCosts += tripDailyAmount;

            const driverCommission = (tripNetRevenue * (trip.driverCommissionRate || 0)) / 100;
            return sum + tripOtherExpenses + driverCommission + tripDailyAmount;
        }, 0);

        const fuelCosts = filteredData.filteredFuelingRecords.reduce((sum, f) => sum + f.totalAmount, 0);
        const maintenanceCosts = filteredData.filteredWorkshopExpenses.reduce((sum, exp) => sum + exp.amount, 0);
        const fixedCosts = filteredData.filteredFixedExpenses.reduce((sum, exp) => sum + exp.amount, 0);
        const financialCosts = (filteredData.filteredFinancialEntries || []).reduce((sum, exp) => sum + exp.amount, 0);

        // Adicionando taxCosts ao totalAllExpenses pois o totalRevenue é BRUTO
        const totalAllExpenses = tripCostsNoFuel + fuelCosts + maintenanceCosts + fixedCosts + financialCosts + taxCosts;

        return {
            revenue: totalRevenue,
            fuel: fuelCosts,
            tripCosts: tripCostsNoFuel + fuelCosts,
            maintenance: maintenanceCosts,
            fixed: fixedCosts,
            financial: financialCosts,
            tax: taxCosts,
            dailyRate: dailyRateCosts,
            totalExpenses: totalAllExpenses,
            operationalResult: totalRevenue - (tripCostsNoFuel + fuelCosts) - maintenanceCosts - taxCosts,
            netProfit: totalRevenue - totalAllExpenses
        };
    }, [filteredData]);

    const fixedYearlyTrendData = useMemo(() => {
        const curYear = today.getFullYear();
        const start = new Date(Date.UTC(curYear, 0, 1));
        const end = new Date(Date.UTC(curYear, today.getMonth(), 31, 23, 59, 59, 999));

        const labels: string[] = [];
        const monthNames = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
        for (let i = 0; i <= today.getMonth(); i++) labels.push(monthNames[i]);

        const revenue = Array(labels.length).fill(0);
        const fleetExpenses = Array(labels.length).fill(0);
        const totalExpenses = Array(labels.length).fill(0);

        // Trips integration
        trips.filter(t => !selectedVehicleId || String(t.vehicleId) === String(selectedVehicleId)).forEach(trip => {
            const tripDate = new Date(`${trip.startDate}T00:00:00Z`);
            if (tripDate.getUTCFullYear() === curYear && tripDate.getUTCMonth() <= today.getMonth()) {
                const monthIdx = tripDate.getUTCMonth();
                const tripGross = (trip.cargo || []).reduce((sum, c) => sum + (c.weight * c.pricePerTon), 0);
                const tripTax = (trip.cargo || []).reduce((sum, c) => sum + (c.tax || 0), 0);
                const tripNet = tripGross - tripTax;
                
                const travelDays = calculateDays(trip.startDate, trip.endDate);
                const tripDailyAmount = trip.totalDailyAmount || (travelDays * (trip.dailyRate || 0));
                
                const tripOpExps = (trip.expenses || []).reduce((sum, e) => sum + e.amount, 0) + 
                                  ((tripNet * (trip.driverCommissionRate || 0)) / 100) +
                                  tripDailyAmount +
                                  tripTax; // Incluindo imposto como custo operacional mensal

                revenue[monthIdx] += tripGross;
                fleetExpenses[monthIdx] += tripOpExps;
            }
        });

        // Fueling integration
        fuelingRecords.filter(f => !selectedVehicleId || String(f.vehicleId) === String(selectedVehicleId)).forEach(f => {
            const fDate = new Date(`${f.date}T00:00:00Z`);
            if (fDate.getUTCFullYear() === curYear && fDate.getUTCMonth() <= today.getMonth()) {
                fleetExpenses[fDate.getUTCMonth()] += f.totalAmount;
            }
        });

        const getExpTrend = (expenses: (FixedExpense | WorkshopExpense)[]) => {
            const trend = Array(labels.length).fill(0);
            const source = selectedVehicleId ? expenses.filter(e => String(e.vehicleId) === String(selectedVehicleId)) : expenses;
            source.forEach(exp => {
                const installment = exp.totalAmount / exp.installments;
                const first = new Date(`${exp.firstPaymentDate}T00:00:00Z`);
                for (let i = 0; i < exp.installments; i++) {
                    const payDate = new Date(first);
                    payDate.setUTCMonth(payDate.getUTCMonth() + i);
                    if (payDate.getUTCFullYear() === curYear && payDate.getUTCMonth() <= today.getMonth()) {
                        trend[payDate.getUTCMonth()] += installment;
                    }
                }
            });
            return trend;
        };

        const fixedTrend = getExpTrend(fixedExpenses);
        const workshopTrend = getExpTrend(workshopExpenses);
        
        const financialTrend = Array(labels.length).fill(0);
        if (!selectedVehicleId) {
            (financialEntries || []).forEach(entry => {
                const dueDate = new Date(`${entry.dueDate}T00:00:00Z`);
                if (dueDate.getUTCFullYear() === curYear && dueDate.getUTCMonth() <= today.getMonth()) {
                    financialTrend[dueDate.getUTCMonth()] += entry.amount;
                }
            });
        }

        for(let i=0; i<labels.length; i++) {
            totalExpenses[i] = fleetExpenses[i] + fixedTrend[i] + workshopTrend[i] + financialTrend[i];
        }

        return { labels, revenue, fleetExpenses, totalExpenses, results: revenue.map((r, i) => r - totalExpenses[i]) };
    }, [trips, fuelingRecords, fixedExpenses, workshopExpenses, financialEntries, selectedVehicleId]);

    const handleExportExcel = () => {
        const dataToExport = fixedYearlyTrendData.labels.map((label, index) => ({
            'Mês': label,
            'Receitas': fixedYearlyTrendData.revenue[index],
            'Despesas Operacionais': fixedYearlyTrendData.fleetExpenses[index],
            'Despesas Totais': fixedYearlyTrendData.totalExpenses[index],
            'Resultado Saldo': fixedYearlyTrendData.results[index]
        }));
        exportToXLSX(dataToExport, `Analise_${startDate}_a_${endDate}`, 'Analise_Mensal');
    };

    const hasData = fixedYearlyTrendData.labels.length > 0;

    return (
        <div className="space-y-6 relative">
            <style dangerouslySetInnerHTML={{ __html: `
                @media print {
                    @page { size: landscape; margin: 1cm; }
                    .no-print { display: none !important; }
                    body { background: white !important; color: black !important; }
                }
            `}} />
            
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
                     <div className="mb-10 grid grid-cols-1 md:grid-cols-3 gap-6">
                        <div className="bg-blue-600 p-6 rounded-2xl shadow-xl shadow-blue-500/20 text-white relative overflow-hidden group">
                             <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:scale-110 transition-transform duration-500">
                                <ICONS.chartBar className="w-16 h-16" />
                            </div>
                            <p className="text-blue-100 text-[10px] sm:text-xs font-black uppercase tracking-widest mb-2 text-white/80">Faturado (Período Selecionado)</p>
                            <p className="text-3xl font-black">{formatCurrency(stats.revenue)}</p>
                        </div>
                        <div className="bg-slate-800 p-6 rounded-2xl shadow-xl border border-slate-700/50 text-white relative overflow-hidden group">
                            <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:scale-110 transition-transform duration-500">
                                <ICONS.truck className="w-16 h-16" />
                            </div>
                            <p className="text-slate-400 text-[10px] sm:text-xs font-black uppercase tracking-widest mb-2">Despesas (Período Selecionado)</p>
                            <p className="text-3xl font-black text-rose-400">{formatCurrency(stats.totalExpenses)}</p>
                        </div>
                        <div className={`p-6 rounded-2xl shadow-xl text-white relative overflow-hidden group ${stats.netProfit >= 0 ? 'bg-emerald-600 shadow-emerald-500/20' : 'bg-rose-600 shadow-rose-500/20'}`}>
                            <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:scale-110 transition-transform duration-500">
                                <ICONS.currencyDollar className="w-16 h-16" />
                            </div>
                            <p className={`${stats.netProfit >= 0 ? 'text-emerald-100' : 'text-rose-100'} text-[10px] sm:text-xs font-black uppercase tracking-widest mb-2 text-white/80`}>Saldo Final (Período Selecionado)</p>
                            <p className="text-3xl font-black">{formatCurrency(stats.netProfit)}</p>
                        </div>
                    </div>

                    <div className="h-px bg-slate-800/50 mb-10"></div>

                    {hasData ? (
                        <div className="space-y-12">
                            {/* Dynamic KPI Section */}
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                                {viewMode === 'fleet' ? (
                                    <>
                                        <KPICard title="Receita Operacional" value={stats.revenue} colorClass="text-blue-400" tooltipText="Total de fretes realizados no período filtrado." />
                                        <KPICard title="Custos de Viagem" value={stats.tripCosts} colorClass="text-rose-400" tooltipText="Diesel, Diárias, Pedágios e Comissões." />
                                        <KPICard title="Manutenção (Oficina)" value={stats.maintenance} colorClass="text-amber-400" tooltipText="Gastos com oficina e peças no período." />
                                        <KPICard title="Margem de Contribuição" value={stats.operationalResult} colorClass={stats.operationalResult >= 0 ? "text-emerald-400" : "text-rose-600"} tooltipText="Receita - (Custos de Viagem + Oficina)." />
                                    </>
                                ) : (
                                    <>
                                        <KPICard title="Faturamento Global" value={stats.revenue} colorClass="text-blue-400" tooltipText="Faturamento consolidado no período filtrado." />
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
                                     {lineTooltip?.visible && (
                                        <div 
                                            className="absolute z-50 p-3 sm:p-4 bg-slate-950/90 backdrop-blur-xl border border-white/10 rounded-2xl shadow-[0_20px_50px_rgba(0,0,0,0.5)] text-xs sm:text-sm pointer-events-none min-w-[150px] sm:min-w-[180px] ring-1 ring-white/5"
                                            style={{ 
                                                left: `clamp(100px, ${lineTooltip.x}px, calc(100% - 100px))`, 
                                                top: lineTooltip.y, 
                                                transform: 'translate(-50%, -110%)' 
                                            }}
                                        >
                                            <p className="font-black text-[10px] sm:text-[11px] mb-2 sm:mb-3 text-slate-500 uppercase tracking-[0.2em]">
                                                {fixedYearlyTrendData.labels[lineTooltip.data.index]}
                                            </p>
                                            <div className="space-y-2 sm:space-y-3">
                                                <div className="flex justify-between items-center gap-4 sm:gap-6">
                                                    <div className="flex items-center gap-2">
                                                        <div className="w-1.5 h-1.5 rounded-sm bg-[#10b981]"></div>
                                                        <span className="text-slate-400 font-bold text-[9px] sm:text-[10px] uppercase">Receita</span>
                                                    </div>
                                                    <span className="font-black text-white text-xs sm:text-sm">{formatCurrency(fixedYearlyTrendData.revenue[lineTooltip.data.index])}</span>
                                                </div>
                                                <div className="flex justify-between items-center gap-4 sm:gap-6">
                                                    <div className="flex items-center gap-2">
                                                        <div className="w-1.5 h-1.5 rounded-sm bg-[#f43f5e]"></div>
                                                        <span className="text-slate-400 font-bold text-[9px] sm:text-[10px] uppercase">Despesas</span>
                                                    </div>
                                                    <span className="font-black text-white text-xs sm:text-sm">
                                                        {formatCurrency(viewMode === 'fleet' ? fixedYearlyTrendData.fleetExpenses[lineTooltip.data.index] : fixedYearlyTrendData.totalExpenses[lineTooltip.data.index])}
                                                    </span>
                                                </div>
                                                <div className="mt-3 sm:mt-4 pt-2 sm:pt-3 border-t border-white/5 flex justify-between items-center gap-4 sm:gap-6">
                                                    <span className="text-slate-500 font-black uppercase text-[9px] sm:text-[10px] tracking-wider">Saldo</span>
                                                    <span className={`font-black text-xs sm:text-sm ${fixedYearlyTrendData.results[lineTooltip.data.index] >= 0 ? 'text-emerald-400' : 'text-rose-500'}`}>
                                                        {formatCurrency(fixedYearlyTrendData.results[lineTooltip.data.index])}
                                                    </span>
                                                </div>
                                            </div>
                                        </div>
                                    )}
                                    <LineChart 
                                        labels={fixedYearlyTrendData.labels}
                                        datasets={[
                                            { label: 'Receitas', data: fixedYearlyTrendData.revenue, color: '#10b981' },
                                            { label: 'Despesas', data: viewMode === 'fleet' ? fixedYearlyTrendData.fleetExpenses : fixedYearlyTrendData.totalExpenses, color: '#f43f5e' }
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
                                                const tripKm = trip.endKm > trip.startKm ? trip.endKm - trip.startKm : 0;
                                                // Trecho metrics remain based on trips
                                                const metrics = calculateTrechoMetrics(trip.trechos || [], 0, tripKm);
                                                totalKmC += metrics.kmCarregado; totalKmV += metrics.kmVazio;
                                                totalKm += tripKm;
                                            });

                                            // Fuel liters from global records for this period
                                            totalL = filteredData.filteredFuelingRecords.reduce((sum, f) => sum + f.liters, 0);

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
