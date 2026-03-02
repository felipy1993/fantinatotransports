
import React from 'react';
import { useSession } from '../../context/SessionContext';
import { ICONS } from '../../constants';
import { View } from '../../App';
import { Button } from '../ui/Button';
import { useTrips } from '../../context/TripContext';

export const Header: React.FC<{ setView: (view: View) => void; onMenuClick: () => void; }> = ({ setView, onMenuClick }) => {
  const { session, logout } = useSession();
  const { systemConfig, daysToExpiration, setShowPaymentModal } = useTrips() as any;

  const handleLogout = () => {
    logout();
    // App will re-render to the login screen automatically
  };

  return (
    <header className="bg-slate-800/50 backdrop-blur-sm border-b border-slate-700 p-4 flex justify-between lg:justify-end items-center sticky top-0 z-40 print:hidden">
      <button onClick={onMenuClick} className="lg:hidden text-slate-300 hover:text-white" aria-label="Abrir menu">
        <ICONS.menu className="w-6 h-6" />
      </button>

      {/* Expiration Warning - Discrete & Clickable */}
      {daysToExpiration !== null && daysToExpiration <= 5 && session.user?.role === 'admin' && (
        <div className="flex-1 max-w-xs mx-4 hidden sm:block">
          <button 
            onClick={() => setShowPaymentModal(true)}
            className="w-full bg-amber-500/10 border border-amber-500/30 rounded-lg py-1.5 px-3 flex items-center gap-2 animate-pulse hover:bg-amber-500/20 transition-all text-left"
          >
            <ICONS.lock className="w-4 h-4 text-amber-500 shrink-0" />
            <p className="text-xs text-amber-200 leading-tight">
              A Licença do sistema vence em <span className="font-bold underline">{daysToExpiration <= 0 ? 'hoje' : `${daysToExpiration} ${daysToExpiration === 1 ? 'dia' : 'dias'}`}</span>.
            </p>
          </button>
        </div>
      )}

      <div className="flex items-center gap-4">
        <button
          onClick={() => {
            setView({ type: 'profileSettings' });
          }}
          className={"flex items-center gap-2 text-right cursor-pointer hover:bg-slate-700 p-2 rounded-md transition-colors"}
          title={'Editar perfil'}
        >
          <ICONS.user className="w-6 h-6 text-slate-400" />
          <div>
            <p className="font-semibold text-white">{session.user?.name}</p>
            <p className="text-xs text-slate-400 capitalize">{session.user?.role === 'admin' ? 'Administrador' : 'Motorista'}</p>
          </div>
        </button>
        <Button variant="secondary" onClick={handleLogout}>
          Sair
        </Button>
      </div>
    </header>
  );
};
