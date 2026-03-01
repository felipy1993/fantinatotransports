import React, { useState, useMemo, useEffect } from 'react';
import { useTrips } from '../../context/TripContext';
import { FixedExpense, WorkshopExpense, FixedExpensePayment, FixedExpenseCategory } from '../../types';
import { Card, CardHeader, CardTitle, CardContent } from '../ui/Card';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { Select } from '../ui/Select';
import { ICONS } from '../../constants';
import { useNotification } from '../../context/NotificationContext';

type PayableItem = {
    id: string;
    type: 'fixed' | 'workshop';
    description: string;
    category: 'Despesas' | 'Despesas Oficina';
    vehicleId: string;
    totalAmount: number;
    amountPaid: number;
    installments: number;
    paymentsCount: number;
    dueDate: Date | null;
    status: 'Vencida' | 'Pendente' | 'Pago';
    originalExpense: FixedExpense | WorkshopExpense;
};

const formatCurrency = (value: number) => Number(value || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
const formatDate = (date: Date | null) => {
    if (!date) return 'N/A';
    // Use local date for display
    return date.toLocaleDateString('pt-BR');
};

const initialFormState = {
    description: '',
    dueDate: '', // YYYY-MM-DD
    amount: 0,
    category: 'Despesas' as 'Despesas' | 'Despesas Oficina',
    vehicleId: '',
};

export const AccountsPayable: React.FC = () => {
    const { 
        vehicles, fixedExpenses, workshopExpenses, getVehicle, 
        addFixedExpense, addWorkshopExpense, 
        deleteFixedExpense, deleteWorkshopExpense,
        updateFixedExpense, updateWorkshopExpense
    } = useTrips();
    const { showNotification } = useNotification();
    
    // Filtros e busca
    const [searchTerm, setSearchTerm] = useState('');
    const [plateFilter, setPlateFilter] = useState('');
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');
    const [categoryFilter, setCategoryFilter] = useState('');
    
    // Estado para formulários inline
    const [showAddForm, setShowAddForm] = useState(false);
    const [showEditForm, setShowEditForm] = useState(false);
    
    // Estado para dados de formulários
    const [newExpenseData, setNewExpenseData] = useState(initialFormState);
    const [editingItem, setEditingItem] = useState<PayableItem | null>(null);
    const [editFormData, setEditFormData] = useState<any>(null);
    const [isSaving, setIsSaving] = useState(false);

    useEffect(() => {
        if (editingItem) {
            setEditFormData({
                description: editingItem.description,
                dueDate: editingItem.originalExpense.firstPaymentDate,
                amount: editingItem.totalAmount,
                category: editingItem.category,
                vehicleId: editingItem.vehicleId,
            });
        }
    }, [editingItem]);


    const allPayableItems = useMemo<PayableItem[]>(() => {
        const todayStr = new Date(Date.now() - new Date().getTimezoneOffset() * 60000).toISOString().split('T')[0];

        const combined: Omit<PayableItem, 'dueDate' | 'status' | 'amountPaid' | 'paymentsCount' | 'installments'>[] = [
            ...fixedExpenses.map(e => ({
                id: e.id, 
                type: 'fixed' as const, 
                description: e.description,
                category: 'Despesas' as const, 
                vehicleId: e.vehicleId,
                totalAmount: e.totalAmount, 
                originalExpense: e,
            })),
            ...workshopExpenses.map(e => ({
                id: e.id, 
                type: 'workshop' as const, 
                description: e.description,
                category: 'Despesas Oficina' as const, 
                vehicleId: e.vehicleId,
                totalAmount: e.totalAmount, 
                originalExpense: e,
            })),
        ];
        
        return combined.map(item => {
             const exp = item.originalExpense;
             const amountPaid = exp.payments.reduce((sum, p) => sum + p.amount, 0);
             const isPaidOff = exp.payments.length >= exp.installments;
             
             // Data de vencimento corrigida para o fuso local
             const dueDateStr = exp.firstPaymentDate;
             const dueDate = new Date(`${dueDateStr}T00:00:00`);
             
             let status: 'Vencida' | 'Pendente' | 'Pago' = 'Pendente';
             if (isPaidOff) {
                 status = 'Pago';
             } else if (dueDateStr < todayStr) {
                 status = 'Vencida';
             }

             return { 
                 ...item, 
                 dueDate, 
                 status,
                 amountPaid,
                 installments: exp.installments,
                 paymentsCount: exp.payments.length
             };
        }).sort((a, b) => (a.dueDate?.getTime() || 0) - (b.dueDate?.getTime() || 0));
    }, [fixedExpenses, workshopExpenses]);

    const filteredItems = useMemo(() => {
        return allPayableItems.filter(item => {
            const vehicle = getVehicle(item.vehicleId);
            const dueDate = item.dueDate;
            // Use local date for filtering
            const start = startDate ? new Date(`${startDate}T00:00:00`) : null;
            const end = endDate ? new Date(`${endDate}T23:59:59`) : null;

            if (start && dueDate && dueDate < start) return false;
            if (end && dueDate && dueDate > end) return false;
            if (categoryFilter && item.category !== categoryFilter) return false;
            if (searchTerm && !item.description.toLowerCase().includes(searchTerm.toLowerCase())) return false;
            if (plateFilter && vehicle && !vehicle.plate.toLowerCase().includes(plateFilter.toLowerCase())) return false;
            
            return true;
        });
    }, [allPayableItems, searchTerm, plateFilter, startDate, endDate, categoryFilter, getVehicle]);

    const filteredTotal = useMemo(() => {
        return filteredItems.reduce((sum, item) => sum + item.totalAmount, 0);
    }, [filteredItems]);
    
    const handleDelete = async (item: PayableItem) => {
         if (window.confirm(`Tem certeza que deseja excluir a despesa "${item.description}"?`)) {
            if (item.type === 'fixed') {
                await deleteFixedExpense(item.id);
            } else {
                await deleteWorkshopExpense(item.id);
            }
            showNotification('Despesa excluída com sucesso!', 'success');
         }
    };

    const handleAddExpense = async (e: React.FormEvent) => {
        e.preventDefault();
        const { description, dueDate, amount, category, vehicleId } = newExpenseData;

        if (!description || !dueDate || amount <= 0 || !category || !vehicleId) {
            showNotification("Por favor, preencha todos os campos.", "error");
            return;
        }
    
        setIsSaving(true);
        const paymentDate = dueDate; // Agora vem no formato completo YYYY-MM-DD
    
        if (category === 'Despesas Oficina') {
            await addWorkshopExpense({
                description, vehicleId,
                totalAmount: amount, installments: 1,
                serviceDate: paymentDate, firstPaymentDate: paymentDate,
            });
        } else {
            await addFixedExpense({
                description, vehicleId,
                totalAmount: amount, installments: 1,
                category: FixedExpenseCategory.OTHER,
                firstPaymentDate: paymentDate,
            });
        }
    
        showNotification('Nova despesa adicionada com sucesso!', 'success');
        setShowAddForm(false);
        setNewExpenseData(initialFormState);
        setIsSaving(false);
    };

    const handleEditClick = (item: PayableItem) => {
        setEditingItem(item);
        setShowEditForm(true);
        setShowAddForm(false); // Garante que apenas um formulário esteja aberto
        // Scroll to top to see edit form
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };
    
    const handleSaveChanges = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!editingItem || !editFormData) return;

        const { description, dueDate, amount, category, vehicleId } = editFormData;
        if (!description || !dueDate || amount <= 0 || !category || !vehicleId) {
            showNotification("Por favor, preencha todos os campos do formulário de edição.", "error");
            return;
        }

        setIsSaving(true);
        const paymentDate = dueDate;

        if (editingItem.type === 'fixed') {
            await updateFixedExpense({
                ...editingItem.originalExpense,
                description, vehicleId,
                totalAmount: amount, 
                firstPaymentDate: paymentDate,
                category: category === 'Despesas Oficina' ? FixedExpenseCategory.OTHER : (editingItem.originalExpense as any).category
            } as FixedExpense);
        } else {
            await updateWorkshopExpense({
                ...editingItem.originalExpense,
                description, vehicleId,
                totalAmount: amount,
                firstPaymentDate: paymentDate,
                serviceDate: paymentDate, // Assume service date is linked to first payment date
            } as WorkshopExpense);
        }

        showNotification("Despesa atualizada com sucesso!", 'success');
        setShowEditForm(false);
        setEditingItem(null);
        setIsSaving(false);
    };

    const handlePay = async (item: PayableItem) => {
        const exp = item.originalExpense;
        const remainingAmount = exp.totalAmount - item.amountPaid;
        const nextInstallmentAmount = exp.totalAmount / exp.installments;
        const amountToPay = Math.min(nextInstallmentAmount, remainingAmount);

        if (window.confirm(`Confirmar pagamento de ${formatCurrency(amountToPay)} para "${item.description}"?`)) {
            
            const newPayment: FixedExpensePayment = {
                id: '' + Date.now(), // Unique ID for payment
                date: new Date().toISOString().split('T')[0], // Current date YYYY-MM-DD
                amount: amountToPay,
            };

            const updatedExpense = {
                ...exp,
                payments: [...exp.payments, newPayment]
            };

            if (item.type === 'fixed') {
                await updateFixedExpense(updatedExpense as FixedExpense);
            } else {
                await updateWorkshopExpense(updatedExpense as WorkshopExpense);
            }
            
            showNotification(`Pagamento registrado com sucesso!`, 'success');
        }
    };


    return (
        <>
        <style>
            {`
                @media print {
                    .no-print { display: none !important; }
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
                    }
                    .printable-card * {
                        color: black !important;
                        border-color: #000 !important;
                    }
                    .print-header {
                        display: block !important;
                        text-align: center;
                        margin-bottom: 15px;
                        border-bottom: 2px solid #000;
                        padding-bottom: 5px;
                    }
                    .print-header h1 {
                        font-size: 16pt !important;
                        margin: 0 !important;
                    }
                    .print-header p {
                        font-size: 9pt !important;
                        margin: 1px 0 !important;
                    }
                    table {
                        width: 100% !important;
                        border-collapse: collapse !important;
                        table-layout: auto !important;
                        font-size: 8.5pt !important;
                    }
                    th, td {
                        border: 1px solid #000 !important;
                        padding: 4px 6px !important;
                    }
                    th {
                        background-color: #eee !important;
                        text-transform: uppercase;
                    }
                    .bg-slate-900\\/50 {
                        background-color: #f3f3f3 !important;
                        border: 1px solid #000 !important;
                        margin-top: 5px !important;
                        padding: 8px !important;
                    }
                    .text-2xl { font-size: 1.25rem !important; }
                    .text-yellow-400 {
                        color: black !important;
                        font-weight: bold !important;
                    }
                    main {
                        padding: 0 !important;
                        margin: 0 !important;
                    }
                    .space-y-4 > * + * { margin-top: 0.5rem !important; }
                }
            .print-header { display: none; }
            `}
        </style>
        <Card className="printable-card">
            {/* Print Only Header */}
            <div className="print-header">
                <h1 className="text-2xl font-bold">Relatório de Contas a Pagar</h1>
                <p>Sistema de Controle de Viagem</p>
                <p>Emissão: {new Date().toLocaleString('pt-BR')}</p>
            </div>

            <CardHeader className="border-b-0">
                <div className="space-y-4">
                    <div className="flex flex-wrap items-center justify-between gap-4">
                        <CardTitle className="print:text-center print:w-full text-2xl">Contas a Pagar</CardTitle>
                        <div className="flex flex-wrap items-center gap-2 no-print">
                            <Input id="search" label="" placeholder="Buscar por descrição..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} />
                            <Input id="plateFilter" label="" placeholder="Buscar por placa..." value={plateFilter} onChange={e => setPlateFilter(e.target.value)} />
                            <Input id="startDate" label="" type="date" value={startDate} onChange={e => setStartDate(e.target.value)} />
                            <Input id="endDate" label="" type="date" value={endDate} onChange={e => setEndDate(e.target.value)} />
                            <Select id="categoryFilter" label="" value={categoryFilter} onChange={e => setCategoryFilter(e.target.value)}>
                                <option value="">Todas Categorias</option>
                                <option value="Despesas">Despesas</option>
                                <option value="Despesas Oficina">Despesas Oficina</option>
                            </Select>
                        </div>
                    </div>
                     <div className="flex flex-wrap items-center justify-between gap-4 bg-slate-900/50 p-4 rounded-lg">
                        <div>
                            <p className="text-sm text-slate-400">TOTAL FILTRADO</p>
                            <p className="text-2xl font-bold text-yellow-400">{formatCurrency(filteredTotal)}</p>
                        </div>
                        <div className="flex gap-2 no-print">
                             <Button onClick={() => { setShowAddForm(!showAddForm); setShowEditForm(false); }}>
                                <ICONS.plus className="w-4 h-4 mr-2"/>
                                {showAddForm ? 'Fechar' : 'Nova Despesa'}
                            </Button> 
                            <Button variant="secondary" onClick={() => window.print()}>
                                <ICONS.printer className="w-4 h-4 mr-2"/>
                                Imprimir
                            </Button>
                        </div>
                    </div>
                </div>
            </CardHeader>
            <CardContent>
                {/* Form Adicionar Inline */}
                {showAddForm && (
                     <div className="mb-8 p-6 bg-slate-800/50 rounded-xl border border-blue-500/30 no-print animate-in fade-in slide-in-from-top-4 duration-300">
                        <div className="flex justify-between items-center mb-6">
                            <h3 className="text-lg font-bold text-white flex items-center gap-2">
                                <ICONS.plus className="w-5 h-5 text-blue-400" />
                                Adicionar Nova Conta a Pagar
                            </h3>
                            <button onClick={() => setShowAddForm(false)} className="text-slate-400 hover:text-white transition-colors">
                                <ICONS.close className="w-5 h-5" />
                            </button>
                        </div>
                        <form onSubmit={handleAddExpense} className="space-y-4">
                            <Input
                                id="new-desc" label="Descrição" value={newExpenseData.description}
                                onChange={e => setNewExpenseData(p => ({...p, description: e.target.value.toUpperCase()}))} required
                            />
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <Input
                                    id="new-dueDate" label="Data Vencimento" type="date" value={newExpenseData.dueDate}
                                    onChange={e => setNewExpenseData(p => ({...p, dueDate: e.target.value}))} required
                                />
                                <Input
                                    id="new-amount" label="Valor (R$)" type="number" step="0.01" value={newExpenseData.amount || ''}
                                    onChange={e => setNewExpenseData(p => ({...p, amount: e.target.valueAsNumber || 0}))} required
                                />
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <Select
                                    id="new-category" label="Categoria" value={newExpenseData.category}
                                    onChange={e => setNewExpenseData(p => ({...p, category: e.target.value as any}))} required
                                >
                                    <option value="Despesas">Despesas</option>
                                    <option value="Despesas Oficina">Despesas Oficina</option>
                                </Select>
                                <Select
                                    id="new-vehicle" label="Veículo" value={newExpenseData.vehicleId}
                                    onChange={e => setNewExpenseData(p => ({...p, vehicleId: e.target.value}))} required
                                >
                                    <option value="">Selecione o veículo</option>
                                    {vehicles.filter(v => v.status === 'active').map(v => <option key={v.id} value={v.id}>{v.plate} - {v.model}</option>)}
                                </Select>
                            </div>
                            <div className="flex justify-end gap-2 pt-4">
                                <Button type="button" variant="secondary" onClick={() => setShowAddForm(false)} disabled={isSaving}>Cancelar</Button>
                                <Button type="submit" disabled={isSaving}>{isSaving ? 'Adicionando...' : 'Adicionar Despesa'}</Button>
                            </div>
                        </form>
                    </div>
                )}

                {/* Form Editar Inline */}
                {showEditForm && editingItem && editFormData && (
                    <div className="mb-8 p-6 bg-slate-800/50 rounded-xl border border-yellow-500/30 no-print animate-in fade-in slide-in-from-top-4 duration-300">
                        <div className="flex justify-between items-center mb-6">
                            <h3 className="text-lg font-bold text-white flex items-center gap-2">
                                <ICONS.pencil className="w-5 h-5 text-yellow-500" />
                                Editar Conta a Pagar: <span className="text-yellow-500">{editingItem.description}</span>
                            </h3>
                            <button onClick={() => { setShowEditForm(false); setEditingItem(null); }} className="text-slate-400 hover:text-white transition-colors">
                                <ICONS.close className="w-5 h-5" />
                            </button>
                        </div>
                        <form onSubmit={handleSaveChanges} className="space-y-4">
                            <Input
                                id="edit-desc" label="Descrição" value={editFormData.description}
                                onChange={e => setEditFormData(p => ({...p, description: e.target.value.toUpperCase()}))} required
                            />
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <Input
                                    id="edit-dueDate" label="Data Vencimento" type="date" value={editFormData.dueDate}
                                    onChange={e => setEditFormData(p => ({...p, dueDate: e.target.value}))} required
                                />
                                <Input
                                    id="edit-amount" label="Valor (R$)" type="number" step="0.01" value={editFormData.amount || ''}
                                    onChange={e => setEditFormData(p => ({...p, amount: e.target.valueAsNumber || 0}))} required
                                />
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <Select
                                    id="edit-category" label="Categoria" value={editFormData.category}
                                    onChange={e => setEditFormData(p => ({...p, category: e.target.value as any}))} required
                                >
                                    <option value="Despesas">Despesas</option>
                                    <option value="Despesas Oficina">Despesas Oficina</option>
                                </Select>
                                <Select
                                    id="edit-vehicle" label="Veículo" value={editFormData.vehicleId}
                                    onChange={e => setEditFormData(p => ({...p, vehicleId: e.target.value}))} required
                                >
                                    <option value="">Selecione o veículo</option>
                                    {vehicles.filter(v => v.status === 'active' || v.id === editFormData.vehicleId).map(v => 
                                        <option key={v.id} value={v.id}>{v.plate} - {v.model} {v.status === 'inactive' ? '(Inativo)' : ''}</option>
                                    )}
                                </Select>
                            </div>
                            <div className="flex justify-end gap-2 pt-4">
                                <Button type="button" variant="secondary" onClick={() => { setShowEditForm(false); setEditingItem(null); }} disabled={isSaving}>Cancelar</Button>
                                <Button type="submit" disabled={isSaving}>{isSaving ? 'Salvando...' : 'Salvar Alterações'}</Button>
                            </div>
                        </form>
                    </div>
                )}
                <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm border-collapse">
                        <thead className="bg-slate-700/50 text-xs uppercase text-slate-400">
                            <tr>
                                <th className="p-3">Descrição</th>
                                <th className="p-3">Placa</th>
                                <th className="p-3">Status</th>
                                <th className="p-3">Vlr Total</th>
                                <th className="p-3">Categoria</th>
                                <th className="p-3">Vencimento</th>
                                <th className="p-3 text-center no-print">Ações</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredItems.map(item => {
                                const vehicle = getVehicle(item.vehicleId);
                                return (
                                     <tr key={item.id} onDoubleClick={() => handleEditClick(item)} className="border-b border-slate-700 hover:bg-slate-800/50 cursor-pointer">
                                        <td className="p-3 font-medium text-white">
                                            {item.description}
                                            {item.installments > 1 && (
                                                <span className="ml-2 px-1.5 py-0.5 text-[10px] bg-slate-600 text-slate-300 rounded">
                                                    {item.paymentsCount}/{item.installments} parcelas
                                                </span>
                                            )}
                                        </td>
                                        <td className="p-3">{vehicle?.plate}</td>
                                        <td className="p-3">
                                            <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${
                                                item.status === 'Vencida' ? 'bg-red-500/20 text-red-400 border border-red-500/50' :
                                                item.status === 'Pendente' ? 'bg-yellow-500/20 text-yellow-400 border border-yellow-500/50' :
                                                'bg-green-500/20 text-green-400 border border-green-500/50'
                                            }`}>
                                                {item.status.toUpperCase()}
                                            </span>
                                        </td>
                                        <td className="p-3 font-semibold text-slate-200">{formatCurrency(item.totalAmount)}</td>
                                        <td className="p-3 text-slate-400">{item.category}</td>
                                        <td className="p-3 font-medium">{formatDate(item.dueDate)}</td>
                                        <td className="p-3 no-print">
                                            <div className="flex justify-center items-center gap-3">
                                                {item.status !== 'Pago' && (
                                                    <button 
                                                        onClick={(e) => { e.stopPropagation(); handlePay(item); }} 
                                                        className="bg-green-600 hover:bg-green-500 text-white px-2 py-1 rounded text-[10px] transition-colors uppercase tracking-wider font-bold"
                                                    >
                                                        Pagar
                                                    </button>
                                                )}
                                                <button onClick={(e) => { e.stopPropagation(); handleEditClick(item); }} className="text-blue-400 hover:text-blue-300 transition-colors p-1" title="Editar">
                                                    <ICONS.pencil className="w-4 h-4"/>
                                                </button>
                                                <button onClick={(e) => { e.stopPropagation(); handleDelete(item); }} className="text-red-400 hover:text-red-300 transition-colors p-1" title="Excluir">
                                                    <ICONS.trash className="w-4 h-4"/>
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                )
                            })}
                        </tbody>
                    </table>
                     {filteredItems.length === 0 && (
                        <p className="text-center text-slate-400 py-8">Nenhuma despesa encontrada com os filtros atuais.</p>
                    )}
                </div>
            </CardContent>
        </Card>

        </>
    );
};