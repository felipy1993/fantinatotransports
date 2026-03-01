import React, { useState, useMemo } from 'react';
import { useTrips } from '../../context/TripContext';
import { useNotification } from '../../context/NotificationContext';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { Select } from '../ui/Select';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/Card';
import { Tooltip } from '../ui/Tooltip';
import { ICONS } from '../../constants';
import { FinancialEntry, FinancialCategory } from '../../types';

interface FinancialItem extends FinancialEntry {
    status: 'Vencida' | 'Pendente' | 'Pago';
    amountPaid: number;
}

export const FinancialManagement: React.FC = () => {
    const { 
        financialEntries, 
        financialCategories, 
        addFinancialEntry, 
        updateFinancialEntry, 
        deleteFinancialEntry,
        addFinancialCategory,
        deleteFinancialCategory
    } = useTrips();
    
    const { showNotification } = useNotification();
    
    const [showAddForm, setShowAddForm] = useState(false);
    const [showCategoryForm, setShowCategoryForm] = useState(false);
    const [newCategoryName, setNewCategoryName] = useState('');
    
    const [formData, setFormData] = useState({
        description: '',
        categoryId: '',
        amount: '',
        dueDate: '',
    });

    const [editingId, setEditingId] = useState<string | null>(null);
    const [editFormData, setEditFormData] = useState({
        description: '',
        categoryId: '',
        amount: '',
        dueDate: '',
    });

    const categories = useMemo(() => {
        return [...financialCategories].sort((a, b) => a.name.localeCompare(b.name));
    }, [financialCategories]);

    const allItems = useMemo((): FinancialItem[] => {
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        return financialEntries.map(entry => {
            const amountPaid = (entry.payments || []).reduce((sum, p) => sum + p.amount, 0);
            const isPaid = amountPaid >= entry.amount;
            
            let status: 'Vencida' | 'Pendente' | 'Pago' = 'Pendente';
            
            if (isPaid) {
                status = 'Pago';
            } else {
                const dueDate = new Date(entry.dueDate + 'T00:00:00');
                if (dueDate < today) {
                    status = 'Vencida';
                } else {
                    status = 'Pendente';
                }
            }

            return {
                ...entry,
                status,
                amountPaid
            };
        }).sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime());
    }, [financialEntries]);

    const handleAddCategory = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newCategoryName.trim()) return;
        
        try {
            await addFinancialCategory(newCategoryName);
            setNewCategoryName('');
            showNotification('Categoria adicionada com sucesso!', 'success');
        } catch (error) {
            showNotification('Erro ao adicionar categoria.', 'error');
        }
    };

    const handleAddEntry = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!formData.description || !formData.categoryId || !formData.amount || !formData.dueDate) {
            showNotification('Por favor, preencha todos os campos.', 'error');
            return;
        }

        try {
            await addFinancialEntry({
                description: formData.description.toUpperCase(),
                categoryId: formData.categoryId,
                amount: Number(formData.amount),
                dueDate: formData.dueDate,
            });
            
            setFormData({ description: '', categoryId: '', amount: '', dueDate: '' });
            setShowAddForm(false);
            showNotification('Lançamento adicionado com sucesso!', 'success');
        } catch (error) {
            showNotification('Erro ao adicionar lançamento.', 'error');
        }
    };

    const handleEditEntry = (item: FinancialItem) => {
        setEditingId(item.id);
        setEditFormData({
            description: item.description,
            categoryId: item.categoryId,
            amount: item.amount.toString(),
            dueDate: item.dueDate,
        });
        
        setTimeout(() => {
            document.getElementById(`edit-form-${item.id}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }, 100);
    };

    const handleSaveEdit = async (id: string) => {
        try {
            const original = financialEntries.find(e => e.id === id);
            if (!original) return;

            await updateFinancialEntry({
                ...original,
                description: editFormData.description.toUpperCase(),
                categoryId: editFormData.categoryId,
                amount: Number(editFormData.amount),
                dueDate: editFormData.dueDate,
            });

            setEditingId(null);
            showNotification('Lançamento atualizado com sucesso!', 'success');
        } catch (error) {
            showNotification('Erro ao atualizar lançamento.', 'error');
        }
    };

    const handleDeleteEntry = async (id: string) => {
        if (!window.confirm('Tem certeza que deseja excluir este lançamento?')) return;
        try {
            await deleteFinancialEntry(id);
            showNotification('Lançamento excluído com sucesso!', 'success');
        } catch (error: any) {
            showNotification('Erro ao excluir lançamento.', 'error');
            alert('Erro detalhado excluir: ' + error?.message);
        }
    };

    const handlePay = async (item: FinancialItem) => {
        const remaining = Number(item.amount || 0) - item.amountPaid;
        if (remaining <= 0) return;

        if (!window.confirm(`Confirmar pagamento de ${remaining.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}?`)) return;

        try {
            const updatedEntry = {
                ...item,
                payments: [
                    ...(item.payments || []),
                    {
                        date: new Date().toISOString().split('T')[0],
                        amount: remaining,
                        recordedBy: 'ADMIN'
                    }
                ]
            };
            
            const { status, amountPaid, ...cleanEntry } = updatedEntry as any;
            await updateFinancialEntry(cleanEntry);
            showNotification('Pagamento registrado com sucesso!', 'success');
        } catch (error: any) {
            showNotification('Erro ao registrar pagamento.', 'error');
            alert('Erro detalhado pagar: ' + error?.message);
        }
    };

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'Vencida': return 'bg-red-500/20 text-red-500 border-red-500/50';
            case 'Pendente': return 'bg-yellow-500/20 text-yellow-500 border-yellow-500/50';
            case 'Pago': return 'bg-green-500/20 text-green-500 border-green-500/50';
            default: return 'bg-slate-500/20 text-slate-500 border-slate-500/50';
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <h1 className="text-2xl font-bold text-white">Financeiro Geral</h1>
                <div className="flex gap-2">
                    <Button onClick={() => setShowCategoryForm(!showCategoryForm)} variant="secondary">
                        <ICONS.plus className="w-4 h-4 mr-2" />
                        Categorias
                    </Button>
                    <Button onClick={() => setShowAddForm(!showAddForm)}>
                        {showAddForm ? 'Cancelar' : 'Novo Lançamento'}
                    </Button>
                </div>
            </div>

            {showCategoryForm && (
                <Card className="animate-in fade-in slide-in-from-top-4">
                    <CardHeader>
                        <CardTitle>Gerenciar Categorias</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="flex flex-col gap-4">
                            <form onSubmit={handleAddCategory} className="flex flex-col gap-2">
                                <label className="text-xs font-semibold text-slate-400">NOME DA CATEGORIA</label>
                                <div className="flex gap-2">
                                    <Input
                                        id="new-cat-name"
                                        label=""
                                        placeholder="Digite o nome..."
                                        value={newCategoryName}
                                        onChange={e => setNewCategoryName(e.target.value)}
                                        className="flex-1"
                                    />
                                    <Button type="submit">Adicionar</Button>
                                </div>
                            </form>
                            <div className="flex flex-wrap gap-2 pt-2 border-t border-slate-700">
                                {categories.map(cat => (
                                    <div key={cat.id} className="bg-slate-700 px-3 py-1 rounded-full flex items-center gap-2 group">
                                        <span className="text-sm text-white">{cat.name}</span>
                                        <button 
                                            onClick={() => deleteFinancialCategory(cat.id)}
                                            className="text-slate-400 hover:text-red-400 transition-colors"
                                        >
                                            <ICONS.close className="w-3 h-3" />
                                        </button>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </CardContent>
                </Card>
            )}

            {showAddForm && (
                <Card className="animate-in fade-in slide-in-from-top-4">
                    <CardHeader>
                        <CardTitle>Novo Lançamento</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <form onSubmit={handleAddEntry} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                            <Input
                                id="desc"
                                label="Descrição"
                                placeholder="Ex: Aluguel da Sede"
                                value={formData.description}
                                onChange={e => setFormData({ ...formData, description: e.target.value })}
                            />
                            <Select
                                id="cat"
                                label="Categoria"
                                value={formData.categoryId}
                                onChange={e => setFormData({ ...formData, categoryId: e.target.value })}
                            >
                                <option value="">Selecione...</option>
                                {categories.map(cat => (
                                    <option key={cat.id} value={cat.id}>{cat.name}</option>
                                ))}
                            </Select>
                            <Input
                                id="amount"
                                label="Valor"
                                type="number"
                                placeholder="0,00"
                                value={formData.amount}
                                onChange={e => setFormData({ ...formData, amount: e.target.value })}
                            />
                            <Input
                                id="dueDate"
                                label="Vencimento"
                                type="date"
                                value={formData.dueDate}
                                onChange={e => setFormData({ ...formData, dueDate: e.target.value })}
                            />
                            <div className="md:col-span-2 lg:col-span-4 flex justify-end pt-2">
                                <Button type="submit">Salvar Lançamento</Button>
                            </div>
                        </form>
                    </CardContent>
                </Card>
            )}

            <Card>
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-slate-800/50">
                                <th className="p-4 text-xs font-semibold text-slate-400 uppercase tracking-wider">Vencimento</th>
                                <th className="p-4 text-xs font-semibold text-slate-400 uppercase tracking-wider">Descrição</th>
                                <th className="p-4 text-xs font-semibold text-slate-400 uppercase tracking-wider">Categoria</th>
                                <th className="p-4 text-xs font-semibold text-slate-400 uppercase tracking-wider text-right">Valor</th>
                                <th className="p-4 text-xs font-semibold text-slate-400 uppercase tracking-wider text-center">Status</th>
                                <th className="p-4 text-xs font-semibold text-slate-400 uppercase tracking-wider text-right no-print">Ações</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-700/50">
                            {allItems.length === 0 ? (
                                <tr>
                                    <td colSpan={6} className="p-8 text-center text-slate-500 italic">Nenhum lançamento encontrado.</td>
                                </tr>
                            ) : (
                                allItems.map(item => (
                                    <React.Fragment key={item.id}>
                                        <tr className="hover:bg-slate-800/30 transition-colors group">
                                            <td className="p-4">
                                                <span className="text-white font-medium">
                                                    {new Date(item.dueDate + 'T00:00:00').toLocaleDateString('pt-BR')}
                                                </span>
                                            </td>
                                            <td className="p-4 text-white font-medium">{item.description}</td>
                                            <td className="p-4 text-slate-400 text-sm">
                                                {categories.find(c => c.id === item.categoryId)?.name || 'N/A'}
                                            </td>
                                            <td className="p-4 text-right text-white font-bold">
                                                {Number(item.amount || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                                            </td>
                                            <td className="p-4 text-center">
                                                <span className={`px-2 py-1 rounded text-[10px] font-bold border ${getStatusColor(item.status)}`}>
                                                    {item.status.toUpperCase()}
                                                </span>
                                            </td>
                                            <td className="p-4 text-right no-print">
                                                <div className="flex justify-end gap-2">
                                                    {item.status !== 'Pago' && (
                                                        <Tooltip text="Pagar">
                                                            <button onClick={() => handlePay(item)} className="p-1.5 text-green-400 hover:bg-green-400/10 rounded-md transition-colors">
                                                                <ICONS.check className="w-4 h-4" />
                                                            </button>
                                                        </Tooltip>
                                                    )}
                                                    <Tooltip text="Editar">
                                                        <button onClick={() => handleEditEntry(item)} className="p-1.5 text-blue-400 hover:bg-blue-400/10 rounded-md transition-colors">
                                                            <ICONS.pencil className="w-4 h-4" />
                                                        </button>
                                                    </Tooltip>
                                                    <Tooltip text="Excluir">
                                                        <button onClick={() => handleDeleteEntry(item.id)} className="p-1.5 text-red-400 hover:bg-red-400/10 rounded-md transition-colors">
                                                            <ICONS.trash className="w-4 h-4" />
                                                        </button>
                                                    </Tooltip>
                                                </div>
                                            </td>
                                        </tr>
                                        {editingId === item.id && (
                                            <tr id={`edit-form-${item.id}`} className="bg-slate-800/80 animate-in fade-in zoom-in-95">
                                                <td colSpan={6} className="p-6">
                                                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                                                        <Input
                                                            id={`edit-due-${item.id}`}
                                                            label="Vencimento"
                                                            type="date"
                                                            value={editFormData.dueDate}
                                                            onChange={e => setEditFormData({ ...editFormData, dueDate: e.target.value })}
                                                        />
                                                        <Input
                                                            id={`edit-desc-${item.id}`}
                                                            label="Descrição"
                                                            value={editFormData.description}
                                                            onChange={e => setEditFormData({ ...editFormData, description: e.target.value })}
                                                        />
                                                        <Select
                                                            id={`edit-cat-${item.id}`}
                                                            label="Categoria"
                                                            value={editFormData.categoryId}
                                                            onChange={e => setEditFormData({ ...editFormData, categoryId: e.target.value })}
                                                        >
                                                            {categories.map(cat => (
                                                                <option key={cat.id} value={cat.id}>{cat.name}</option>
                                                            ))}
                                                        </Select>
                                                        <Input
                                                            id={`edit-amount-${item.id}`}
                                                            label="Valor"
                                                            type="number"
                                                            value={editFormData.amount}
                                                            onChange={e => setEditFormData({ ...editFormData, amount: e.target.value })}
                                                        />
                                                        <div className="md:col-span-4 flex justify-end gap-2 mt-4">
                                                            <Button onClick={() => setEditingId(null)} variant="secondary">
                                                                Cancelar
                                                            </Button>
                                                            <Button onClick={() => handleSaveEdit(item.id)}>
                                                                Salvar Alterações
                                                            </Button>
                                                        </div>
                                                    </div>
                                                </td>
                                            </tr>
                                        )}
                                    </React.Fragment>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </Card>
        </div>
    );
};
