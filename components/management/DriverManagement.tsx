
import React, { useState, useEffect } from 'react';
import { useTrips } from '../../context/TripContext';
import { useSession } from '../../context/SessionContext';
import { useNotification } from '../../context/NotificationContext';
import { Button } from '../ui/Button';
import { Card, CardHeader, CardTitle, CardContent } from '../ui/Card';
import { Input } from '../ui/Input';
import { ICONS } from '../../constants';
import { Driver } from '../../types';

const DriverRow: React.FC<{ driver: Driver }> = ({ driver }) => {
    const { trips, updateDriver, deleteDriver } = useTrips();
    const { session, changePassword } = useSession();
    const { showNotification } = useNotification();

    const [isEditing, setIsEditing] = useState(false);
    const [driverData, setDriverData] = useState(driver);
    const [isSaving, setIsSaving] = useState(false);
    const [showPasswordModal, setShowPasswordModal] = useState(false);
    const [newPassword, setNewPassword] = useState('');
    const [isChangingPassword, setIsChangingPassword] = useState(false);
    
    const isFelipe = session.user?.name.startsWith('FELIPE');

    useEffect(() => {
        setDriverData(driver);
    }, [driver]);

    const isDeletable = !trips.some(trip => trip.driverId === driver.id);

    const handleToggleStatus = async () => {
        await updateDriver({ ...driver, status: driver.status === 'active' ? 'inactive' : 'active' });
    };

    const handleSave = async () => {
        setIsSaving(true);
        await updateDriver(driverData);
        setIsSaving(false);
        setIsEditing(false);
    };

    const handleDelete = async () => {
        if (!isFelipe) {
            showNotification('Apenas o administrador mestre (FELIPE) pode excluir motoristas.', 'error');
            return;
        }

        if (isDeletable && window.confirm(`Tem certeza que deseja excluir ${driver.name}? Esta ação não pode ser desfeita.`)) {
            await deleteDriver(driver.id);
        }
    };

    const handleResetPassword = () => {
        setNewPassword('');
        setShowPasswordModal(true);
    };

    const handleConfirmPasswordChange = async () => {
        if (!newPassword || newPassword.trim().length < 6) {
            showNotification('A senha deve ter pelo menos 6 caracteres.', 'error');
            return;
        }
        
        setIsChangingPassword(true);
        const result = await changePassword(driver.id, 'driver', newPassword.trim());
        setIsChangingPassword(false);
        
        showNotification(result.message, result.success ? 'success' : 'error');
        
        if (result.success) {
            setShowPasswordModal(false);
            setNewPassword('');
        }
    };

    if (isEditing) {
        return (
            <div className="bg-slate-700 p-4 rounded-md space-y-3">
                <Input id={`name-${driver.id}`} label="Nome" value={driverData.name} onChange={e => setDriverData(d => ({ ...d, name: e.target.value.toUpperCase() }))} />
                <Input id={`cnh-${driver.id}`} label="CNH (Opcional)" value={driverData.cnh} onChange={e => setDriverData(d => ({ ...d, cnh: e.target.value.toUpperCase() }))} />
                <Input id={`phone-${driver.id}`} label="Telefone" value={driverData.phone} onChange={e => setDriverData(d => ({ ...d, phone: e.target.value }))} />
                <Input id={`dailyRate-${driver.id}`} label="Valor da Diária (R$)" type="number" step="0.01" value={driverData.dailyRate || ''} onChange={e => setDriverData(d => ({ ...d, dailyRate: e.target.valueAsNumber || 0 }))} />
                <div className="flex gap-2 justify-end mt-2">
                    <Button variant="secondary" onClick={handleResetPassword}>Resetar Senha</Button>
                    <Button variant="secondary" onClick={() => setIsEditing(false)}>Cancelar</Button>
                    <Button onClick={handleSave} disabled={isSaving}>{isSaving ? 'Salvando...' : 'Salvar Alterações'}</Button>
                </div>
            </div>
        );
    }

    return (
        <>
            <div className={`bg-slate-700 p-4 rounded-md flex flex-col md:flex-row justify-between items-start md:items-center gap-3 transition-opacity ${driver.status === 'inactive' ? 'opacity-50' : ''}`}>
                <div>
                    <p className="font-semibold text-white flex items-center gap-2">
                        {driver.name}
                        <span className={`px-2 py-0.5 text-xs font-semibold rounded-full ${driver.status === 'active' ? 'bg-green-500 text-white' : 'bg-slate-500 text-white'}`}>
                            {driver.status === 'active' ? 'Ativo' : 'Inativo'}
                        </span>
                    </p>
                    <p className="text-sm text-slate-400">
                        CNH: {driver.cnh || 'Não informado'} | Tel: {driver.phone} 
                        {driver.dailyRate ? ` | Diária: R$ ${driver.dailyRate.toFixed(2)}` : ''}
                    </p>
                </div>
                <div className="flex flex-wrap gap-2 mt-3 md:mt-0 justify-start md:justify-end">
                    <Button variant="secondary" onClick={() => setIsEditing(true)}>Editar</Button>
                    <Button variant="secondary" onClick={handleResetPassword}>
                        <ICONS.lock className="w-4 h-4 mr-1" />
                        Alterar Senha
                    </Button>
                    <Button 
                        variant={driver.status === 'active' ? 'secondary' : 'primary'} 
                        onClick={handleToggleStatus}
                        title="Alterar status"
                    >
                        {driver.status === 'active' ? 'Inativar' : 'Ativar'}
                    </Button>
                    <Button 
                        variant="danger" 
                        onClick={handleDelete} 
                        disabled={!isDeletable || !isFelipe} 
                        title={
                            !isFelipe ? "Apenas o administrador mestre pode excluir motoristas." :
                            !isDeletable ? "Motorista não pode ser excluído pois está associado a viagens." : 
                            "Excluir motorista"
                        }
                    >
                        Excluir
                    </Button>
                </div>
            </div>

            {showPasswordModal && (
                <div className="mt-4 p-4 bg-slate-800 rounded-md border border-blue-500/30 animate-in fade-in slide-in-from-top-2 duration-200">
                    <div className="flex justify-between items-center mb-3">
                        <p className="text-white font-semibold text-sm flex items-center gap-2">
                            <ICONS.lock className="w-4 h-4 text-blue-400" />
                            Nova Senha para {driver.name}
                        </p>
                        <button onClick={() => { setShowPasswordModal(false); setNewPassword(''); }} className="text-slate-400 hover:text-white">
                            <ICONS.close className="w-4 h-4" />
                        </button>
                    </div>
                    <div className="space-y-4">
                        <Input
                            id={`new-password-${driver.id}`}
                            label="Nova Senha"
                            type="password"
                            value={newPassword}
                            onChange={(e) => setNewPassword(e.target.value)}
                            minLength={6}
                            placeholder="Digite a nova senha (mín. 6 caracteres)"
                            autoFocus
                        />
                        <div className="flex gap-2 justify-end">
                            <Button
                                variant="secondary"
                                onClick={() => {
                                    setShowPasswordModal(false);
                                    setNewPassword('');
                                }}
                                disabled={isChangingPassword}
                            >
                                Cancelar
                            </Button>
                            <Button
                                onClick={handleConfirmPasswordChange}
                                disabled={isChangingPassword || !newPassword || newPassword.length < 6}
                            >
                                {isChangingPassword ? 'Alterando...' : 'Confirmar Alteração'}
                            </Button>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
};


export const DriverManagement: React.FC = () => {
  const { drivers, addDriver } = useTrips();
  const { session } = useSession();
  const { showNotification } = useNotification();
  const [name, setName] = useState('');
  const [cnh, setCnh] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [dailyRate, setDailyRate] = useState<number>(0);
  const [isLoading, setIsLoading] = useState(false);
  
  const isFelipe = session.user?.name.startsWith('FELIPE');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (name && phone && password) {
      setIsLoading(true);
      await addDriver({ name, cnh, phone, password, dailyRate });
      setName('');
      setCnh('');
      setPhone('');
      setPassword('');
      setDailyRate(0);
      setIsLoading(false);
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <div className="lg:col-span-1">
        <Card>
          <CardHeader>
            <CardTitle>Adicionar Motorista</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <Input
                id="driverName"
                label="Nome Completo"
                value={name}
                onChange={(e) => setName(e.target.value.toUpperCase())}
                required
              />
              <Input
                id="driverCnh"
                label="CNH (Opcional)"
                value={cnh}
                onChange={(e) => setCnh(e.target.value.toUpperCase())}
              />
              <Input
                id="driverPhone"
                label="Telefone"
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                required
              />
              <Input
                id="driverPassword"
                label="Senha Provisória"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={6}
              />
              <Input
                id="driverDailyRate"
                label="Valor da Diária Padrão (R$)"
                type="number"
                step="0.01"
                value={dailyRate || ''}
                onChange={(e) => setDailyRate(e.target.valueAsNumber || 0)}
              />
               <Button 
                type="submit" 
                className="w-full" 
                disabled={isLoading}
                title="Adicionar motorista"
              >
                {isLoading ? (
                    'Adicionando...'
                ) : (
                    <>
                        <ICONS.plus className="w-5 h-5 mr-2" />
                        Adicionar
                    </>
                )}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
      <div className="lg:col-span-2">
        <Card>
          <CardHeader>
            <CardTitle>Motoristas Cadastrados</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {drivers.length > 0 ? (
                [...drivers].sort((a, b) => a.name.localeCompare(b.name)).map((driver) => (
                  <DriverRow key={driver.id} driver={driver} />
                ))
              ) : (
                <p className="text-slate-400 text-center py-4">Nenhum motorista cadastrado.</p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};
