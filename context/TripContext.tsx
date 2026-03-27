import React, { createContext, useContext, ReactNode, useState, useEffect } from 'react';
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

    useEffect(() => {
        const fetchAllData = async () => {
            setIsLoading(true);
            try {
                // Primeira Fase: Carregamento Crítico (Rápido) para liberar a tela inicial
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
                    dataService.list('system_config').catch(() => []) // Handle missing collection gracefully
                ]);

                setTrips(tripsData as Trip[]);
                setDrivers(driversData as Driver[]);
                setVehicles(vehiclesData as Vehicle[]);
                setAdmins(adminsData as Admin[]);
                
                // systemConfig is expected to be a single record or empty
                const configs = systemConfigData as SystemConfig[];
                if (configs && configs.length > 0) {
                    setSystemConfig(configs[0]);
                } else {
                    // Default fallback if no config exists - system is "free" by default until configured
                    setSystemConfig({
                        id: 'default',
                        dueDate: '2099-12-31',
                        isPaid: true,
                        amount: 0,
                        pixKey: '(17) 997557625',
                        pixName: 'Felipe Simao da Silva',
                        pixBank: 'Banco do Brasil',
                        whatsappNumber: '17997557625',
                        blockMessage: 'O acesso ao sistema está temporariamente suspenso. Por favor, entre em contato com o administrador para regularizar sua situação.',
                        updatedAt: new Date().toISOString()
                    });
                }

                // Liberar a tela inicial pro usuário IMEDIATAMENTE!
                setIsLoading(false);

                // Segunda Fase: Carregamento em Segundo Plano
                Promise.all([
                    dataService.list('fixedExpenses'),
                    dataService.list('workshopExpenses'),
                    dataService.list('financialEntries'),
                    dataService.list('financialCategories'),
                    dataService.list('advances').catch(() => []),
                    dataService.list('maintenance').catch(() => []),
                    dataService.list('fueling_records').catch(() => [])
                ]).then(async ([
                    fixedExpensesData,
                    workshopExpensesData,
                    financialEntriesData,
                    financialCategoriesData,
                    advancesData,
                    maintenanceData,
                    fuelingData
                ]) => {
                    setFixedExpenses(fixedExpensesData as FixedExpense[]);
                    setWorkshopExpenses(workshopExpensesData as WorkshopExpense[]);
                    setFinancialEntries(financialEntriesData as FinancialEntry[]);
                    setFinancialCategories(financialCategoriesData as FinancialCategory[]);
                    setAdvances(advancesData as Advance[]);
                    setMaintenance(maintenanceData as Maintenance[]);
                    setFuelingRecords(fuelingData as FuelingRecord[]);

                    // Seed logic for financialCategories (if enabled)
                    const shouldSeed = (window as any).__ENABLE_SEED__ === true;
                    if (shouldSeed && financialCategoriesData.length === 0) {
                        const baseCats = ['DESPESAS FIXAS', 'FORNECEDOR', 'IMPOSTO', 'SALARIO', 'OUTRO'];
                        const createdCats = [];
                        for (const cat of baseCats) {
                            const newCat = await dataService.create('financialCategories', { name: cat, createdAt: new Date().toISOString() });
                            createdCats.push(newCat as FinancialCategory);
                        }
                        setFinancialCategories(createdCats);
                    }
                }).catch(error => console.error("Error fetching background data:", error));

                // Seed logic (if enabled) for critical data
                const shouldSeed = (window as any).__ENABLE_SEED__ === true;
                if (shouldSeed) {
                    if (adminsData.length === 0) {
                        console.log("No admins found, creating initial admin 'FELIPE'...");
                        const salt = generateSalt();
                        const passwordHash = await hashPassword('123451', salt);
                        const newAdmin = await dataService.create('admins', { name: 'FELIPE', passwordHash, salt });
                        setAdmins([newAdmin as Admin]);
                    }

                    if (driversData.length === 0) {
                        console.log("No drivers found, creating initial driver 'PAULO'...");
                        const salt = generateSalt();
                        const passwordHash = await hashPassword('123451', salt);
                        const newDriver = await dataService.create('drivers', { 
                            name: 'PAULO', 
                            cnh: '111222333', 
                            phone: '11999998888', 
                            status: 'active', 
                            passwordHash, 
                            salt 
                        });
                        setDrivers([newDriver as Driver]);
                    }

                    if (configs.length === 0) {
                        console.log("No system_config found, creating default...");
                        const defaultConfig = {
                            dueDate: '2099-12-31',
                            isPaid: true,
                            amount: 0,
                            pixKey: '(17) 997557625',
                            pixName: 'Felipe Simao da Silva',
                            pixBank: 'Banco do Brasil',
                            whatsappNumber: '17997557625',
                            blockMessage: 'O acesso ao sistema está temporariamente suspenso. Por favor, entre em contato com o administrador para regularizar sua situação.',
                        };
                        const created = await dataService.create('system_config', defaultConfig);
                        setSystemConfig(created as SystemConfig);
                    }
                }
            } catch (error) {
                console.error("Error fetching critical data:", error);
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
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        
        return diffDays;
    }, [systemConfig]);

  const addTrip = async (trip: Omit<Trip, 'id' | 'createdAt'>) => {
    let monthlyTripNumber = trip.monthlyTripNumber;
    
    // Only calculate monthly trip number if it wasn't provided (e.g., brand new trip)
    if (!monthlyTripNumber && trip.startDate && trip.driverId) {
        const startDate = new Date(trip.startDate + 'T00:00:00');
        const year = startDate.getFullYear();
        const month = startDate.getMonth();
        
        const tripsInMonthForDriver = trips.filter(t => {
            if (t.driverId !== trip.driverId) return false;
            if (!t.startDate) return false;
            const tDate = new Date(t.startDate + 'T00:00:00');
            return tDate.getFullYear() === year && tDate.getMonth() === month;
        });

        monthlyTripNumber = tripsInMonthForDriver.length + 1;
    }
    
    const newTrip = {
      ...trip,
      monthlyTripNumber,
    };
    const created = await dataService.create('trips', newTrip);
    setTrips(prev => [created as Trip, ...prev]);
  };
  
  const updateTrip = async (updatedTrip: Trip) => {
    const { id, createdAt, ...tripData } = updatedTrip;
    const updated = await dataService.update('trips', id, tripData);
    setTrips(prev => prev.map(t => t.id === id ? updated as Trip : t));
  };

  const getTrip = (id: string) => trips.find(t => t.id === id);

  const addDriver = async (driver: AddDriverInput) => {
    if ((driver.password || '').trim().length === 0) {
        throw new Error('A senha não pode ser vazia.');
    }
    const salt = generateSalt();
    const passwordHash = await hashPassword(driver.password, salt);
    const newDriver = { 
        name: (driver.name || '').trim().toUpperCase(),
        cnh: driver.cnh,
        phone: driver.phone,
        status: 'active',
        passwordHash,
        salt,
        dailyRate: driver.dailyRate,
    };
    const created = await dataService.create('drivers', newDriver);
    setDrivers(prev => [created as Driver, ...prev]);
  };
  
  const updateDriver = async (updatedDriver: Driver) => {
    const { id, ...driverData } = updatedDriver;
    const updated = await dataService.update('drivers', id, driverData);
    setDrivers(prev => prev.map(d => d.id === id ? updated as Driver : d));
  };

  const deleteDriver = async (driverId: string) => {
    await dataService.delete('drivers', driverId);
    setDrivers(prev => prev.filter(d => d.id !== driverId));
  };

  const addVehicle = async (vehicle: Omit<Vehicle, 'id' | 'status'>) => {
    const newVehicle = { ...vehicle, status: 'active' };
    const created = await dataService.create('vehicles', newVehicle);
    setVehicles(prev => [created as Vehicle, ...prev]);
  };
  
  const updateVehicle = async (updatedVehicle: Vehicle) => {
    const { id, ...vehicleData } = updatedVehicle;
    const updated = await dataService.update('vehicles', id, vehicleData);
    setVehicles(prev => prev.map(v => v.id === id ? updated as Vehicle : v));
  };

  const deleteVehicle = async (vehicleId: string) => {
    await dataService.delete('vehicles', vehicleId);
    setVehicles(prev => prev.filter(v => v.id !== vehicleId));
  };
  
  const getDriver = (id: string) => drivers.find(d => d.id === id);
  const getVehicle = (id: string) => vehicles.find(v => v.id === id);
  
  const addAdmin = async (admin: AddAdminInput) => {
    if ((admin.password || '').trim().length === 0) {
        throw new Error('A senha não pode ser vazia.');
    }
    const salt = generateSalt();
    const passwordHash = await hashPassword(admin.password, salt);
    const newAdmin = { 
        name: (admin.name || '').trim().toUpperCase(),
        passwordHash,
        salt,
    };
    const created = await dataService.create('admins', newAdmin);
    setAdmins(prev => [created as Admin, ...prev]);
  };

  const updateAdmin = async (updatedAdmin: Admin) => {
    const { id, ...adminData } = updatedAdmin;
    const updated = await dataService.update('admins', id, adminData);
    setAdmins(prev => prev.map(a => a.id === id ? updated as Admin : a));
  };

  const deleteAdmin = async (adminId: string) => {
    await dataService.delete('admins', adminId);
    setAdmins(prev => prev.filter(a => a.id !== adminId));
  };
  
  const getAdmin = (id: string) => admins.find(a => a.id === id);

  const addFixedExpense = async (expense: Omit<FixedExpense, 'id' | 'createdAt' | 'payments'>) => {
    const newExpense = {
      ...expense,
      createdAt: new Date().toISOString(),
      payments: [],
    };
    const created = await dataService.create('fixedExpenses', newExpense);
    setFixedExpenses(prev => [created as FixedExpense, ...prev]);
  };

  const updateFixedExpense = async (updatedExpense: FixedExpense) => {
    const { id, ...expenseData } = updatedExpense;
    const updated = await dataService.update('fixedExpenses', id, expenseData);
    setFixedExpenses(prev => prev.map(e => e.id === id ? updated as FixedExpense : e));
  };

  const deleteFixedExpense = async (expenseId: string) => {
    await dataService.delete('fixedExpenses', expenseId);
    setFixedExpenses(prev => prev.filter(e => e.id !== expenseId));
  };

  const addWorkshopExpense = async (expense: Omit<WorkshopExpense, 'id' | 'createdAt' | 'payments'>) => {
    const newExpense = {
      ...expense,
      createdAt: new Date().toISOString(),
      payments: [],
    };
    const created = await dataService.create('workshopExpenses', newExpense);
    setWorkshopExpenses(prev => [created as WorkshopExpense, ...prev]);
  };

  const updateWorkshopExpense = async (updatedExpense: WorkshopExpense) => {
    const { id, ...expenseData } = updatedExpense;
    const updated = await dataService.update('workshopExpenses', id, expenseData);
    setWorkshopExpenses(prev => prev.map(e => e.id === id ? updated as WorkshopExpense : e));
  };

  const deleteWorkshopExpense = async (expenseId: string) => {
    await dataService.delete('workshopExpenses', expenseId);
    setWorkshopExpenses(prev => prev.filter(e => e.id !== expenseId));
  };

  const addFinancialEntry = async (entry: Omit<FinancialEntry, 'id' | 'createdAt' | 'payments'>) => {
    const newEntry = {
        ...entry,
        createdAt: new Date().toISOString(),
        payments: [],
    };
    const created = await dataService.create('financialEntries', newEntry);
    setFinancialEntries(prev => [created as FinancialEntry, ...prev]);
  };

  const updateFinancialEntry = async (updatedEntry: FinancialEntry) => {
    const { id, ...data } = updatedEntry;
    const updated = await dataService.update('financialEntries', id, data);
    setFinancialEntries(prev => prev.map(e => e.id === id ? updated as FinancialEntry : e));
  };

  const deleteFinancialEntry = async (entryId: string) => {
    await dataService.delete('financialEntries', entryId);
    setFinancialEntries(prev => prev.filter(e => e.id !== entryId));
  };

  const addFinancialCategory = async (name: string) => {
    const newCat = {
        name: name.trim().toUpperCase(),
        createdAt: new Date().toISOString(),
    };
    const created = await dataService.create('financialCategories', newCat);
    setFinancialCategories(prev => [...prev, created as FinancialCategory]);
  };

  const deleteFinancialCategory = async (id: string) => {
    await dataService.delete('financialCategories', id);
    setFinancialCategories(prev => prev.filter(c => c.id !== id));
  };

  const addAdvance = async (advance: Omit<Advance, 'id' | 'createdAt'>) => {
    const newAdvance = {
      ...advance,
      createdAt: new Date().toISOString(),
    };
    const created = await dataService.create('advances', newAdvance);
    setAdvances(prev => [created as Advance, ...prev]);
  };

  const updateAdvance = async (updatedAdvance: Advance) => {
    const { id, ...data } = updatedAdvance;
    const updated = await dataService.update('advances', id, data);
    setAdvances(prev => prev.map(a => a.id === id ? updated as Advance : a));
  };

  const deleteAdvance = async (advanceId: string) => {
    await dataService.delete('advances', advanceId);
    setAdvances(prev => prev.filter(a => a.id !== advanceId));
  };

  const addMaintenance = async (maint: Omit<Maintenance, 'id' | 'createdAt'>) => {
    const newMaint = {
      ...maint,
      createdAt: new Date().toISOString(),
    };
    const created = await dataService.create('maintenance', newMaint);
    setMaintenance(prev => [created as Maintenance, ...prev]);
  };

  const updateMaintenance = async (updatedMaint: Maintenance) => {
    const { id, ...data } = updatedMaint;
    const updated = await dataService.update('maintenance', id, data);
    setMaintenance(prev => prev.map(m => m.id === id ? updated as Maintenance : m));
  };

  const deleteMaintenance = async (maintenanceId: string) => {
    await dataService.delete('maintenance', maintenanceId);
    setMaintenance(prev => prev.filter(m => m.id !== maintenanceId));
  };

  const addFuelingRecord = async (fueling: Omit<FuelingRecord, 'id' | 'createdAt'>) => {
    const newFueling = {
      ...fueling,
      createdAt: new Date().toISOString(),
    };
    const created = await dataService.create('fueling_records', newFueling);
    setFuelingRecords(prev => [created as FuelingRecord, ...prev]);
  };

  const updateFuelingRecord = async (updatedFueling: FuelingRecord) => {
    const { id, ...data } = updatedFueling;
    const updated = await dataService.update('fueling_records', id, data);
    setFuelingRecords(prev => prev.map(f => f.id === id ? updated as FuelingRecord : f));
  };

  const deleteFuelingRecord = async (fuelingId: string) => {
    await dataService.delete('fueling_records', fuelingId);
    setFuelingRecords(prev => prev.filter(f => f.id !== fuelingId));
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
