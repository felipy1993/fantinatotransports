import React, { useState } from 'react';
import { useTrips } from '../../context/TripContext';
import { Trip, Expense, ExpenseCategory, ReceivedPayment, ReceivedPaymentType, PaymentMethod } from '../../types';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/Card';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { Select } from '../ui/Select';
import { ICONS, EXPENSE_CATEGORIES, RECEIVED_PAYMENT_TYPES, PAYMENT_METHODS } from '../../constants';
import { AutocompleteInput } from '../ui/AutocompleteInput';
import { useNotification } from '../../context/NotificationContext';
import { calculateTrechoMetrics } from '../../utils/tripMetrics';
import { exportToXLSX } from '../../utils/exportUtils';

const formatCurrency = (value: number) => {
    return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
};

const Section: React.FC<{ title: string; children: React.ReactNode; className?: string }> = ({ title, children, className }) => (
    <div className={`mb-6 ${className}`}>
        <h3 className="text-lg font-semibold text-blue-400 border-b border-slate-700 pb-2 mb-3">{title}</h3>
        {children}
    </div>
);

const InfoItem: React.FC<{ label: string; value: string | number | undefined; isCurrency?: boolean }> = ({ label, value, isCurrency = false }) => (
    <div className="flex justify-between items-center py-2 text-sm">
        <span className="text-slate-400">{label}</span>
        <span className="font-medium text-white">{isCurrency && typeof value === 'number' ? formatCurrency(value) : value}</span>
    </div>
);


const calculateDays = (start: string, end: string) => {
    if (!start || !end) return 0;
    const s = new Date(start + 'T00:00:00');
    const e = new Date(end + 'T00:00:00');
    if (isNaN(s.getTime()) || isNaN(e.getTime())) return 0;
    const diffTime = e.getTime() - s.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return Math.max(0, diffDays + 1);
};

const calculateTotals = (trip: Trip) => {
    const totalFreight = (trip.cargo || []).reduce((sum, c) => sum + (c.weight * c.pricePerTon) - (c.tax || 0), 0);
    const totalOtherExpenses = (trip.expenses || []).reduce((sum, e) => sum + e.amount, 0);
    const totalFueling = (trip.fueling || []).reduce((sum, f) => sum + f.totalAmount, 0);
    
    // Recuperar totalDailyAmount salvo ou recalcular se não existir
    const travelDays = calculateDays(trip.startDate, trip.endDate);
    const totalDailyAmount = trip.totalDailyAmount || (travelDays * (trip.dailyRate || 0));
    
    const totalExpenses = totalOtherExpenses + totalFueling + totalDailyAmount;
    const driverCommission = (totalFreight * (trip.driverCommissionRate || 0)) / 100;
    const netBalance = totalFreight - driverCommission - totalExpenses;
    const totalKm = (trip.endKm || 0) > (trip.startKm || 0) ? (trip.endKm || 0) - (trip.startKm || 0) : 0;
    const totalReceived = (trip.receivedPayments || []).reduce((sum, p) => sum + p.amount, 0);
    const balanceToReceive = totalFreight - totalReceived;
    const totalLiters = (trip.fueling || []).reduce((sum, f) => sum + f.liters, 0);
    const fuelEfficiency = totalLiters > 0 && totalKm > 0 ? (totalKm / totalLiters).toFixed(2) : 'N/A';
    const trechoMetrics = calculateTrechoMetrics(trip.trechos || [], totalLiters, totalKm);

    return { totalFreight, totalExpenses, totalOtherExpenses, totalFueling, totalDailyAmount, travelDays, driverCommission, netBalance, totalKm, totalReceived, balanceToReceive, fuelEfficiency, trechoMetrics };
}

export const TripDetails: React.FC<{ tripId: string, setView: (view: any) => void }> = ({ tripId, setView }) => {
    const { trips, getTrip, getDriver, getVehicle, updateTrip } = useTrips();
    const { showNotification } = useNotification();
    const trip = getTrip(tripId);
    const today = new Date(Date.now() - new Date().getTimezoneOffset() * 60000).toISOString().split('T')[0];

    const [newExpense, setNewExpense] = useState<Omit<Expense, 'id'>>({
        category: ExpenseCategory.OTHER,
        description: '',
        amount: 0,
        date: today,
    });
    const [editingExpenseId, setEditingExpenseId] = useState<string | null>(null);
    
    const [newReceivedPayment, setNewReceivedPayment] = useState<Omit<ReceivedPayment, 'id'>>({
        type: ReceivedPaymentType.BALANCE,
        method: PaymentMethod.PIX,
        amount: 0,
        date: today,
    });
    const [editingReceivedPaymentId, setEditingReceivedPaymentId] = useState<string | null>(null);

    const expenseDescSuggestions = [...new Set(trips.flatMap(t => t.expenses || []).filter(Boolean).map(e => e.description))];

    if (!trip) {
        return <Card><CardContent>Viagem não encontrada.</CardContent></Card>;
    }

    const driver = getDriver(trip.driverId);
    const vehicle = getVehicle(trip.vehicleId);
    const totals = calculateTotals(trip);

    const handleAddExpense = async () => {
        if (newExpense.description && newExpense.amount > 0) {
            let updatedTrip;
            if (editingExpenseId) {
                updatedTrip = { 
                    ...trip, 
                    expenses: (trip.expenses || []).map(e => e.id === editingExpenseId ? { ...newExpense, id: editingExpenseId } : e)
                };
                setEditingExpenseId(null);
            } else {
                const expenseToAdd: Expense = { ...newExpense, id: '' + Math.random() };
                updatedTrip = { ...trip, expenses: [...(trip.expenses || []), expenseToAdd] };
            }
            await updateTrip(updatedTrip);
            setNewExpense({
                category: ExpenseCategory.OTHER,
                description: '',
                amount: 0,
                date: today,
            });
            showNotification(editingExpenseId ? 'Despesa atualizada!' : 'Despesa adicionada!', 'success');
        } else {
            showNotification('Preencha a descrição e um valor maior que zero.', 'error');
        }
    };
    
    const handleAddReceivedPayment = async () => {
        if (newReceivedPayment.amount > 0) {
            let updatedTrip;
            if (editingReceivedPaymentId) {
                updatedTrip = { 
                    ...trip, 
                    receivedPayments: (trip.receivedPayments || []).map(p => p.id === editingReceivedPaymentId ? { ...newReceivedPayment, id: editingReceivedPaymentId } : p)
                };
                setEditingReceivedPaymentId(null);
            } else {
                const paymentToAdd: ReceivedPayment = { ...newReceivedPayment, id: '' + Math.random() };
                updatedTrip = { ...trip, receivedPayments: [...(trip.receivedPayments || []), paymentToAdd] };
            }
            await updateTrip(updatedTrip);
            setNewReceivedPayment({
                type: ReceivedPaymentType.BALANCE,
                method: PaymentMethod.PIX,
                amount: 0,
                date: today,
            });
            showNotification(editingReceivedPaymentId ? 'Recebimento atualizado!' : 'Recebimento adicionado!', 'success');
        } else {
            showNotification('Por favor, preencha um valor maior que zero.', 'error');
        }
    };

    const handleEditExpense = (e: Expense) => {
        setEditingExpenseId(e.id);
        setNewExpense({ category: e.category, description: e.description, amount: e.amount, date: e.date });
    };

    const handleEditReceivedPayment = (p: ReceivedPayment) => {
        setEditingReceivedPaymentId(p.id);
        setNewReceivedPayment({ type: p.type, method: p.method, amount: p.amount, date: p.date });
    };


    const handleRemoveExpense = async (expenseId: string) => {
        const updatedTrip = { ...trip, expenses: (trip.expenses || []).filter(e => e.id !== expenseId) };
        await updateTrip(updatedTrip);
        if (editingExpenseId === expenseId) {
            setEditingExpenseId(null);
            setNewExpense({ category: ExpenseCategory.OTHER, description: '', amount: 0, date: today });
        }
    };
    
    const handleRemoveFueling = async (fuelingId: string) => {
        const updatedTrip = { ...trip, fueling: (trip.fueling || []).filter(f => f.id !== fuelingId) };
        await updateTrip(updatedTrip);
    };
    
    const handleRemoveReceivedPayment = async (paymentId: string) => {
        const updatedTrip = { ...trip, receivedPayments: (trip.receivedPayments || []).filter(p => p.id !== paymentId) };
        await updateTrip(updatedTrip);
        if (editingReceivedPaymentId === paymentId) {
            setEditingReceivedPaymentId(null);
            setNewReceivedPayment({ type: ReceivedPaymentType.BALANCE, method: PaymentMethod.PIX, amount: 0, date: today });
        }
    };


    const handleSign = async () => {
        const signedTrip = {
            ...trip,
            signature: {
                date: new Date().toISOString(),
                confirmed: true,
            },
        };
        await updateTrip(signedTrip);
    };

    const handleExportExcel = () => {
        const cargoData = (trip.cargo || []).map(c => ({
            'Tipo': c.type,
            'Peso (t)': c.weight,
            'Preço/t': c.pricePerTon,
            'Imposto': c.tax || 0,
            'Total Líquido': (c.weight * c.pricePerTon) - (c.tax || 0)
        }));

        const fuelingData = (trip.fueling || []).map(f => ({
            'Posto': f.station,
            'KM': f.km,
            'Litros': f.liters,
            'Valor Total': f.totalAmount,
            'Preço/L': f.liters > 0 ? (f.totalAmount / f.liters).toFixed(2) : 0
        }));

        const expenseData = (trip.expenses || []).map(e => ({
            'Descrição': e.description,
            'Categoria': e.category,
            'Data': e.date,
            'Valor': e.amount
        }));

        const paymentData = (trip.receivedPayments || []).map(p => ({
            'Tipo': p.type,
            'Método': p.method,
            'Data': p.date,
            'Valor': p.amount
        }));

        const summaryData = [
            { 'Item': 'Total Frete', 'Valor': totals.totalFreight },
            { 'Item': 'Combustível', 'Valor': totals.totalFueling },
            { 'Item': 'Outras Despesas', 'Valor': totals.totalOtherExpenses },
            { 'Item': 'Diárias', 'Valor': totals.totalDailyAmount },
            { 'Item': 'Comissão Motorista', 'Valor': totals.driverCommission },
            { 'Item': 'Lucro Líquido', 'Valor': totals.netBalance },
            { 'Item': 'Total Recebido', 'Valor': totals.totalReceived },
            { 'Item': 'Saldo a Receber', 'Valor': totals.balanceToReceive }
        ];

        const sheets = [
            { name: 'Resumo', data: summaryData },
            { name: 'Cargas', data: cargoData },
            { name: 'Abastecimentos', data: fuelingData },
            { name: 'Despesas', data: expenseData },
            { name: 'Recebimentos', data: paymentData }
        ];

        exportToXLSX(sheets, `Acerto_Viagem_${trip.id.slice(0, 8)}`);
    };

    return (
        <div>
            <style>
                {`
                @media print {
                    .no-print, #trip-details-header, #add-expense-section, #add-received-payment-section, .remove-btn, #signature-action {
                        display: none !important;
                    }
                    @page { margin: 0.8cm; }
                    body { background: white !important; font-size: 9pt !important; }
                    .printable-card {
                        background-color: white !important;
                        box-shadow: none !important;
                        border: none !important;
                        padding: 0 !important;
                        margin: 0 !important;
                        color: black !important;
                        width: 100% !important;
                        position: absolute;
                        left: 0;
                        top: 0;
                        min-height: 26cm !important; /* Aproximadamente altura da folha A4 com margens */
                        display: flex !important;
                        flex-direction: column !important;
                    }
                    .printable-card * {
                        color: black !important;
                        border-color: #000 !important;
                        background-color: transparent !important;
                    }
                    .card-content-grid {
                        flex-grow: 1 !important;
                    }
                    /* Headers */
                    .print-header {
                        display: block !important;
                        text-align: center;
                        margin-bottom: 10px;
                        border-bottom: 2px solid #000;
                        padding-bottom: 5px;
                    }
                    .print-header h1 {
                        font-size: 18pt;
                        font-weight: bold;
                        margin: 0;
                    }
                    .print-header p {
                        font-size: 10pt;
                        margin: 1px 0;
                    }
                    /* Sections */
                    .print-section-title {
                        font-size: 10pt !important;
                        font-weight: bold !important;
                        background-color: #eee !important;
                        padding: 4px 8px !important;
                        margin-top: 10px !important;
                        margin-bottom: 5px !important;
                        border: 1px solid #000 !important;
                        display: block !important;
                        width: 100% !important;
                        text-transform: uppercase;
                    }
                    /* Tables */
                    .print-table {
                        width: 100% !important;
                        border-collapse: collapse !important;
                        font-size: 8.5pt !important;
                        margin-bottom: 10px !important;
                    }
                    .print-table th, .print-table td {
                        border: 1px solid #000 !important;
                        padding: 4px 6px !important;
                        text-align: left !important;
                    }
                    .print-table th {
                        background-color: #f3f3f3 !important;
                    }
                    /* Totals */
                    .print-total-row {
                        font-weight: bold !important;
                        font-size: 9.5pt !important;
                    }
                    .print-grand-total {
                        font-size: 13pt !important;
                        padding: 8px !important;
                        border: 2px solid #000 !important;
                        margin-top: 15px !important;
                        text-align: center !important;
                        background-color: #f9f9f9 !important;
                    }
                    /* Grid adjustments */
                    .card-content-grid {
                        display: block !important;
                    }
                    .md\\:col-span-2, .md\\:col-span-1 {
                        width: 100% !important;
                    }
                    /* Info Items */
                    .py-2 { padding-top: 0.25rem !important; padding-bottom: 0.25rem !important; }
                    /* Boxes */
                    .bg-slate-800\\/30, .bg-slate-900\\/50 {
                        background-color: white !important;
                        border: 1px solid #000 !important;
                        padding: 8px 12px !important;
                    }
                    .rounded-xl, .rounded-lg {
                        border-radius: 0 !important;
                    }
                    .gap-6 {
                        gap: 0 !important;
                    }
                    .mb-6 { margin-bottom: 0.75rem !important; }
                    .space-y-8 > * + * { margin-top: 1rem !important; }
                    .space-y-4 > * + * { margin-top: 0.5rem !important; }
                    main {
                        padding: 0 !important;
                        margin: 0 !important;
                    }
                    .text-green-400, .text-red-400, .text-blue-400 {
                        color: black !important;
                    }
                    /* Footer signatures */
                    .print-signature-area {
                        display: grid !important;
                        grid-template-columns: 1fr 1fr !important;
                        gap: 3cm !important;
                        margin-top: auto !important;
                        padding-top: 2cm !important;
                        width: 100% !important;
                    }
                }
                .print-header { display: none; }
                `}
            </style>

            <div id="trip-details-header" className="flex justify-between items-center mb-4">
                <Button onClick={() => setView({type: 'tripList'})}>
                    &larr; Voltar para Lista de Viagens
                </Button>
                <div className="flex gap-2">
                    <Button onClick={() => setView({ type: 'editTrip', tripId: trip.id })} variant="secondary">
                        <ICONS.pencil className="w-4 h-4 mr-2" />
                        Editar Viagem
                    </Button>
                    <Button onClick={handleExportExcel} variant="secondary">
                        <ICONS.printer className="w-4 h-4 mr-2" />
                        Exportar Excel
                    </Button>
                    <Button onClick={() => window.print()} variant="secondary">
                        <ICONS.printer className="w-4 h-4 mr-2" />
                        Imprimir Acerto
                    </Button>
                </div>
            </div>

            <Card className="printable-card overflow-hidden">
                {/* Print Only Header */}
                <div className="print-header">
                    <h1>PRATEADO TRANSPORTE</h1>
                    <p>Comprovante de Acerto de Viagem</p>
                    <p>Emissão: {new Date().toLocaleString('pt-BR')}</p>
                </div>

                <CardHeader className="border-b border-slate-700/50 pb-4">
                    <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                        <div className="flex-1">
                            <CardTitle className="text-xl md:text-2xl">
                                Acerto: {trip.origin || 'Origem Pendente'} &larr;&rarr; {trip.destination || 'Destino Pendente'}
                            </CardTitle>
                            <div className="flex flex-wrap gap-x-4 gap-y-1 mt-2 text-slate-400 text-sm">
                                <span className="flex items-center gap-1.5"><ICONS.driver className="w-4 h-4" /> {driver?.name}</span>
                                <span className="flex items-center gap-1.5"><ICONS.truck className="w-4 h-4" /> {vehicle?.plate}</span>
                                {trip.monthlyTripNumber && <span className="text-blue-400 font-semibold">{trip.monthlyTripNumber}ª Viagem do Mês</span>}
                            </div>
                        </div>
                        <div className="hidden md:block text-right">
                             <p className="text-xs text-slate-500">ID: {trip.id.slice(0,8)}</p>
                             <div className={`mt-1 px-3 py-1 rounded-full text-xs font-bold inline-block ${trip.signature?.confirmed ? 'bg-green-500/20 text-green-400' : 'bg-yellow-500/20 text-yellow-500'}`}>
                                {trip.signature?.confirmed ? 'FINALIZADO' : 'EM ABERTO'}
                             </div>
                        </div>
                    </div>
                </CardHeader>

                <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-6 card-content-grid">
                    <div className="md:col-span-2 space-y-8">
                        
                        {/* Summary Section was here, moved to the bottom */}

                        {/* Cargo Section */}
                        <div className="space-y-4">
                            <h3 className="text-lg font-bold text-white flex items-center gap-2 print-section-title">
                                <ICONS.trip className="w-5 h-5 text-blue-400 no-print" /> 
                                Detalhamento de Cargas
                            </h3>
                            <table className="print-table w-full text-sm">
                                 <thead>
                                    <tr className="bg-slate-800 text-slate-300 text-left">
                                        <th className="p-3 rounded-tl-lg">Tipo da Carga</th>
                                        <th className="p-3">Peso</th>
                                        <th className="p-3">Valor/t</th>
                                        <th className="p-3">Imposto</th>
                                        <th className="p-3 text-right rounded-tr-lg">Total Líquido</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {(trip.cargo || []).length > 0 ? (trip.cargo || []).map(cargo => (
                                        <tr key={cargo.id} className="border-b border-slate-700/50 hover:bg-slate-800/30">
                                            <td className="p-3 text-white">{cargo.type}</td>
                                            <td className="p-3">{cargo.weight}t</td>
                                            <td className="p-3">{formatCurrency(cargo.pricePerTon)}</td>
                                            <td className="p-3 text-red-400">{cargo.tax ? formatCurrency(cargo.tax) : '-'}</td>
                                            <td className="p-3 text-right font-bold text-white">{formatCurrency((cargo.weight * cargo.pricePerTon) - (cargo.tax || 0))}</td>
                                        </tr>
                                    )) : (
                                        <tr><td colSpan={5} className="p-6 text-center text-slate-500 italic">Nenhuma carga registrada</td></tr>
                                    )}
                                </tbody>
                                <tfoot className="bg-slate-800/50 font-bold">
                                    <tr>
                                        <td colSpan={4} className="p-3 text-right text-slate-400">TOTAL FRETE:</td>
                                        <td className="p-3 text-right text-green-400 text-lg">{formatCurrency(totals.totalFreight)}</td>
                                    </tr>
                                </tfoot>
                            </table>
                        </div>

                        {/* Expenses Section */}
                        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
                            <div className="space-y-4">
                                <h3 className="text-md font-bold text-white flex items-center gap-2 print-section-title">Combustível</h3>
                                <table className="print-table w-full text-xs">
                                    <thead>
                                        <tr className="text-left text-slate-400 border-b border-slate-700">
                                            <th className="pb-2">Posto / Local</th>
                                            <th className="pb-2">Litrarem</th>
                                            <th className="pb-2 text-right">Valor</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {(trip.fueling || []).map(fuel => (
                                            <tr key={fuel.id} className="border-b border-slate-800/50">
                                                <td className="py-2 text-slate-300">
                                                    <div className="font-medium text-white">{fuel.station}</div>
                                                    <div className="text-[10px]">{fuel.km} km</div>
                                                </td>
                                                <td className="py-2">{fuel.liters} L</td>
                                                <td className="py-2 text-right font-medium">
                                                    <div className="flex items-center justify-end gap-2">
                                                        {formatCurrency(fuel.totalAmount)}
                                                        <button onClick={() => handleRemoveFueling(fuel.id)} className="remove-btn text-red-500 hover:text-red-400 p-1">
                                                            <ICONS.trash className="w-3 h-3" />
                                                        </button>
                                                    </div>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>

                            <div className="space-y-4">
                                <h3 className="text-md font-bold text-white flex items-center gap-2 print-section-title">Outras Despesas</h3>
                                <table className="print-table w-full text-xs">
                                    <thead>
                                        <tr className="text-left text-slate-400 border-b border-slate-700">
                                            <th className="pb-2">Descrição</th>
                                            <th className="pb-2 text-right">Valor</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {(trip.expenses || []).map(exp => (
                                            <tr key={exp.id} className="border-b border-slate-800/50">
                                                <td className="py-2 text-slate-300">
                                                    <div className="font-medium text-white">{exp.description}</div>
                                                    <div className="text-[10px] uppercase text-slate-500">{exp.category}</div>
                                                </td>
                                                <td className="py-2 text-right font-medium">
                                                    <div className="flex items-center justify-end gap-2 text-[10px]">
                                                        {formatCurrency(exp.amount)}
                                                        <button onClick={() => handleEditExpense(exp)} className="p-1 rounded bg-blue-600/20 hover:bg-blue-600/40 text-blue-400 border border-blue-500/30" title="Editar">
                                                            <ICONS.pencil className="w-3 h-3" />
                                                        </button>
                                                        <button onClick={() => handleRemoveExpense(exp.id)} className="p-1 rounded bg-red-600/20 hover:bg-red-600/40 text-red-500 border border-red-500/30" title="Excluir">
                                                            <ICONS.trash className="w-3 h-3" />
                                                        </button>
                                                    </div>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>

                        {/* Signatures for Print (Removed from here, moved to end of CardContent) */}

                    </div>

                    {/* Sidebar Information */}
                    <div className="space-y-6">
                        <section className="bg-slate-800/30 rounded-xl p-5 border border-slate-700/50 space-y-4">
                            <h3 className="text-sm font-bold text-blue-400 uppercase tracking-wider print-section-title">Dados da Viagem</h3>
                            <div className="space-y-2">
                                <InfoItem label="Início" value={new Date(trip.startDate + 'T00:00:00').toLocaleDateString('pt-BR')} />
                                <InfoItem label="Fim" value={trip.endDate ? new Date(trip.endDate + 'T00:00:00').toLocaleDateString('pt-BR') : 'Em curso'} />
                                <hr className="border-slate-700/50 my-1" />
                                <InfoItem label="KM Inicial" value={trip.startKm ? `${trip.startKm} km` : 'Não informado'} />
                                <InfoItem label="KM Final" value={trip.endKm > 0 ? `${trip.endKm} km` : '-'} />
                                <InfoItem label="KM Rodados" value={`${totals.totalKm} km`} />
                                <InfoItem label="Dias de Viagem" value={`${totals.travelDays} dias`} />
                                {trip.dailyRate && <InfoItem label="Valor da Diária" value={trip.dailyRate} isCurrency />}
                                <hr className="border-slate-700/50 my-1" />
                                <div className="flex justify-between items-center py-1">
                                    <span className="text-xs text-slate-400">Média Geral</span>
                                    <span className="text-md font-bold text-green-400">{totals.fuelEfficiency} km/L</span>
                                </div>
                            </div>
                        </section>

                        <section className="bg-slate-800/30 rounded-xl p-5 border border-slate-700/50 space-y-4">
                            <h3 className="text-sm font-bold text-blue-400 uppercase tracking-wider print-section-title">Pagamentos Recebidos</h3>
                            <div className="space-y-1">
                                {(trip.receivedPayments || []).map(p => (
                                    <div key={p.id} className="flex justify-between items-center py-2 border-b border-slate-700/30 last:border-0">
                                        <div className="text-[11px]">
                                            <div className="text-white font-medium">{p.type}</div>
                                            <div className="text-slate-500">{p.method} | {new Date(p.date + 'T00:00:00').toLocaleDateString('pt-BR')}</div>
                                        </div>
                                        <div className="flex items-center gap-3">
                                            <span className="text-sm font-bold text-green-400">{formatCurrency(p.amount)}</span>
                                            <div className="flex gap-1 no-print">
                                                <button onClick={() => handleEditReceivedPayment(p)} className="p-1 rounded bg-blue-600/20 hover:bg-blue-600/40 text-blue-400 border border-blue-500/30" title="Editar">
                                                    <ICONS.pencil className="w-3 h-3" />
                                                </button>
                                                <button onClick={() => handleRemoveReceivedPayment(p.id)} className="p-1 rounded bg-red-600/20 hover:bg-red-600/40 text-red-500 border border-red-500/30" title="Excluir">
                                                    <ICONS.trash className="w-3 h-3" />
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                            <div id="add-received-payment-section" className="pt-4 border-t border-slate-700 no-print">
                                <div className="space-y-3 mb-4 p-3 bg-slate-900/50 rounded-lg border border-slate-700/50">
                                    <div className="grid grid-cols-2 gap-2">
                                        <Select id="recType" label="Tipo" value={newReceivedPayment.type} onChange={e => setNewReceivedPayment(p => ({...p, type: e.target.value as ReceivedPaymentType}))} className="text-xs h-8 py-0">
                                            {RECEIVED_PAYMENT_TYPES.map(c => <option key={c} value={c}>{c}</option>)}
                                        </Select>
                                        <Select id="recMethod" label="Forma" value={newReceivedPayment.method} onChange={e => setNewReceivedPayment(p => ({...p, method: e.target.value as PaymentMethod}))} className="text-xs h-8 py-0">
                                            {PAYMENT_METHODS.map(c => <option key={c} value={c}>{c}</option>)}
                                        </Select>
                                    </div>
                                    <div className="grid grid-cols-2 gap-2">
                                        <Input id="recDate" label="Data" type="date" value={newReceivedPayment.date} onChange={e => setNewReceivedPayment(p => ({...p, date: e.target.value}))} className="text-xs h-8 py-0"/>
                                        <Input id="recAmount" label="Valor" type="number" step="0.01" value={newReceivedPayment.amount || ''} onChange={e => setNewReceivedPayment(p => ({...p, amount: e.target.valueAsNumber || 0}))} className="text-xs h-8 py-0"/>
                                    </div>
                                    <div className="flex gap-2">
                                        {editingReceivedPaymentId && (
                                            <Button variant="secondary" className="flex-1 text-xs py-1 h-auto" onClick={() => {
                                                setEditingReceivedPaymentId(null);
                                                setNewReceivedPayment({ type: ReceivedPaymentType.BALANCE, method: PaymentMethod.PIX, amount: 0, date: today });
                                            }}>Cancelar</Button>
                                        )}
                                        <Button variant="primary" className="flex-[2] text-xs py-1 h-auto" onClick={handleAddReceivedPayment}>
                                            {editingReceivedPaymentId ? 'Salvar Alteração' : 'Adicionar Recebimento'}
                                        </Button>
                                    </div>
                                </div>
                            </div>
                        </section>

                        <section className="bg-slate-800/30 rounded-xl p-5 border border-slate-700/50 space-y-4 no-print">
                            <h3 className="text-sm font-bold text-blue-400 uppercase tracking-wider">Status do Acerto</h3>
                            {trip.signature?.confirmed ? (
                                <div className="text-center p-3 bg-green-500/10 border border-green-500/20 rounded-lg">
                                    <p className="font-bold text-green-400 text-sm">Confirmado</p>
                                    <p className="text-[10px] text-slate-400 mt-1">
                                        {new Date(trip.signature.date).toLocaleString('pt-BR')}
                                    </p>
                                </div>
                            ) : (
                                <div id="signature-action" className="text-center">
                                    <Button onClick={handleSign} className="w-full text-sm">
                                        Confirmar Acerto
                                    </Button>
                                </div>
                            )}
                        </section>
                    </div>

                    {/* Summary Section - Moved to bottom */}
                    <div className="space-y-4 mt-6">
                        <h3 className="text-lg font-bold text-white flex items-center gap-2 print-section-title">
                            <ICONS.bank className="w-5 h-5 text-blue-400 no-print" /> 
                            Resumo Financeiro Final
                        </h3>
                        <div className="bg-slate-800/30 rounded-xl p-6 border border-slate-700/50 space-y-3">
                            <InfoItem label="Total Frete (Receita Bruta)" value={totals.totalFreight} isCurrency />
                            <InfoItem label="Total Recebido (Adiantamentos/Saldos)" value={totals.totalReceived} isCurrency />
                            <div className="flex justify-between items-center py-2 text-sm border-t border-slate-700/50 mt-1">
                                <span className="text-slate-400 font-medium">Saldo pendente de recebimento</span>
                                <span className={`text-lg font-bold ${totals.balanceToReceive > 0 ? 'text-red-400' : 'text-green-400'}`}>{formatCurrency(totals.balanceToReceive)}</span>
                            </div>
                            <div className="pt-4 grid grid-cols-1 sm:grid-cols-4 gap-2 border-t border-slate-700/50">
                                <div className="p-2 bg-slate-900/50 rounded-lg">
                                    <p className="text-[10px] text-slate-400 mb-1">Combustível</p>
                                    <p className="text-xs font-semibold">{formatCurrency(totals.totalFueling)}</p>
                                </div>
                                <div className="p-2 bg-slate-900/50 rounded-lg">
                                    <p className="text-[10px] text-slate-400 mb-1">Outras Despesas</p>
                                    <p className="text-xs font-semibold">{formatCurrency(totals.totalOtherExpenses)}</p>
                                </div>
                                <div className="p-2 bg-slate-900/50 rounded-lg">
                                    <p className="text-[10px] text-slate-400 mb-1">Diárias</p>
                                    <p className="text-xs font-semibold">{formatCurrency(totals.totalDailyAmount)}</p>
                                </div>
                                <div className="p-2 bg-slate-900/50 rounded-lg">
                                    <p className="text-[10px] text-slate-400 mb-1">Comissão</p>
                                    <p className="text-xs font-semibold">{formatCurrency(totals.driverCommission)}</p>
                                </div>
                            </div>
                            <div className="pt-4 flex flex-col items-center justify-center bg-blue-600/10 border-2 border-blue-500/20 rounded-xl p-3 mt-2 print-grand-total">
                                <span className="text-[10px] text-blue-400 font-bold uppercase tracking-widest mb-1">Lucro Líquido Final</span>
                                <span className={`text-xl font-black ${totals.netBalance >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                                    {formatCurrency(totals.netBalance)}
                                </span>
                            </div>

                            {/* Detailed Calculation Breakdown */}
                            <div className="mt-4 p-4 bg-slate-900/50 rounded-lg border border-slate-700/50 print:mt-2 print:border-slate-300">
                                <h4 className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2 flex items-center gap-2 print:text-black">
                                    <ICONS.info className="w-3 h-3 no-print" />
                                    Detalhamento do Cálculo
                                </h4>
                                <div className="space-y-1 text-xs">
                                    <div className="flex justify-between items-center text-slate-300 print:text-black">
                                        <span>(+) Total Frete (Receita)</span>
                                        <span className="font-medium">{formatCurrency(totals.totalFreight)}</span>
                                    </div>
                                    <div className="flex justify-between items-center text-red-400/80 print:text-black">
                                        <span>(-) Comissão Motorista ({trip.driverCommissionRate}%)</span>
                                        <span className="font-medium">{formatCurrency(totals.driverCommission)}</span>
                                    </div>
                                    <div className="flex justify-between items-center text-red-400/80 print:text-black">
                                        <span>(-) Combustível Total</span>
                                        <span className="font-medium">{formatCurrency(totals.totalFueling)}</span>
                                    </div>
                                    <div className="flex justify-between items-center text-red-400/80 print:text-black">
                                        <span>(-) Outras Despesas</span>
                                        <span className="font-medium">{formatCurrency(totals.totalOtherExpenses)}</span>
                                    </div>
                                    <div className="flex justify-between items-center text-red-400/80 print:text-black">
                                        <span>(-) Diárias ({totals.travelDays} dias)</span>
                                        <span className="font-medium">{formatCurrency(totals.totalDailyAmount)}</span>
                                    </div>
                                    <div className="pt-1 border-t border-slate-700 print:border-black flex justify-between items-center font-bold text-sm text-white print:text-black">
                                        <span>(=) Resultado Líquido</span>
                                        <span className={totals.netBalance >= 0 ? 'text-green-400 print:text-black' : 'text-red-400 print:text-black'}>
                                            {formatCurrency(totals.netBalance)}
                                        </span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Signatures for Print - Moved to bottom of content */}
                    <div className="hidden print-signature-area">
                        <div className="text-center">
                            <div className="border-t border-black w-full mb-2"></div>
                            <p className="text-sm font-bold">{driver?.name}</p>
                            <p className="text-xs">Motorista</p>
                        </div>
                        <div className="text-center">
                            <div className="border-t border-black w-full mb-2"></div>
                            <p className="text-sm font-bold">PRATEADO TRANSPORTE</p>
                            <p className="text-xs">Responsável</p>
                        </div>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
};
