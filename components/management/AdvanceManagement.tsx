import React, { useState, useMemo } from 'react';
import { useTrips } from '../../context/TripContext';
import { Advance, AdvanceCategory, Driver } from '../../types';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/Card';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { Select } from '../ui/Select';
import { ICONS } from '../../constants';
import { useNotification } from '../../context/NotificationContext';
import { exportToXLSX } from '../../utils/exportUtils';

const formatCurrency = (value: number) => {
    return Number(value || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
};

const valorPorExtenso = (valor: number) => {
    return valor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
};

export const AdvanceManagement: React.FC = () => {
    const { advances, drivers, addAdvance, updateAdvance, deleteAdvance } = useTrips();
    const { showNotification } = useNotification();
    
    const todayStr = new Date(Date.now() - new Date().getTimezoneOffset() * 60000).toISOString().split('T')[0];
    
    // Estado para formulários inline
    const [showAddForm, setShowAddForm] = useState(false);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [isSaving, setIsSaving] = useState(false);

    // Estados do Formulário
    const [formData, setFormData] = useState<Omit<Advance, 'id' | 'createdAt'>>({
        driverId: '',
        amount: 0,
        category: AdvanceCategory.VALE,
        date: todayStr,
        description: ''
    });

    // Estados de Filtro
    const [filterDriverId, setFilterDriverId] = useState('');
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');

    // Estado para Recibo Selecionado
    const [selectedForReceipt, setSelectedForReceipt] = useState<Advance | null>(null);

    const filteredAdvances = useMemo(() => {
        return advances.filter(adv => {
            const matchesDriver = !filterDriverId || adv.driverId === filterDriverId;
            const matchesStart = !startDate || adv.date >= startDate;
            const matchesEnd = !endDate || adv.date <= endDate;
            return matchesDriver && matchesStart && matchesEnd;
        }).sort((a, b) => b.date.localeCompare(a.date));
    }, [advances, filterDriverId, startDate, endDate]);

    const totals = useMemo(() => {
        return {
            total: filteredAdvances.reduce((sum, adv) => sum + adv.amount, 0),
            salary: filteredAdvances.filter(a => a.category === AdvanceCategory.SALARY).reduce((sum, adv) => sum + adv.amount, 0),
            vales: filteredAdvances.filter(a => a.category === AdvanceCategory.VALE).reduce((sum, adv) => sum + adv.amount, 0),
            others: filteredAdvances.filter(a => a.category === AdvanceCategory.OTHER).reduce((sum, adv) => sum + adv.amount, 0),
        };
    }, [filteredAdvances]);

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!formData.driverId || formData.amount <= 0 || !formData.date) {
            showNotification('Preencha os campos obrigatórios (Motorista, Valor e Data).', 'error');
            return;
        }

        setIsSaving(true);
        try {
            if (editingId) {
                await updateAdvance({ 
                    ...formData, 
                    id: editingId, 
                    createdAt: advances.find(a => a.id === editingId)?.createdAt || new Date().toISOString() 
                });
                showNotification('Lançamento atualizado!', 'success');
            } else {
                await addAdvance(formData);
                showNotification('Lançamento realizado!', 'success');
            }
            resetForm();
            setShowAddForm(false);
        } catch (error) {
            showNotification('Erro ao salvar lançamento.', 'error');
        } finally {
            setIsSaving(false);
        }
    };

    const resetForm = () => {
        setEditingId(null);
        setFormData({
            driverId: '',
            amount: 0,
            category: AdvanceCategory.VALE,
            date: todayStr,
            description: ''
        });
    };

    const handleEdit = (adv: Advance) => {
        setEditingId(adv.id);
        setFormData({
            driverId: adv.driverId,
            amount: adv.amount,
            category: adv.category,
            date: adv.date,
            description: adv.description
        });
        setShowAddForm(true);
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    const handleDelete = async (id: string) => {
        if (window.confirm('Tem certeza que deseja excluir este lançamento?')) {
            await deleteAdvance(id);
            showNotification('Lançamento excluído.', 'success');
        }
    };

    const handlePrintReceipt = (adv: Advance) => {
        setSelectedForReceipt(adv);
        setTimeout(() => {
            window.print();
        }, 100);
    };

    const handleExportExcel = () => {
        const dataToExport = filteredAdvances.map(adv => ({
            'Data': new Date(adv.date + 'T00:00:00').toLocaleDateString('pt-BR'),
            'Motorista': getDriverName(adv.driverId),
            'Categoria': adv.category,
            'Valor': adv.amount,
            'Descrição': adv.description || '-'
        }));
        exportToXLSX(dataToExport, 'Relatorio_Adiantamentos', 'Adiantamentos');
    };

    const getDriverName = (id: string) => drivers.find(d => d.id === id)?.name || 'Desconhecido';

    return (
        <div className="space-y-6">
            <style>
                {`
                @media print {
                    @page { size: A4 portrait; margin: 1cm; }
                    body { background: white !important; }
                    body * { visibility: hidden; }
                    #receipt-content, #receipt-content * { visibility: visible; }
                    #receipt-content {
                        position: fixed; left: 0; top: 0; width: 100%; height: 100%;
                        background: white !important; color: black !important;
                        display: flex !important; align-items: flex-start !important; justify-content: center !important;
                    }
                    .no-print { display: none !important; }
                    .receipt-box {
                        border: 2px solid black !important; width: 100% !important;
                        max-width: 19cm !important; margin: 0 auto !important;
                        padding: 1.5cm !important; page-break-inside: avoid !important;
                    }
                }
                `}
            </style>

            {/* Recibo para Impressão */}
            {selectedForReceipt && (
                <div id="receipt-content" className="hidden print:flex text-black font-serif">
                    <div className="receipt-box">
                        <div className="flex justify-between items-start border-b-2 border-black pb-4 mb-6">
                            <div>
                                <h1 className="text-3xl font-black uppercase">PRATEADO TRANSPORTE</h1>
                                <p className="text-sm">Gestão e Logística de Transportes</p>
                            </div>
                            <div className="text-right">
                                <h2 className="text-xl font-bold">RECIBO</h2>
                                <p className="text-2xl font-black mt-2 bg-gray-100 px-4 py-1">{formatCurrency(selectedForReceipt.amount)}</p>
                            </div>
                        </div>
                        <div className="space-y-6 text-lg leading-relaxed">
                            <p>Recebi de <span className="font-bold underline">PRATEADO TRANSPORTE</span>, a importância de <span className="font-bold"> {valorPorExtenso(selectedForReceipt.amount)} </span> referente a <span className="font-bold underline">{selectedForReceipt.category.toUpperCase()}</span>{selectedForReceipt.description && ` (${selectedForReceipt.description})`}.</p>
                            <p>Para maior clareza, firmo o presente.</p>
                        </div>
                        <div className="mt-20 flex flex-col items-end">
                            <p className="mb-12">Data: <span className="font-bold">{new Date(selectedForReceipt.date + 'T00:00:00').toLocaleDateString('pt-BR')}</span></p>
                            <div className="w-full grid grid-cols-2 gap-20">
                                <div className="text-center"><div className="border-t border-black mb-1"></div><p className="text-sm font-bold">{getDriverName(selectedForReceipt.driverId)}</p><p className="text-xs uppercase">Assinatura</p></div>
                                <div className="text-center"><div className="border-t border-black mb-1"></div><p className="text-sm font-bold">PRATEADO TRANSPORTE</p><p className="text-xs uppercase">Carimbo</p></div>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            <Card className="border-none shadow-2xl bg-[#0f172a] overflow-hidden printable-card">
                <CardHeader className="border-b border-white/5 pb-6">
                    <div className="space-y-4">
                        <div className="flex flex-wrap items-center justify-between gap-4">
                            <CardTitle className="text-2xl font-black text-white flex items-center gap-3">
                                <div className="p-2 bg-blue-500/20 rounded-lg">
                                    <ICONS.currencyDollar className="w-6 h-6 text-blue-400" />
                                </div>
                                Adiantamentos e Vales
                            </CardTitle>
                            
                            <div className="flex flex-wrap items-center gap-2 no-print">
                                <div className="w-64">
                                    <Select id="filterDriver" label="" value={filterDriverId} onChange={e => setFilterDriverId(e.target.value)}>
                                        <option value="">Todos os Motoristas</option>
                                        {drivers.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
                                    </Select>
                                </div>
                                <div className="w-40 flex items-center gap-2">
                                    <Input id="startDate" label="" type="date" value={startDate} onChange={e => setStartDate(e.target.value)} />
                                </div>
                                <div className="w-40 flex items-center gap-2">
                                    <Input id="endDate" label="" type="date" value={endDate} onChange={e => setEndDate(e.target.value)} />
                                </div>
                            </div>
                        </div>

                        <div className="flex flex-wrap items-center justify-between gap-6 bg-slate-900/50 p-4 rounded-xl border border-slate-800/50">
                            <div className="flex flex-wrap gap-8 items-center">
                                <div className="min-w-[120px]">
                                    <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1">Total Filtrado</p>
                                    <p className="text-2xl font-black text-yellow-400">{formatCurrency(totals.total)}</p>
                                </div>
                                <div className="w-[1px] h-10 bg-slate-800 hidden sm:block"></div>
                                <div className="min-w-[120px]">
                                    <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1">Adiant. Salário</p>
                                    <p className="text-2xl font-black text-blue-400">{formatCurrency(totals.salary)}</p>
                                </div>
                                <div className="w-[1px] h-10 bg-slate-800 hidden sm:block"></div>
                                <div className="min-w-[120px]">
                                    <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1">Vales</p>
                                    <p className="text-2xl font-black text-orange-400">{formatCurrency(totals.vales)}</p>
                                </div>
                            </div>
                            
                            <div className="flex gap-2 no-print">
                                <Button variant="secondary" onClick={handleExportExcel}>
                                    <ICONS.printer className="w-4 h-4 mr-2"/>
                                    Excel
                                </Button>
                                <Button onClick={() => { setShowAddForm(!showAddForm); setEditingId(null); if(!showAddForm) resetForm(); }}>
                                    <ICONS.plus className="w-4 h-4 mr-2"/>
                                    {showAddForm ? 'Fechar' : 'Novo Lançamento'}
                                </Button>
                            </div>
                        </div>
                    </div>
                </CardHeader>

                <CardContent className="pt-6">
                    {/* Formulário Inline */}
                    {showAddForm && (
                        <div className="mb-8 p-6 bg-slate-800/40 rounded-xl border border-blue-500/30 no-print animate-in fade-in slide-in-from-top-4 duration-300">
                             <div className="flex justify-between items-center mb-6">
                                <h3 className="text-lg font-bold text-white flex items-center gap-2">
                                    {editingId ? <ICONS.pencil className="w-5 h-5 text-yellow-400" /> : <ICONS.plus className="w-5 h-5 text-blue-400" />}
                                    {editingId ? 'Editar Lançamento' : 'Novo Adiantamento / Vale'}
                                </h3>
                                <button onClick={() => { setShowAddForm(false); resetForm(); }} className="text-slate-400 hover:text-white transition-colors">
                                    <ICONS.close className="w-5 h-5" />
                                </button>
                            </div>
                            <form onSubmit={handleSave} className="space-y-4">
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                    <div className="md:col-span-1">
                                        <Select id="driverId" label="Motorista" value={formData.driverId} onChange={e => setFormData({...formData, driverId: e.target.value})} required>
                                            <option value="">Selecione o Motorista</option>
                                            {drivers.filter(d => d.status === 'active' || d.id === formData.driverId).map(d => (
                                                <option key={d.id} value={d.id}>{d.name}</option>
                                            ))}
                                        </Select>
                                    </div>
                                    <div>
                                        <Select id="category" label="Categoria" value={formData.category} onChange={e => setFormData({...formData, category: e.target.value as AdvanceCategory})}>
                                            {Object.values(AdvanceCategory).map(cat => (
                                                <option key={cat} value={cat}>{cat}</option>
                                            ))}
                                        </Select>
                                    </div>
                                    <div>
                                        <Input id="date" label="Data" type="date" value={formData.date} onChange={e => setFormData({...formData, date: e.target.value})} />
                                    </div>
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                    <div>
                                        <Input id="amount" label="Valor (R$)" type="number" step="0.01" value={formData.amount || ''} onChange={e => setFormData({...formData, amount: e.target.valueAsNumber || 0})} required />
                                    </div>
                                    <div className="md:col-span-2">
                                        <Input id="description" label="Descrição / Observação" value={formData.description} onChange={e => setFormData({...formData, description: e.target.value})} placeholder="Pequeno resumo do motivo..." />
                                    </div>
                                </div>
                                <div className="flex justify-end gap-2 pt-4">
                                    <Button type="button" variant="secondary" onClick={() => { setShowAddForm(false); resetForm(); }} disabled={isSaving}>Cancelar</Button>
                                    <Button type="submit" disabled={isSaving}>{isSaving ? 'Salvando...' : editingId ? 'Salvar Alterações' : 'Confirmar Lançamento'}</Button>
                                </div>
                            </form>
                        </div>
                    )}

                    <div className="overflow-x-auto">
                        <table className="w-full text-left text-sm border-collapse">
                            <thead className="bg-slate-700/50 text-xs uppercase text-slate-400">
                                <tr>
                                    <th className="p-4">Data</th>
                                    <th className="p-4">Motorista</th>
                                    <th className="p-4">Categoria</th>
                                    <th className="p-4">Descrição</th>
                                    <th className="p-4 text-right">Valor</th>
                                    <th className="p-4 text-center no-print">Ações</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-white/5">
                                {filteredAdvances.map(adv => (
                                    <tr key={adv.id} onDoubleClick={() => handleEdit(adv)} className="hover:bg-blue-500/5 transition-colors cursor-pointer group">
                                        <td className="p-4 text-white font-medium">{new Date(adv.date + 'T00:00:00').toLocaleDateString('pt-BR')}</td>
                                        <td className="p-4 text-slate-300 font-bold">{getDriverName(adv.driverId)}</td>
                                        <td className="p-4 text-slate-400">
                                            <span className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase ${
                                                adv.category === AdvanceCategory.SALARY ? 'bg-blue-500/10 text-blue-400' : 'bg-orange-500/10 text-orange-400'
                                            }`}>{adv.category}</span>
                                        </td>
                                        <td className="p-4 text-slate-500 max-w-[200px] truncate">{adv.description || '-'}</td>
                                        <td className="p-4 text-right font-black text-white">{formatCurrency(adv.amount)}</td>
                                        <td className="p-4 no-print text-center">
                                            <div className="flex justify-center items-center gap-3">
                                                <button onClick={(e) => { e.stopPropagation(); handlePrintReceipt(adv); }} className="text-emerald-400 hover:text-emerald-300 p-1" title="Imprimir Recibo">
                                                    <ICONS.printer className="w-4 h-4"/>
                                                </button>
                                                <button onClick={(e) => { e.stopPropagation(); handleEdit(adv); }} className="text-blue-400 hover:text-blue-300 p-1" title="Editar">
                                                    <ICONS.pencil className="w-4 h-4"/>
                                                </button>
                                                <button onClick={(e) => { e.stopPropagation(); handleDelete(adv.id); }} className="text-rose-500 hover:text-rose-400 p-1" title="Excluir">
                                                    <ICONS.trash className="w-4 h-4"/>
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                                {filteredAdvances.length === 0 && (
                                    <tr>
                                        <td colSpan={6} className="p-10 text-center text-slate-500 uppercase text-xs tracking-widest font-bold">Nenhum lançamento encontrado</td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
};
