import React, { useState, useMemo, useRef, useEffect } from 'react';
import { useTrips } from '../../context/TripContext';
import { Maintenance } from '../../types';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/Card';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { Select } from '../ui/Select';
import { ICONS } from '../../constants';
import { useNotification } from '../../context/NotificationContext';
import { exportToXLSX } from '../../utils/exportUtils';
import { AutocompleteInput } from '../ui/AutocompleteInput';

const formatCurrency = (value: number) => {
    return Number(value || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
};

export const MaintenanceManagement: React.FC = () => {
    const { maintenance = [], vehicles = [], addMaintenance, updateMaintenance, deleteMaintenance } = useTrips();
    const { showNotification } = useNotification();
    
    // Reference to focus the first field
    const vehicleInputRef = useRef<HTMLInputElement>(null);
    
    const todayStr = new Date(Date.now() - new Date().getTimezoneOffset() * 60000).toISOString().split('T')[0];
    
    // Form and UI state
    const [showAddForm, setShowAddForm] = useState(false);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [isSaving, setIsSaving] = useState(false);

    // Form Data State
    const [formData, setFormData] = useState<Omit<Maintenance, 'id' | 'createdAt'>>({
        vehicleId: '',
        date: todayStr,
        provider: '',
        category: '',
        description: '',
        amount: 0
    });

    // Temp state for vehicle plate autocomplete
    const [vehiclePlate, setVehiclePlate] = useState('');

    // Filter States
    const [filterVehicleId, setFilterVehicleId] = useState('');
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');

    const filteredMaintenance = useMemo(() => {
        return (maintenance || []).filter(m => {
            const matchesVehicle = !filterVehicleId || m.vehicleId === filterVehicleId;
            const matchesStart = !startDate || m.date >= startDate;
            const matchesEnd = !endDate || m.date <= endDate;
            return matchesVehicle && matchesStart && matchesEnd;
        }).sort((a, b) => b.date.localeCompare(a.date));
    }, [maintenance, filterVehicleId, startDate, endDate]);

    const totalAmount = useMemo(() => {
        return filteredMaintenance.reduce((sum, m) => sum + m.amount, 0);
    }, [filteredMaintenance]);

    // Suggestions based on existing data
    const providerSuggestions = useMemo(() => [...new Set((maintenance || []).map(m => m.provider))].filter(Boolean), [maintenance]);
    const categorySuggestions = useMemo(() => [...new Set((maintenance || []).map(m => m.category))].filter(Boolean), [maintenance]);
    const descriptionSuggestions = useMemo(() => [...new Set((maintenance || []).map(m => m.description))].filter(Boolean), [maintenance]);
    const vehicleSuggestions = useMemo(() => vehicles.filter(v => v.status === 'active' || v.id === formData.vehicleId).map(v => v.plate), [vehicles, formData.vehicleId]);

    // Update vehicle plate when vehicleId changes (for editing)
    useEffect(() => {
        if (formData.vehicleId) {
            const vehicle = vehicles.find(v => v.id === formData.vehicleId);
            if (vehicle) setVehiclePlate(vehicle.plate);
        } else {
            setVehiclePlate('');
        }
    }, [formData.vehicleId, vehicles]);

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        
        // Find vehicle ID from plate if not set (or if changed by typing)
        let finalVehicleId = formData.vehicleId;
        const matchingVehicle = vehicles.find(v => v.plate === vehiclePlate);
        if (matchingVehicle) {
            finalVehicleId = matchingVehicle.id;
        }

        if (!finalVehicleId || !formData.date || !formData.provider || !formData.description || formData.amount < 0) {
            showNotification('Preencha os campos obrigatórios e verifique se o veículo é válido.', 'error');
            return;
        }

        setIsSaving(true);
        try {
            if (editingId) {
                await updateMaintenance({ 
                    ...formData, 
                    vehicleId: finalVehicleId,
                    id: editingId, 
                    createdAt: (maintenance || []).find(m => m.id === editingId)?.createdAt || new Date().toISOString() 
                });
                showNotification('Manutenção atualizada!', 'success');
                setShowAddForm(false);
                resetForm();
            } else {
                await addMaintenance({ ...formData, vehicleId: finalVehicleId });
                showNotification('Manutenção registrada!', 'success');
                
                // Keep form open but reset data correctly
                resetForm();
                
                // Focus back to first field after a short delay to allow re-render
                setTimeout(() => {
                    vehicleInputRef.current?.focus();
                }, 100);
            }
        } catch (error) {
            showNotification('Erro ao salvar manutenção.', 'error');
        } finally {
            setIsSaving(false);
        }
    };

    const resetForm = () => {
        setEditingId(null);
        setFormData({
            vehicleId: '',
            date: todayStr,
            provider: '',
            category: '',
            description: '',
            amount: 0
        });
        setVehiclePlate('');
    };

    // Confirmation state
    const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

    const handleEdit = (m: Maintenance) => {
        setEditingId(m.id);
        const vehicle = vehicles.find(v => v.id === m.vehicleId);
        setVehiclePlate(vehicle?.plate || '');
        setFormData({
            vehicleId: m.vehicleId,
            date: m.date,
            provider: m.provider,
            category: m.category,
            description: m.description,
            amount: m.amount
        });
        setShowAddForm(true);
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    const handleDelete = async (id: string) => {
        setConfirmDeleteId(id);
    };

    const confirmDelete = async () => {
        if (!confirmDeleteId) return;
        
        try {
            await deleteMaintenance(confirmDeleteId);
            showNotification('Manutenção excluída com sucesso!', 'success');
        } catch (error) {
            showNotification('Erro ao excluir manutenção.', 'error');
        } finally {
            setConfirmDeleteId(null);
        }
    };

    const handleExportExcel = () => {
        const dataToExport = filteredMaintenance.map(m => ({
            'Data': new Date(m.date + 'T00:00:00').toLocaleDateString('pt-BR'),
            'Veículo': vehicles.find(v => v.id === m.vehicleId)?.plate || '-',
            'Fornecedor / Responsável': m.provider,
            'Categoria': m.category,
            'Descrição': m.description,
            'Valor': m.amount
        }));
        exportToXLSX(dataToExport, 'Historico_Manutencao', 'Manutenção');
    };

    return (
        <div className="space-y-6 relative">
            {/* Custom Confirmation Modal */}
            {confirmDeleteId && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-200">
                    <div className="bg-slate-900 border border-white/10 p-8 rounded-2xl shadow-2xl max-w-sm w-full text-center space-y-6">
                        <div className="w-16 h-16 bg-rose-500/20 rounded-full flex items-center justify-center mx-auto">
                            <ICONS.trash className="w-8 h-8 text-rose-500" />
                        </div>
                        <div className="space-y-2">
                            <h3 className="text-xl font-bold text-white uppercase">Confirmar Exclusão</h3>
                            <p className="text-slate-400 text-sm">Tem certeza que deseja excluir esta manutenção? Esta ação não pode ser desfeita.</p>
                        </div>
                        <div className="flex gap-3 pt-2">
                            <button 
                                onClick={() => setConfirmDeleteId(null)}
                                className="flex-1 px-4 py-3 rounded-xl bg-slate-800 text-white font-bold hover:bg-slate-700 transition-colors"
                            >
                                CANCELAR
                            </button>
                            <button 
                                onClick={confirmDelete}
                                className="flex-1 px-4 py-3 rounded-xl bg-rose-600 text-white font-bold hover:bg-rose-500 transition-colors"
                            >
                                EXCLUIR
                            </button>
                        </div>
                    </div>
                </div>
            )}

            <Card className="border-none shadow-2xl bg-[#0f172a] overflow-hidden">
                <CardHeader className="border-b border-white/5 pb-6">
                    <div className="space-y-4">
                        <div className="flex flex-wrap items-center justify-between gap-4">
                            <CardTitle className="text-2xl font-black text-white flex items-center gap-3">
                                <div className="p-2 bg-emerald-500/20 rounded-lg">
                                    <ICONS.truck className="w-6 h-6 text-emerald-400" />
                                </div>
                                Histórico de Manutenção
                            </CardTitle>
                            
                            <div className="flex flex-wrap items-center gap-2 no-print">
                                <div className="w-64">
                                    <Select id="filterVehicle" label="" value={filterVehicleId} onChange={e => setFilterVehicleId(e.target.value)}>
                                        <option value="">Todos os Veículos</option>
                                        {vehicles.map(v => <option key={v.id} value={v.id}>{v.plate} - {v.model}</option>)}
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
                                    <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1">Custo Total em Manutenções</p>
                                    <p className="text-2xl font-black text-emerald-400">{formatCurrency(totalAmount)}</p>
                                </div>
                            </div>
                            
                            <div className="flex gap-2 no-print">
                                <Button variant="secondary" onClick={handleExportExcel}>
                                    <ICONS.printer className="w-4 h-4 mr-2"/>
                                    Excel
                                </Button>
                                <Button onClick={() => { setShowAddForm(!showAddForm); setEditingId(null); if(!showAddForm) resetForm(); }}>
                                    <ICONS.plus className="w-4 h-4 mr-2"/>
                                    {showAddForm ? 'Fechar' : 'Nova Manutenção'}
                                </Button>
                            </div>
                        </div>
                    </div>
                </CardHeader>

                <CardContent className="pt-6">
                    {showAddForm && (
                        <div className="mb-8 p-6 bg-slate-800/40 rounded-xl border border-emerald-500/30 no-print animate-in fade-in slide-in-from-top-4 duration-300">
                             <div className="flex justify-between items-center mb-6">
                                <h3 className="text-lg font-bold text-white flex items-center gap-2">
                                    {editingId ? <ICONS.pencil className="w-5 h-5 text-yellow-400" /> : <ICONS.plus className="w-5 h-5 text-emerald-400" />}
                                    {editingId ? 'Editar Registro' : 'Novo Registro de Manutenção'}
                                </h3>
                                <button onClick={() => { setShowAddForm(false); resetForm(); }} className="text-slate-400 hover:text-white transition-colors">
                                    <ICONS.close className="w-5 h-5" />
                                </button>
                            </div>
                            <form onSubmit={handleSave} className="space-y-4">
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                    <div className="md:col-span-1">
                                        <AutocompleteInput 
                                            ref={vehicleInputRef}
                                            id="vehiclePlate" 
                                            label="Veículo (Placa)" 
                                            value={vehiclePlate} 
                                            onChange={e => setVehiclePlate(e.target.value.toUpperCase())}
                                            suggestions={vehicleSuggestions}
                                            required
                                            onSelectSuggestion={(plate) => {
                                                const v = vehicles.find(vh => vh.plate === plate);
                                                if (v) setFormData({...formData, vehicleId: v.id});
                                            }}
                                        />
                                    </div>
                                    <div>
                                        <Input id="date" label="Data" type="date" value={formData.date} onChange={e => setFormData({...formData, date: e.target.value})} required />
                                    </div>
                                    <div>
                                        <AutocompleteInput 
                                            id="provider" 
                                            label="Fornecedor / Responsável" 
                                            value={formData.provider} 
                                            onChange={e => setFormData({...formData, provider: e.target.value.toUpperCase()})}
                                            suggestions={providerSuggestions}
                                            required
                                        />
                                    </div>
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                    <div>
                                        <AutocompleteInput 
                                            id="category" 
                                            label="Categoria" 
                                            value={formData.category} 
                                            onChange={e => setFormData({...formData, category: e.target.value.toUpperCase()})}
                                            suggestions={categorySuggestions}
                                            placeholder="Ex: Motor, Pneus, Freios..."
                                        />
                                    </div>
                                    <div className="md:col-span-1">
                                         <Input id="amount" label="Valor Total (R$)" type="number" step="0.01" value={formData.amount || ''} onChange={e => setFormData({...formData, amount: e.target.valueAsNumber || 0})} required />
                                    </div>
                                    <div className="md:col-span-1">
                                        <AutocompleteInput 
                                            id="description" 
                                            label="Descrição do Serviço ou Peça" 
                                            value={formData.description} 
                                            onChange={e => setFormData({...formData, description: e.target.value.toUpperCase()})} 
                                            suggestions={descriptionSuggestions}
                                            required 
                                        />
                                    </div>
                                </div>
                                <div className="flex justify-end gap-2 pt-4">
                                    <Button type="button" variant="secondary" onClick={() => { setShowAddForm(false); resetForm(); }} disabled={isSaving}>Cancelar</Button>
                                    <Button type="submit" disabled={isSaving}>{isSaving ? 'Salvando...' : editingId ? 'Salvar Alterações' : 'Confirmar Registro'}</Button>
                                </div>
                            </form>
                        </div>
                    )}

                    <div className="overflow-x-auto">
                        <table className="w-full text-left text-sm border-collapse">
                            <thead className="bg-slate-700/50 text-xs uppercase text-slate-400">
                                <tr>
                                    <th className="p-4">Data</th>
                                    <th className="p-4">Veículo</th>
                                    <th className="p-4">Fornecedor / Responsável</th>
                                    <th className="p-4">Categoria</th>
                                    <th className="p-4">Descrição</th>
                                    <th className="p-4 text-right">Valor</th>
                                    <th className="p-4 text-center no-print">Ações</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-white/5 text-slate-300">
                                {filteredMaintenance.map(m => (
                                    <tr key={m.id} onDoubleClick={() => handleEdit(m)} className="hover:bg-blue-500/5 transition-colors cursor-pointer group">
                                        <td className="p-4 font-medium">{new Date(m.date + 'T00:00:00').toLocaleDateString('pt-BR')}</td>
                                        <td className="p-4 font-bold text-white">{vehicles.find(v => v.id === m.vehicleId)?.plate || '-'}</td>
                                        <td className="p-4">{m.provider}</td>
                                        <td className="p-4 text-xs font-black uppercase text-emerald-400">{m.category || '-'}</td>
                                        <td className="p-4 italic text-slate-400">{m.description}</td>
                                        <td className="p-4 text-right font-black text-white">{formatCurrency(m.amount)}</td>
                                        <td className="p-4 no-print text-center">
                                            <div className="flex justify-center items-center gap-3">
                                                <button 
                                                    type="button"
                                                    onClick={(e) => { 
                                                        e.preventDefault();
                                                        e.stopPropagation(); 
                                                        handleEdit(m); 
                                                    }} 
                                                    className="p-2 text-blue-400 hover:text-blue-300 hover:bg-blue-400/10 rounded-lg transition-colors" 
                                                    title="Editar"
                                                >
                                                    <ICONS.pencil className="w-4 h-4 pointer-events-none"/>
                                                </button>
                                                <button 
                                                    type="button"
                                                    onClick={(e) => { 
                                                        e.preventDefault();
                                                        e.stopPropagation(); 
                                                        handleDelete(m.id); 
                                                    }} 
                                                    className="p-2 text-rose-500 hover:text-rose-400 hover:bg-rose-500/10 rounded-lg transition-colors" 
                                                    title="Excluir"
                                                >
                                                    <ICONS.trash className="w-4 h-4 pointer-events-none"/>
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                                {filteredMaintenance.length === 0 && (
                                    <tr>
                                        <td colSpan={7} className="p-10 text-center text-slate-500 uppercase text-xs tracking-widest font-bold">Nenhum registro de manutenção encontrado</td>
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
