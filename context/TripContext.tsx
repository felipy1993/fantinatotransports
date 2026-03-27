import React, { createContext, useContext, ReactNode, useState, useEffect } from 'react';
import { useNotification } from './NotificationContext';
import { Trip, Driver, Vehicle, FixedExpense, WorkshopExpense, Admin, FinancialEntry, FinancialCategory, SystemConfig, Advance, Maintenance, FuelingRecord } from '../types';
import { dataService } from '../services/dataService';
import { generateSalt, hashPassword } from '../utils/crypto';

// Tipo de entrada para a função addDriver, incluindo a senha em texto plano
type AddDriverInput = Omit<Driver, 'id' | 'status' | 'passwordHash' | 'salt'> & { password: string };
// Tipo de entrada para a função addAdmin, incluindo a senha em texto plano
type AddAdminInput = Omit<Admin, 'id' | 'passwordHash' | 'salt'> & { password: string };

interface TripContextType {
  trips: Trip[];
  drivers: Driver[];
  vehicles: Vehicle[];
  admins: Admin[];
  fixedExpenses: FixedExpense[];
  workshopExpenses: WorkshopExpense[];
  financialEntries: FinancialEntry[];
  financialCategories: FinancialCategory[];
  advances: Advance[];
  maintenance: Maintenance[];
  fuelingRecords: FuelingRecord[];
  systemConfig: SystemConfig | null;
  isLoading: boolean;
  showPaymentModal: boolean;
  setShowPaymentModal: (show: boolean) => void;
  daysToExpiration: number | null;
  addTrip: (trip: Omit<Trip, 'id' | 'createdAt'>) => Promise<void>;
  updateTrip: (trip: Trip) => Promise<void>;
  getTrip: (id: string) => Trip | undefined;
  addDriver: (driver: AddDriverInput) => Promise<void>;
  updateDriver: (driver: Driver) => Promise<void>;
  deleteDriver: (driverId: string) => Promise<void>;
  addVehicle: (vehicle: Omit<Vehicle, 'id' | 'status'>) => Promise<void>;
  updateVehicle: (vehicle: Vehicle) => Promise<void>;
  deleteVehicle: (vehicleId: string) => Promise<void>;
  getDriver: (id: string) => Driver | undefined;
  getVehicle: (id: string) => Vehicle | undefined;
  getAdmin: (id: string) => Admin | undefined;
  addAdmin: (admin: AddAdminInput) => Promise<void>;
  updateAdmin: (admin: Admin) => Promise<void>;
  deleteAdmin: (adminId: string) => Promise<void>;
  addFixedExpense: (expense: Omit<FixedExpense, 'id' | 'createdAt' | 'payments'>) => Promise<void>;
  updateFixedExpense: (expense: FixedExpense) => Promise<void>;
  deleteFixedExpense: (expenseId: string) => Promise<void>;
  addWorkshopExpense: (expense: Omit<WorkshopExpense, 'id' | 'createdAt' | 'payments'>) => Promise<void>;
  updateWorkshopExpense: (expense: WorkshopExpense) => Promise<void>;
  deleteWorkshopExpense: (expenseId: string) => Promise<void>;
  addFinancialEntry: (entry: Omit<FinancialEntry, 'id' | 'createdAt' | 'payments'>) => Promise<void>;
  updateFinancialEntry: (entry: FinancialEntry) => Promise<void>;
  deleteFinancialEntry: (entryId: string) => Promise<void>;
  addFinancialCategory: (name: string) => Promise<void>;
  deleteFinancialCategory: (id: string) => Promise<void>;
  addAdvance: (advance: Omit<Advance, 'id' | 'createdAt'>) => Promise<void>;
  updateAdvance: (advance: Advance) => Promise<void>;
  deleteAdvance: (advanceId: string) => Promise<void>;
  addMaintenance: (maintenance: Omit<Maintenance, 'id' | 'createdAt'>) => Promise<void>;
  updateMaintenance: (maintenance: Maintenance) => Promise<void>;
  deleteMaintenance: (maintenanceId: string) => Promise<void>;
  addFuelingRecord: (fueling: Omit<FuelingRecord, 'id' | 'createdAt'>) => Promise<void>;
  updateFuelingRecord: (fueling: FuelingRecord) => Promise<void>;
  deleteFuelingRecord: (fuelingId: string) => Promise<void>;
}

const TripContext = createContext<TripContextType | undefined>(undefined);

export const TripProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const [trips, setTrips] = useState<Trip[]>([]);
    const [drivers, setDrivers] = useState<Driver[]>([]);
    const [vehicles, setVehicles] = useState<Vehicle[]>([]);
    const [admins, setAdmins] = useState<Admin[]>([]);
    const [fixedExpenses, setFixedExpenses] = useState<FixedExpense[]>([]);
    const [workshopExpenses, setWorkshopExpenses] = useState<WorkshopExpense[]>([]);
    const [financialEntries, setFinancialEntries] = useState<FinancialEntry[]>([]);
    const [financialCategories, setFinancialCategories] = useState<FinancialCategory[]>([]);
    const [advances, setAdvances] = useState<Advance[]>([]);
    const [maintenance, setMaintenance] = useState<Maintenance[]>([]);
    const [fuelingRecords, setFuelingRecords] = useState<FuelingRecord[]>([]);
    const [systemConfig, setSystemConfig] = useState<SystemConfig | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [showPaymentModal, setShowPaymentModal] = useState(false);

    const { showNotification } = useNotification();

    useEffect(() => {
        const fetchAllData = async () => {
            setIsLoading(true);
            try {
                // Primeira Fase: Carregamento Crítico (Rápido)
                const [
                    tripsData,
                    driversData,
                    vehiclesData,
                    adminsData,
                    systemConfigData
                ] = await Promise.all([
                    dataService.list('trips'),
                    dataService.list('drivers'),
                    dataService.list('vehicles'),
                    dataService.list('admins'),
                    dataService.list('system_config').catch(() => [])
                ]);

                setTrips(tripsData as Trip[]);
                setDrivers(driversData as Driver[]);
                setVehicles(vehiclesData as Vehicle[]);
                setAdmins(adminsData as Admin[]);
                
                const configs = systemConfigData as SystemConfig[];
                if (configs && configs.length > 0) {
                    setSystemConfig(configs[0]);
                } else {
                    setSystemConfig({
                        id: 'default',
                        dueDate: '2099-12-31',
                        isPaid: true,
                        amount: 0,
                        pixKey: '(17) 997557625',
                        pixName: 'Felipe Simao da Silva',
                        pixBank: 'Banco do Brasil',
                        whatsappNumber: '17997557625',
                        blockMessage: 'O acesso ao sistema está temporariamente suspenso.',
                        updatedAt: new Date().toISOString()
                    });
                }

                setIsLoading(false);

                // Segunda Fase: Segundo Plano
                Promise.all([
                    dataService.list('fixedExpenses'),
                    dataService.list('workshopExpenses'),
                    dataService.list('financialEntries'),
                    dataService.list('financialCategories'),
                    dataService.list('advances').catch(() => []),
                    dataService.list('maintenance').catch(() => []),
                    dataService.list('fueling_records').catch(() => [])
                ]).then(async ([
                    fe, we, fi, fc, ad, ma, fu
                ]) => {
                    setFixedExpenses(fe as FixedExpense[]);
                    setWorkshopExpenses(we as WorkshopExpense[]);
                    setFinancialEntries(fi as FinancialEntry[]);
                    setFinancialCategories(fc as FinancialCategory[]);
                    setAdvances(ad as Advance[]);
                    setMaintenance(ma as Maintenance[]);
                    setFuelingRecords(fu as FuelingRecord[]);
                }).catch(err => console.error("Background fetch error:", err));

            } catch (error) {
                console.error("Critical fetch error:", error);
                setIsLoading(false);
            }
        };

        fetchAllData();
    }, []);

    const daysToExpiration = React.useMemo(() => {
        if (!systemConfig || systemConfig.isPaid) return null;
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const dueDate = new Date(systemConfig.dueDate + 'T00:00:00');
        const diffTime = dueDate.getTime() - today.getTime();
        return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    }, [systemConfig]);

  const addTrip = async (trip: Omit<Trip, 'id' | 'createdAt'>) => {
    try {
        let monthlyTripNumber = trip.monthlyTripNumber;
        if (!monthlyTripNumber && trip.startDate && trip.driverId) {
            const startDate = new Date(trip.startDate + 'T00:00:00');
            const tripsInMonth = trips.filter(t => {
                if (t.driverId !== trip.driverId || !t.startDate) return false;
                const tDate = new Date(t.startDate + 'T00:00:00');
                return tDate.getFullYear() === startDate.getFullYear() && tDate.getMonth() === startDate.getMonth();
            });
            monthlyTripNumber = tripsInMonth.length + 1;
        }
        const created = await dataService.create('trips', { ...trip, monthlyTripNumber });
        setTrips(prev => [created as Trip, ...prev]);
        showNotification('Viagem adicionada!', 'success');
    } catch (e) {
        showNotification('Erro ao adicionar viagem.', 'error');
    }
  };
  
  const updateTrip = async (updatedTrip: Trip) => {
    try {
        const { id, createdAt, ...data } = updatedTrip;
        const updated = await dataService.update('trips', id, data);
        setTrips(prev => prev.map(t => t.id === id ? updated as Trip : t));
        showNotification('Viagem atualizada!', 'success');
    } catch (e) {
        showNotification('Erro ao atualizar viagem.', 'error');
    }
  };

  const getTrip = (id: string) => trips.find(t => t.id === id);

  const addDriver = async (driver: AddDriverInput) => {
    try {
        if (!driver.password) throw new Error('Senha obrigatória');
        const salt = generateSalt();
        const passwordHash = await hashPassword(driver.password, salt);
        const created = await dataService.create('drivers', {
            ...driver,
            name: driver.name.trim().toUpperCase(),
            status: 'active',
            passwordHash,
            salt
        });
        setDrivers(prev => [created as Driver, ...prev]);
        showNotification('Motorista cadastrado!', 'success');
    } catch (e: any) {
        showNotification(e.message || 'Erro ao cadastrar motorista.', 'error');
    }
  };
  
  const updateDriver = async (updatedDriver: Driver) => {
    try {
        const { id, ...data } = updatedDriver;
        const updated = await dataService.update('drivers', id, data);
        setDrivers(prev => prev.map(d => d.id === id ? updated as Driver : d));
        showNotification('Motorista atualizado!', 'success');
    } catch (e) {
        showNotification('Erro ao atualizar motorista.', 'error');
    }
  };

  const deleteDriver = async (driverId: string) => {
    try {
        await dataService.delete('drivers', driverId);
        setDrivers(prev => prev.filter(d => d.id !== driverId));
        showNotification('Motorista removido.', 'success');
    } catch (e) {
        showNotification('Erro ao remover motorista.', 'error');
    }
  };

  const addVehicle = async (vehicle: Omit<Vehicle, 'id' | 'status'>) => {
    try {
        const created = await dataService.create('vehicles', { ...vehicle, status: 'active' });
        setVehicles(prev => [created as Vehicle, ...prev]);
        showNotification('Veículo cadastrado!', 'success');
    } catch (e) {
        showNotification('Erro ao cadastrar veículo.', 'error');
    }
  };

  const updateVehicle = async (v: Vehicle) => {
    try {
        const { id, ...data } = v;
        const updated = await dataService.update('vehicles', id, data);
        setVehicles(prev => prev.map(item => item.id === id ? updated as Vehicle : item));
        showNotification('Veículo atualizado!', 'success');
    } catch (e) {
        showNotification('Erro ao atualizar veículo.', 'error');
    }
  };

  const deleteVehicle = async (id: string) => {
    try {
        await dataService.delete('vehicles', id);
        setVehicles(prev => prev.filter(v => v.id !== id));
        showNotification('Veículo removido.', 'success');
    } catch (e) {
        showNotification('Erro ao remover veículo.', 'error');
    }
  };

  const getDriver = (id: string) => drivers.find(d => d.id === id);
  const getVehicle = (id: string) => vehicles.find(v => v.id === id);
  
  const addAdmin = async (admin: AddAdminInput) => {
    try {
        const salt = generateSalt();
        const passwordHash = await hashPassword(admin.password, salt);
        const created = await dataService.create('admins', {
            name: admin.name.trim().toUpperCase(),
            passwordHash,
            salt
        });
        setAdmins(prev => [created as Admin, ...prev]);
        showNotification('Admin cadastrado!', 'success');
    } catch (e) {
        showNotification('Erro ao cadastrar admin.', 'error');
    }
  };

  const updateAdmin = async (a: Admin) => {
    try {
        const { id, ...data } = a;
        const updated = await dataService.update('admins', id, data);
        setAdmins(prev => prev.map(item => item.id === id ? updated as Admin : item));
        showNotification('Admin atualizado!', 'success');
    } catch (e) {
        showNotification('Erro ao atualizar admin.', 'error');
    }
  };

  const deleteAdmin = async (id: string) => {
    try {
        await dataService.delete('admins', id);
        setAdmins(prev => prev.filter(a => a.id !== id));
        showNotification('Admin removido.', 'success');
    } catch (e) {
        showNotification('Erro ao remover admin.', 'error');
    }
  };
  
  const getAdmin = (id: string) => admins.find(a => a.id === id);

  const addFixedExpense = async (expense: Omit<FixedExpense, 'id' | 'createdAt' | 'payments'>) => {
    try {
        const created = await dataService.create('fixedExpenses', { ...expense, createdAt: new Date().toISOString(), payments: [] });
        setFixedExpenses(prev => [created as FixedExpense, ...prev]);
        showNotification('Despesa fixa adicionada!', 'success');
    } catch (e) {
        showNotification('Erro ao adicionar despesa.', 'error');
    }
  };

  const updateFixedExpense = async (exp: FixedExpense) => {
    try {
        const { id, ...data } = exp;
        const updated = await dataService.update('fixedExpenses', id, data);
        setFixedExpenses(prev => prev.map(e => e.id === id ? updated as FixedExpense : e));
    } catch (e) {
        showNotification('Erro ao atualizar despesa.', 'error');
    }
  };

  const deleteFixedExpense = async (id: string) => {
    try {
        await dataService.delete('fixedExpenses', id);
        setFixedExpenses(prev => prev.filter(e => e.id !== id));
        showNotification('Despesa removida.', 'success');
    } catch (e) {
        showNotification('Erro ao remover despesa.', 'error');
    }
  };

  const addWorkshopExpense = async (expense: Omit<WorkshopExpense, 'id' | 'createdAt' | 'payments'>) => {
    try {
        const created = await dataService.create('workshopExpenses', { ...expense, createdAt: new Date().toISOString(), payments: [] });
        setWorkshopExpenses(prev => [created as WorkshopExpense, ...prev]);
        showNotification('Despesa de oficina adicionada!', 'success');
    } catch (e) {
        showNotification('Erro ao adicionar despesa.', 'error');
    }
  };

  const updateWorkshopExpense = async (exp: WorkshopExpense) => {
    try {
        const { id, ...data } = exp;
        const updated = await dataService.update('workshopExpenses', id, data);
        setWorkshopExpenses(prev => prev.map(e => e.id === id ? updated as WorkshopExpense : e));
    } catch (e) {
        showNotification('Erro ao atualizar despesa.', 'error');
    }
  };

  const deleteWorkshopExpense = async (id: string) => {
    try {
        await dataService.delete('workshopExpenses', id);
        setWorkshopExpenses(prev => prev.filter(e => e.id !== id));
        showNotification('Despesa removida.', 'success');
    } catch (e) {
        showNotification('Erro ao remover despesa.', 'error');
    }
  };

  const addFinancialEntry = async (entry: Omit<FinancialEntry, 'id' | 'createdAt' | 'payments'>) => {
    try {
        const created = await dataService.create('financialEntries', { ...entry, createdAt: new Date().toISOString(), payments: [] });
        setFinancialEntries(prev => [created as FinancialEntry, ...prev]);
        showNotification('Lançamento realizado!', 'success');
    } catch (e) {
        showNotification('Erro ao realizar lançamento.', 'error');
    }
  };

  const updateFinancialEntry = async (entry: FinancialEntry) => {
    try {
        const { id, ...data } = entry;
        const updated = await dataService.update('financialEntries', id, data);
        setFinancialEntries(prev => prev.map(e => e.id === id ? updated as FinancialEntry : e));
    } catch (e) {
        showNotification('Erro ao atualizar lançamento.', 'error');
    }
  };

  const deleteFinancialEntry = async (id: string) => {
    try {
        await dataService.delete('financialEntries', id);
        setFinancialEntries(prev => prev.filter(e => e.id !== id));
        showNotification('Lançamento removido.', 'success');
    } catch (e) {
        showNotification('Erro ao remover lançamento.', 'error');
    }
  };

  const addFinancialCategory = async (name: string) => {
    try {
        const created = await dataService.create('financialCategories', { name: name.trim().toUpperCase(), createdAt: new Date().toISOString() });
        setFinancialCategories(prev => [...prev, created as FinancialCategory]);
        showNotification('Categoria adicionada!', 'success');
    } catch (e) {
        showNotification('Erro ao adicionar categoria.', 'error');
    }
  };

  const deleteFinancialCategory = async (id: string) => {
    try {
        await dataService.delete('financialCategories', id);
        setFinancialCategories(prev => prev.filter(c => c.id !== id));
        showNotification('Categoria removida.', 'success');
    } catch (e) {
        showNotification('Erro ao remover categoria.', 'error');
    }
  };

  const addAdvance = async (advance: Omit<Advance, 'id' | 'createdAt'>) => {
    try {
        const created = await dataService.create('advances', { ...advance, createdAt: new Date().toISOString() });
        setAdvances(prev => [created as Advance, ...prev]);
        showNotification('Vale registrado!', 'success');
    } catch (e) {
        showNotification('Erro ao registrar vale.', 'error');
    }
  };

  const updateAdvance = async (adv: Advance) => {
    try {
        const { id, ...data } = adv;
        const updated = await dataService.update('advances', id, data);
        setAdvances(prev => prev.map(a => a.id === id ? updated as Advance : a));
    } catch (e) {
        showNotification('Erro ao atualizar vale.', 'error');
    }
  };

  const deleteAdvance = async (id: string) => {
    try {
        await dataService.delete('advances', id);
        setAdvances(prev => prev.filter(a => a.id !== id));
        showNotification('Vale removido.', 'success');
    } catch (e) {
        showNotification('Erro ao remover vale.', 'error');
    }
  };

  const addMaintenance = async (maint: Omit<Maintenance, 'id' | 'createdAt'>) => {
    try {
        const created = await dataService.create('maintenance', { ...maint, createdAt: new Date().toISOString() });
        setMaintenance(prev => [created as Maintenance, ...prev]);
        showNotification('Manutenção registrada!', 'success');
    } catch (e) {
        showNotification('Erro ao registrar manutenção.', 'error');
    }
  };

  const updateMaintenance = async (m: Maintenance) => {
    try {
        const { id, ...data } = m;
        const updated = await dataService.update('maintenance', id, data);
        setMaintenance(prev => prev.map(item => item.id === id ? updated as Maintenance : item));
    } catch (e) {
        showNotification('Erro ao atualizar manutenção.', 'error');
    }
  };

  const deleteMaintenance = async (id: string) => {
    try {
        await dataService.delete('maintenance', id);
        setMaintenance(prev => prev.filter(m => m.id !== id));
        showNotification('Manutenção removida.', 'success');
    } catch (e) {
        showNotification('Erro ao remover manutenção.', 'error');
    }
  };

  const addFuelingRecord = async (fuel: Omit<FuelingRecord, 'id' | 'createdAt'>) => {
    try {
        const created = await dataService.create('fueling_records', { ...fuel, createdAt: new Date().toISOString() });
        setFuelingRecords(prev => [created as FuelingRecord, ...prev]);
        showNotification('Abastecimento registrado!', 'success');
    } catch (e) {
        showNotification('Erro ao registrar abastecimento.', 'error');
    }
  };

  const updateFuelingRecord = async (f: FuelingRecord) => {
    try {
        const { id, ...data } = f;
        const updated = await dataService.update('fueling_records', id, data);
        setFuelingRecords(prev => prev.map(item => item.id === id ? updated as FuelingRecord : item));
    } catch (e) {
        showNotification('Erro ao atualizar abastecimento.', 'error');
    }
  };

  const deleteFuelingRecord = async (id: string) => {
    try {
        await dataService.delete('fueling_records', id);
        setFuelingRecords(prev => prev.filter(f => f.id !== id));
        showNotification('Abastecimento removido.', 'success');
    } catch (e) {
        showNotification('Erro ao remover abastecimento.', 'error');
    }
  };

  return (
    <TripContext.Provider value={{ 
        trips, drivers, vehicles, admins, fixedExpenses, workshopExpenses, isLoading,
        addTrip, updateTrip, getTrip, 
        addDriver, updateDriver, deleteDriver,
        addVehicle, updateVehicle, deleteVehicle,
        getDriver, getVehicle,
        getAdmin, addAdmin, updateAdmin, deleteAdmin,
        addFixedExpense, updateFixedExpense, deleteFixedExpense,
        addWorkshopExpense, updateWorkshopExpense, deleteWorkshopExpense,
        financialEntries, financialCategories,
        addFinancialEntry, updateFinancialEntry, deleteFinancialEntry,
        addFinancialCategory, deleteFinancialCategory,
        advances, addAdvance, updateAdvance, deleteAdvance,
        maintenance, addMaintenance, updateMaintenance, deleteMaintenance,
        fuelingRecords, addFuelingRecord, updateFuelingRecord, deleteFuelingRecord,
        systemConfig,
        showPaymentModal, setShowPaymentModal,
        daysToExpiration
     }}>
      {children}
    </TripContext.Provider>
  );
};

export const useTrips = () => {
  const context = useContext(TripContext);
  if (context === undefined) {
    throw new Error('useTrips must be used within a TripProvider');
  }
  return context;
};
