
import React, { useState } from 'react';
import { TripProvider, useTrips } from './context/TripContext';
import { SessionProvider, useSession } from './context/SessionContext';
import { NotificationProvider } from './context/NotificationContext';
import { Notification } from './components/ui/Notification';
import { ICONS } from './constants';
import { Sidebar } from './components/layout/Sidebar';
import { Header } from './components/layout/Header';
import { Dashboard } from './components/dashboard/Dashboard';
import { DriverManagement } from './components/management/DriverManagement';
import { AdminManagement } from './components/management/AdminManagement';
import { VehicleManagement } from './components/management/VehicleManagement';
import { AccountsPayable } from './components/management/AccountsPayable';
import { BillingManagement } from './components/management/BillingManagement';
import { TripList } from './components/trip/TripList';
import { TripForm } from './components/trip/TripForm';
import { TripDetails } from './components/trip/TripDetails';
import { ActiveTripView } from './components/trip/ActiveTripView';
import { LoginScreen } from './components/auth/LoginScreen';
import { Trip } from './types';
import { ProfileSettings } from './components/profile/ProfileSettings';
import { AnalysisDashboard } from './components/analysis/AnalysisDashboard';
import { FinancialManagement } from './components/management/FinancialManagement';
import { AdvanceManagement } from './components/management/AdvanceManagement';

export type View =
  | { type: 'dashboard' }
  | { type: 'tripList' }
  | { type: 'newTrip' }
  | { type: 'viewTrip'; tripId: string }
  | { type: 'editTrip'; tripId: string }
  | { type: 'activeTrip'; trip: Trip }
  | { type: 'drivers' }
  | { type: 'admins' }
  | { type: 'vehicles' }
  | { type: 'accountsPayable' }
  | { type: 'billing' }
  | { type: 'analysis' }
  | { type: 'financial' }
  | { type: 'advances' }
  | { type: 'profileSettings' };

const MainContent: React.FC<{ view: View; setView: (view: View) => void }> = ({ view, setView }) => {
  const { getTrip } = useTrips();
  
  switch (view.type) {
    case 'dashboard':
      return <Dashboard setView={setView} />;
    case 'tripList':
      return <TripList setView={setView} />;
    case 'drivers':
      return <DriverManagement />;
    case 'admins':
      return <AdminManagement />;
    case 'vehicles':
      return <VehicleManagement />;
    case 'accountsPayable':
        return <AccountsPayable />;
    case 'billing':
        return <BillingManagement />;
    case 'analysis':
        return <AnalysisDashboard />;
    case 'financial':
        return <FinancialManagement />;
    case 'advances':
        return <AdvanceManagement />;
    case 'newTrip':
      return <TripForm setView={setView} />;
    case 'editTrip': {
        const tripToEdit = getTrip(view.tripId);
        if (!tripToEdit) {
            return <div className="text-white text-center p-8">Viagem não encontrada.</div>;
        }
        return <TripForm setView={setView} trip={tripToEdit} />;
    }
    case 'activeTrip':
      return <ActiveTripView trip={view.trip} setView={setView} />;
    case 'viewTrip':
        return <TripDetails tripId={view.tripId} setView={setView} />;
    case 'profileSettings':
        return <ProfileSettings setView={setView} />;
    default:
      return <Dashboard setView={setView} />;
  }
};

const AppContent: React.FC = () => {
    const [view, setView] = React.useState<View>(() => {
        const savedView = localStorage.getItem('currentView');
        if (savedView) {
            try {
                const parsed = JSON.parse(savedView);
                // Don't persist views that need complex data like 'activeTrip'
                if (parsed.type === 'activeTrip' || parsed.type === 'editTrip') {
                    return { type: 'dashboard' };
                }
                return parsed;
            } catch (e) {
                return { type: 'dashboard' };
            }
        }
        return { type: 'dashboard' };
    });

    React.useEffect(() => {
        // Only persist non-complex views
        if (view.type !== 'activeTrip' && view.type !== 'editTrip') {
            localStorage.setItem('currentView', JSON.stringify(view));
        }
    }, [view]);

    const [isSidebarOpen, setIsSidebarOpen] = useState(false);
    const { session } = useSession();
    const { isLoading, systemConfig, showPaymentModal, setShowPaymentModal } = useTrips();
    
    // Check if system should be blocked
    const isBlocked = React.useMemo(() => {
        if (!systemConfig) return false;
        
        const today = new Date();
        // Set to start of day for accurate comparison
        today.setHours(0, 0, 0, 0);
        
        const dueDate = new Date(systemConfig.dueDate + 'T23:59:59');
        
        // Block if not paid AND past due date
        return !systemConfig.isPaid && today > dueDate;
    }, [systemConfig]);

    if (!session.user) {
        return <LoginScreen />;
    }

    if (isLoading) {
        return (
            <div className="flex items-center justify-center h-screen w-screen bg-slate-900">
                <p className="text-white text-xl animate-pulse">Carregando dados...</p>
            </div>
        );
    }

    if (isBlocked) {
        return (
            <div className="flex flex-col items-center justify-center min-h-screen bg-slate-950 p-6 text-center">
                <div className="w-24 h-24 mb-8 text-red-500 animate-bounce">
                    <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 15v2m0 0v2m0-2h2m-2 0H10m12-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                    </svg>
                </div>
                <h1 className="text-3xl font-extrabold text-white mb-4 uppercase tracking-tighter">Acesso Bloqueado</h1>
                <div className="max-w-md p-6 rounded-2xl bg-white/5 border border-white/10 backdrop-blur-md">
                    <p className="text-slate-300 text-lg leading-relaxed mb-6">
                        {systemConfig?.blockMessage || 'O acesso ao sistema está temporariamente suspenso. Por favor, entre em contato com o administrador para regularizar sua situação.'}
                    </p>
                    
                    {/* Payment Info Section */}
                    <div className="bg-slate-900/50 border border-white/5 rounded-xl p-5 text-left space-y-3 mb-6">
                        <div className="flex justify-between items-center pb-2 border-b border-white/10">
                            <span className="text-slate-500 text-xs font-bold uppercase">Dados Para Pagamento</span>
                            <span className="text-orange-500 font-mono font-bold">R$ {systemConfig?.amount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                        </div>
                        
                        <div>
                            <p className="text-slate-500 text-[10px] uppercase font-bold">Chave PIX (Telefone)</p>
                            <p className="text-white font-medium">{systemConfig?.pixKey}</p>
                        </div>
                        
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <p className="text-slate-500 text-[10px] uppercase font-bold">Beneficiário</p>
                                <p className="text-white text-sm font-medium">{systemConfig?.pixName}</p>
                            </div>
                            <div>
                                <p className="text-slate-500 text-[10px] uppercase font-bold">Instituição</p>
                                <p className="text-white text-sm font-medium">{systemConfig?.pixBank}</p>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="mt-10 flex flex-col sm:flex-row gap-4">
                    <a 
                        href={`https://wa.me/${systemConfig?.whatsappNumber.replace(/\D/g, '')}?text=Olá Felipe, segue o comprovante de pagamento do sistema.`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="px-8 py-3 bg-green-600 hover:bg-green-700 text-white font-bold rounded-xl transition-all flex items-center justify-center gap-2 shadow-lg shadow-green-900/20"
                    >
                        <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                            <path d="M12.031 6.172c-3.181 0-5.767 2.586-5.768 5.766-.001 1.298.38 2.27 1.019 3.287l-.582 2.128 2.182-.573c.978.58 1.911.928 3.145.929 3.178 0 5.767-2.587 5.768-5.766 0-3.18-2.587-5.766-5.764-5.766zm3.394 8.018c-.147.416-.733.757-1.014.809-.247.045-.55.07-.886-.038-.21-.067-.474-.145-.964-.348-2.074-.863-3.41-2.957-3.513-3.093-.103-.137-.837-1.114-.837-2.122 0-1.008.514-1.505.733-1.728.147-.147.391-.217.585-.217h.416c.147 0 .341-.005.49.349.195.467.669 1.631.726 1.747.058.117.098.254.02.41-.078.156-.117.254-.234.39-.117.137-.247.306-.352.41-.117.117-.24.244-.103.48.137.234.608 1.004 1.303 1.623.894.796 1.649 1.043 1.883 1.161.234.117.371.098.51-.059.137-.156.586-.684.743-.918.156-.234.312-.195.53-.117.218.078 1.385.654 1.62 1.043.234.39.234.585.087 1.001z"/>
                        </svg>
                        Enviar Comprovante
                    </a>
                </div>
            </div>
        );
    }

    return (
        <div className="flex h-screen bg-slate-900">
            <Notification />
            <Sidebar 
              currentView={view} 
              setView={setView} 
              isOpen={isSidebarOpen}
              setIsOpen={setIsSidebarOpen}
            />
            <div className="flex flex-col flex-1 lg:ml-64 print:ml-0">
                <Header setView={setView} onMenuClick={() => setIsSidebarOpen(true)} />
                <main className="flex-1 p-4 sm:p-6 lg:p-8 overflow-y-auto">
                    <MainContent view={view} setView={setView} />
                </main>
            </div>

            {/* Payment Modal - Moved to root for z-index absolute priority */}
            {showPaymentModal && systemConfig && (
                <div className="fixed inset-0 z-[999] flex items-start justify-center p-4 pt-28 bg-slate-950/80 backdrop-blur-sm overflow-y-auto">
                    <div className="bg-slate-900 border border-white/10 rounded-3xl shadow-2xl max-w-sm w-full overflow-hidden animate-in fade-in zoom-in duration-300">
                        <div className="p-6">
                            <div className="flex justify-between items-center mb-6">
                                <h2 className="text-white font-bold text-lg uppercase tracking-wider">Renovação de Licença</h2>
                                <button onClick={() => setShowPaymentModal(false)} className="text-slate-400 hover:text-white p-1">
                                    <ICONS.close className="w-6 h-6" />
                                </button>
                            </div>
                            
                            {/* ... (rest of the modal content same as before) ... */}
                            <div className="bg-slate-950/50 border border-white/5 rounded-2xl p-5 space-y-4 mb-6">
                                <div className="flex justify-between items-center pb-3 border-b border-white/10">
                                    <span className="text-slate-500 text-xs font-bold uppercase">Valor da Manutenção</span>
                                    <span className="text-orange-500 font-mono font-bold text-lg">R$ {systemConfig.amount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                                </div>

                                <div className="space-y-3">
                                    <div>
                                        <p className="text-slate-500 text-[10px] uppercase font-bold tracking-widest">Chave PIX (Telefone)</p>
                                        <p className="text-white font-medium select-all">{systemConfig.pixKey}</p>
                                    </div>

                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <p className="text-slate-500 text-[10px] uppercase font-bold tracking-widest">Beneficiário</p>
                                            <p className="text-white text-xs font-medium">{systemConfig.pixName}</p>
                                        </div>
                                        <div>
                                            <p className="text-slate-500 text-[10px] uppercase font-bold tracking-widest">Banco</p>
                                            <p className="text-white text-xs font-medium">{systemConfig.pixBank}</p>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <a 
                                href={`https://wa.me/${systemConfig.whatsappNumber.replace(/\D/g, '')}?text=Olá Felipe, gostaria de adiantar o pagamento da licença do sistema.`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="w-full py-3 bg-green-600 hover:bg-green-700 text-white font-bold rounded-xl transition-all flex items-center justify-center gap-2 shadow-lg shadow-green-900/20 uppercase tracking-widest text-xs"
                            >
                                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                                    <path d="M12.031 6.172c-3.181 0-5.767 2.586-5.768 5.766-.001 1.298.38 2.27 1.019 3.287l-.582 2.128 2.182-.573c.978.58 1.911.928 3.145.929 3.178 0 5.767-2.587 5.768-5.766 0-3.18-2.587-5.766-5.764-5.766zm3.394 8.018c-.147.416-.733.757-1.014.809-.247.045-.55.07-.886-.038-.21-.067-.474-.145-.964-.348-2.074-.863-3.41-2.957-3.513-3.093-.103-.137-.837-1.114-.837-2.122 0-1.008.514-1.505.733-1.728.147-.147.391-.217.585-.217h.416c.147 0 .341-.005.49.349.195.467.669 1.631.726 1.747.058.117.098.254.02.41-.078.156-.117.254-.234.39-.117.137-.247.306-.352.41-.117.117-.24.244-.103.48.137.234.608 1.004 1.303 1.623.894.796 1.649 1.043 1.883 1.161.234.117.371.098.51-.059.137-.156.586-.684.743-.918.156-.234.312-.195.53-.117.218.078 1.385.654 1.62 1.043.234.39.234.585.087 1.001z"/>
                                </svg>
                                Enviar Comprovante
                            </a>
                            
                            <button 
                                onClick={() => setShowPaymentModal(false)}
                                className="w-full mt-3 py-2 text-slate-500 hover:text-slate-300 text-[10px] uppercase font-bold tracking-widest transition-colors"
                            >
                                Voltar ao Sistema
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};


function App() {
  return (
    <NotificationProvider>
      <TripProvider>
        <SessionProvider>
          <AppContent />
        </SessionProvider>
      </TripProvider>
    </NotificationProvider>
  );
}

export default App;
