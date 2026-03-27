import React, { useState, useMemo, useRef, useEffect } from 'react';
import { useTrips } from '../../context/TripContext';
import { FuelingRecord, PaymentMethod } from '../../types';
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

export const FuelingManagement: React.FC = () => {
    const { fuelingRecords = [], vehicles = [], addFuelingRecord, updateFuelingRecord, deleteFuelingRecord } = useTrips();
    const { showNotification } = useNotification();
    
    // Reference to focus the first field
    const vehicleInputRef = useRef<HTMLInputElement>(null);
    
    const todayStr = new Date(Date.now() - new Date().getTimezoneOffset() * 60000).toISOString().split('T')[0];
    
    // Form and UI state
    const [showAddForm, setShowAddForm] = useState(false);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [isSaving, setIsSaving] = useState(false);

    // Form Data State
    const [formData, setFormData] = useState<Omit<FuelingRecord, 'id' | 'createdAt'>>({
        vehicleId: '',
        station: '',
        date: todayStr,
        totalAmount: 0,
        liters: 0,
        pricePerLiter: 0,
        km: 0,
        paymentMethod: PaymentMethod.CASH
    });

    // Temp state for vehicle plate autocomplete
    const [vehiclePlate, setVehiclePlate] = useState('');

    const now = new Date();
    const firstDay = new Date(now.getFullYear(), now.getMonth(), 1);
    const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    
    const formatDate = (date: Date) => {
        return new Date(date.getTime() - date.getTimezoneOffset() * 60000).toISOString().split('T')[0];
    };

    // Filter States
    const [filterVehicleId, setFilterVehicleId] = useState('');
    const [startDate, setStartDate] = useState(formatDate(firstDay));
    const [endDate, setEndDate] = useState(formatDate(lastDay));

    const filteredFueling = useMemo(() => {
        return (fuelingRecords || []).filter(f => {
            const matchesVehicle = !filterVehicleId || f.vehicleId === filterVehicleId;
            const matchesStart = !startDate || f.date >= startDate;
            const matchesEnd = !endDate || f.date <= endDate;
            return matchesVehicle && matchesStart && matchesEnd;
        }).sort((a, b) => b.date.localeCompare(a.date));
    }, [fuelingRecords, filterVehicleId, startDate, endDate]);

    const totalLitros = useMemo(() => filteredFueling.reduce((sum, f) => sum + f.liters, 0), [filteredFueling]);
    const totalValor = useMemo(() => filteredFueling.reduce((sum, f) => sum + f.totalAmount, 0), [filteredFueling]);

    // Suggestions based on existing data
    const stationSuggestions = useMemo(() => [...new Set((fuelingRecords || []).map(f => f.station))].filter(Boolean), [fuelingRecords]);
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

    // Auto-calculate price per liter
    useEffect(() => {
        if (formData.totalAmount > 0 && formData.liters > 0) {
            const price = formData.totalAmount / formData.liters;
            setFormData(prev => ({ ...prev, pricePerLiter: Number(price.toFixed(3)) }));
        }
    }, [formData.totalAmount, formData.liters]);

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        
        let finalVehicleId = formData.vehicleId;
        const matchingVehicle = vehicles.find(v => v.plate === vehiclePlate);
        if (matchingVehicle) {
            finalVehicleId = matchingVehicle.id;
        }

        if (!finalVehicleId || !formData.date || !formData.station || formData.totalAmount <= 0 || formData.liters <= 0) {
            showNotification('Preencha os campos obrigatórios corretamente.', 'error');
            return;
        }

        setIsSaving(true);
        try {
            if (editingId) {
                await updateFuelingRecord({ 
                    ...formData, 
                    vehicleId: finalVehicleId,
                    id: editingId, 
                    createdAt: (fuelingRecords || []).find(f => f.id === editingId)?.createdAt || new Date().toISOString() 
                });
                showNotification('Abastecimento atualizado!', 'success');
                setShowAddForm(false);
                resetForm();
            } else {
                await addFuelingRecord({ ...formData, vehicleId: finalVehicleId });
                showNotification('Abastecimento registrado!', 'success');
                resetForm();
                setTimeout(() => {
                    vehicleInputRef.current?.focus();
                }, 100);
            }
        } catch (error) {
            showNotification('Erro ao salvar abastecimento.', 'error');
        } finally {
            setIsSaving(false);
        }
    };

    const resetForm = () => {
        setEditingId(null);
        setFormData({
            vehicleId: '',
            station: '',
            date: todayStr,
            totalAmount: 0,
            liters: 0,
            pricePerLiter: 0,
            km: 0,
            paymentMethod: PaymentMethod.CASH
        });
        setVehiclePlate('');
    };

    const handleEdit = (f: FuelingRecord) => {
        setEditingId(f.id);
        const vehicle = vehicles.find(v => v.id === f.vehicleId);
        setVehiclePlate(vehicle?.plate || '');
        setFormData({
            vehicleId: f.vehicleId,
            date: f.date,
            station: f.station,
            totalAmount: f.totalAmount,
            liters: f.liters,
            pricePerLiter: f.pricePerLiter,
            km: f.km,
            paymentMethod: f.paymentMethod
        });
        setShowAddForm(true);
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    const handleDelete = async (id: string) => {
        if (window.confirm('Tem certeza que deseja excluir este abastecimento?')) {
            await deleteFuelingRecord(id);
            showNotification('Abastecimento excluído.', 'success');
        }
    };

    const handleExportExcel = () => {
        const dataToExport = filteredFueling.map(f => ({
            'Data': new Date(f.date + 'T00:00:00').toLocaleDateString('pt-BR'),
            'Veículo': vehicles.find(v => v.id === f.vehicleId)?.plate || '-',
            'Posto': f.station,
            'Valor Total': f.totalAmount,
            'Litros': f.liters,
            'Preço por Litro': f.pricePerLiter,
            'KM': f.km,
            'Pagamento': f.paymentMethod
        }));
        exportToXLSX(dataToExport, 'Historico_Abastecimento', 'Abastecimento');
    };

    return (
        <div className="space-y-6">
            <Card className="border-none shadow-2xl bg-[#0f172a] overflow-hidden">
                <CardHeader className="border-b border-white/5 pb-6">
                    <div className="space-y-4">
                        <div className="flex flex-wrap items-center justify-between gap-4">
                            <CardTitle className="text-2xl font-black text-white flex items-center gap-3">
                                <div className="p-2 bg-blue-500/20 rounded-lg">
                                    <ICONS.gasPump className="w-6 h-6 text-blue-400" />
                                </div>
                                Controle de Abastecimento
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
                                    <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1">Gasto Total</p>
                                    <p className="text-2xl font-black text-blue-400">{formatCurrency(totalValor)}</p>
                                </div>
                                <div className="w-[1px] h-10 bg-slate-800 hidden sm:block"></div>
                                <div className="min-w-[120px]">
                                    <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1">Total de Litros</p>
                                    <p className="text-2xl font-black text-emerald-400">{totalLitros.toFixed(2)} L</p>
                                </div>
                            </div>
                            
                            <div className="flex gap-2 no-print">
                                <Button variant="secondary" onClick={handleExportExcel}>
                                    <ICONS.printer className="w-4 h-4 mr-2"/>
                                    Excel
                                </Button>
                                <Button onClick={() => { setShowAddForm(!showAddForm); setEditingId(null); if(!showAddForm) resetForm(); }}>
                                    <ICONS.plus className="w-4 h-4 mr-2"/>
                                    {showAddForm ? 'Fechar' : 'Novo Abastecimento'}
                                </Button>
                            </div>
                        </div>
                    </div>
                </CardHeader>

                <CardContent className="pt-6">
                    {showAddForm && (
                        <div className="mb-8 p-6 bg-slate-800/40 rounded-xl border border-blue-500/30 no-print animate-in fade-in slide-in-from-top-4 duration-300">
                             <div className="flex justify-between items-center mb-6">
                                <h3 className="text-lg font-bold text-white flex items-center gap-2">
                                    {editingId ? <ICONS.pencil className="w-5 h-5 text-yellow-400" /> : <ICONS.plus className="w-5 h-5 text-blue-400" />}
                                    {editingId ? 'Editar Abastecimento' : 'Novo Abastecimento'}
                                </h3>
                                <button onClick={() => { setShowAddForm(false); resetForm(); }} className="text-slate-400 hover:text-white transition-colors">
                                    <ICONS.close className="w-5 h-5" />
                                </button>
                            </div>
                            <form onSubmit={handleSave} className="space-y-4">
                                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                                    <div>
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
                                        <AutocompleteInput 
                                            id="station" 
                                            label="Posto" 
                                            value={formData.station} 
                                            onChange={e => setFormData({...formData, station: e.target.value.toUpperCase()})}
                                            suggestions={stationSuggestions}
                                            required
                                        />
                                    </div>
                                    <div>
                                        <Input id="date" label="Data" type="date" value={formData.date} onChange={e => setFormData({...formData, date: e.target.value})} required />
                                    </div>
                                    <div>
                                        <Select id="paymentMethod" label="Forma de Pagamento" value={formData.paymentMethod} onChange={e => setFormData({...formData, paymentMethod: e.target.value})}>
                                            {Object.values(PaymentMethod).map(method => (
                                                <option key={method} value={method}>{method}</option>
                                            ))}
                                        </Select>
                                    </div>
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                                    <div>
                                        <Input id="totalAmount" label="Valor Total (R$)" type="number" step="0.01" value={formData.totalAmount || ''} onChange={e => setFormData({...formData, totalAmount: e.target.valueAsNumber || 0})} required />
                                    </div>
                                    <div>
                                        <Input id="liters" label="Litros" type="number" step="0.001" value={formData.liters || ''} onChange={e => setFormData({...formData, liters: e.target.valueAsNumber || 0})} required />
                                    </div>
                                    <div>
                                        <Input id="pricePerLiter" label="Valor por Litro (R$)" type="number" step="0.001" value={formData.pricePerLiter || ''} readOnly className="bg-slate-900/50" />
                                    </div>
                                    <div>
                                        <Input id="km" label="KM Atual" type="number" value={formData.km || ''} onChange={e => setFormData({...formData, km: e.target.valueAsNumber || 0})} required />
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
                                    <th className="p-4">Posto</th>
                                    <th className="p-4 text-center">KM</th>
                                    <th className="p-4 text-center">Litros</th>
                                    <th className="p-4 text-center">R$ / L</th>
                                    <th className="p-4 text-right">Valor Total</th>
                                    <th className="p-4 text-center no-print">Ações</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-white/5 text-slate-300">
                                {filteredFueling.map(f => (
                                    <tr key={f.id} onDoubleClick={() => handleEdit(f)} className="hover:bg-blue-500/5 transition-colors cursor-pointer group">
                                        <td className="p-4 font-medium">{new Date(f.date + 'T00:00:00').toLocaleDateString('pt-BR')}</td>
                                        <td className="p-4 font-bold text-white">{vehicles.find(v => v.id === f.vehicleId)?.plate || '-'}</td>
                                        <td className="p-4">{f.station}</td>
                                        <td className="p-4 text-center">{f.km.toLocaleString('pt-BR')}</td>
                                        <td className="p-4 text-center font-bold text-emerald-400">{f.liters.toFixed(2)} L</td>
                                        <td className="p-4 text-center text-slate-400">R$ {f.pricePerLiter.toFixed(3)}</td>
                                        <td className="p-4 text-right font-black text-white">{formatCurrency(f.totalAmount)}</td>
                                        <td className="p-4 no-print text-center">
                                            <div className="flex justify-center items-center gap-3">
                                                <button onClick={(e) => { e.stopPropagation(); handleEdit(f); }} className="text-blue-400 hover:text-blue-300 p-1" title="Editar">
                                                    <ICONS.pencil className="w-4 h-4"/>
                                                </button>
                                                <button onClick={(e) => { e.stopPropagation(); handleDelete(f.id); }} className="text-rose-500 hover:text-rose-400 p-1" title="Excluir">
                                                    <ICONS.trash className="w-4 h-4"/>
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                                {filteredFueling.length === 0 && (
                                    <tr>
                                        <td colSpan={8} className="p-10 text-center text-slate-500 uppercase text-xs tracking-widest font-bold">Nenhum registro de abastecimento encontrado</td>
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
