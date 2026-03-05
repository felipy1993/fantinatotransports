import React from 'react';
import { useSession } from '../../context/SessionContext';
import { useTrips } from '../../context/TripContext';
import { TripStatus } from '../../types';
import { View } from '../../App';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/Card';
import { Button } from '../ui/Button';
import { ICONS } from '../../constants';
import { TripList } from '../trip/TripList';

const StatCard: React.FC<{ icon: React.ReactElement; label: string; value: string | number }> = ({ icon, label, value }) => (
  <Card className="bg-slate-800">
    <CardContent className="flex items-center p-4">
      <div className="p-3 bg-slate-700 rounded-lg mr-4">
        {/* FIX: Cast icon to React.ReactElement<any> and remove hardcoded color to allow dynamic coloring */}
        {React.cloneElement(icon as React.ReactElement<any>, { className: 'w-6 h-6' })}
      </div>
      <div>
        <p className="text-sm text-slate-400">{label}</p>
        <p className="text-2xl font-bold text-white">{value}</p>
      </div>
    </CardContent>
  </Card>
);

export const Dashboard: React.FC<{ setView: (view: View) => void }> = ({ setView }) => {
  const { currentDriver } = useSession();
  const { trips, drivers, vehicles } = useTrips();

  if (!currentDriver) {
    const ongoingTrips = trips.filter(t => t.status === TripStatus.IN_PROGRESS);
    const recentTrips = [...trips]
      .sort((a, b) => new Date(b.startDate).getTime() - new Date(a.startDate).getTime())
      .slice(0, 5);

    return (
        <div className="space-y-8">
            <div>
              <h1 className="text-2xl font-bold mb-6 text-white tracking-tight">Torre de Controle</h1>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                <StatCard icon={<ICONS.driver className="text-indigo-400"/>} label="Frotistas/Motoristas" value={drivers.length} />
                <StatCard icon={<ICONS.vehicle className="text-teal-400"/>} label="Frota de Veículos" value={vehicles.length} />
                <StatCard icon={<ICONS.trip className="text-orange-400"/>} label="Viagens em Andamento" value={ongoingTrips.length} />
              </div>
            </div>

            {ongoingTrips.length > 0 && (
              <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                  <div className="w-2 h-2 bg-orange-500 rounded-full animate-pulse"></div>
                  Operação em Tempo Real ({ongoingTrips.length})
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {ongoingTrips.map(trip => {
                    const driver = drivers.find(d => d.id === trip.driverId);
                    const vehicle = vehicles.find(v => v.id === trip.vehicleId);
                    return (
                      <Card key={trip.id} className="bg-slate-800/50 border-orange-500/20 hover:border-orange-500/40 transition-colors">
                        <CardContent className="p-4">
                          <div className="flex justify-between items-start">
                            <div>
                              <p className="font-bold text-white">{trip.origin} → {trip.destination}</p>
                              <p className="text-xs text-slate-400 mt-1">{driver?.name} | {vehicle?.plate}</p>
                            </div>
                            <Button variant="secondary" onClick={() => setView({ type: 'viewTrip', tripId: trip.id })} className="h-8 text-xs py-1 px-3">
                              Ver
                            </Button>
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              </div>
            )}

            <div className="bg-slate-800/30 rounded-2xl p-6 border border-slate-700/50">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-lg font-semibold text-white">Viagens Recentes</h2>
                <Button variant="secondary" onClick={() => setView({ type: 'tripList' })} className="text-xs h-8 py-1 px-3">
                  Ver Todas as Viagens
                </Button>
              </div>
              
              <div className="space-y-3">
                {recentTrips.length > 0 ? recentTrips.map(trip => {
                  const driver = drivers.find(d => d.id === trip.driverId);
                  const vehicle = vehicles.find(v => v.id === trip.vehicleId);
                  return (
                    <div key={trip.id} className="flex items-center justify-between p-3 bg-slate-800/50 rounded-xl hover:bg-slate-700/50 transition-colors group">
                      <div className="flex items-center gap-4">
                        <div className="w-10 h-10 rounded-full bg-slate-700 flex items-center justify-center text-slate-400 group-hover:bg-blue-900/30 group-hover:text-blue-400 transition-colors">
                          <ICONS.trip className="w-5 h-5" />
                        </div>
                        <div>
                          <p className="text-sm font-bold text-white">{trip.origin} → {trip.destination}</p>
                          <p className="text-[10px] text-slate-500">{new Date(trip.startDate + 'T00:00:00').toLocaleDateString('pt-BR')} • {driver?.name} • {vehicle?.plate}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase tracking-wider ${
                          trip.status === TripStatus.COMPLETED ? 'bg-green-500/10 text-green-500' : 'bg-blue-500/10 text-blue-500'
                        }`}>
                          {trip.status}
                        </span>
                        <button onClick={() => setView({ type: 'viewTrip', tripId: trip.id })} className="p-2 text-slate-500 hover:text-white">
                          <ICONS.chevronDown className="w-5 h-5 -rotate-90" />
                        </button>
                      </div>
                    </div>
                  );
                }) : (
                  <p className="text-center py-6 text-slate-500 text-sm">Nenhuma viagem registrada ainda.</p>
                )}
              </div>
            </div>
        </div>
    );
  }
  
  const driverTrips = trips.filter(t => t.driverId === currentDriver.id);
  const activeTrip = driverTrips.find(t => t.status === TripStatus.IN_PROGRESS);
  const draftTrip = driverTrips.find(t => t.status === TripStatus.PLANNED && (!t.origin || !t.destination || !t.startKm));

  const completedTrips = driverTrips.filter(t => t.status === TripStatus.COMPLETED).length;
  const totalKm = driverTrips.reduce((acc, t) => acc + (t.endKm > 0 ? t.endKm - t.startKm : 0), 0);
  
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-white">Olá, {currentDriver.name}!</h1>

      {activeTrip && (
        <Card className="bg-gradient-to-r from-blue-600 to-blue-800 border-blue-500">
          <CardHeader>
            <CardTitle className="text-white">Viagem em Andamento</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
              <div>
                <p className="text-xl font-bold text-white">{activeTrip.origin} &rarr; {activeTrip.destination} {activeTrip.monthlyTripNumber ? `(${activeTrip.monthlyTripNumber}ª Viagem do Mês)` : ''}</p>
                <p className="text-blue-200">Iniciada em: {new Date(activeTrip.startDate + 'T00:00:00').toLocaleDateString('pt-BR')}</p>
              </div>
              <Button onClick={() => setView({ type: 'activeTrip', trip: activeTrip })} className="bg-white text-blue-700 hover:bg-blue-100 mt-4 md:mt-0">
                <ICONS.trip className="w-5 h-5 mr-2" />
                Gerenciar Viagem
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {draftTrip && (
        <Card className="bg-amber-500/10 border-amber-500/30">
          <CardHeader>
            <CardTitle className="text-amber-500 flex items-center gap-2">
                <ICONS.pencil className="w-5 h-5" />
                Rascunho de Viagem Encontrado
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
              <div>
                <p className="text-lg font-bold text-white">{draftTrip.origin || 'Local não informado'} &rarr; {draftTrip.destination || 'Local não informado'}</p>
                <p className="text-slate-400 text-sm italic">Você começou este preenchimento e ele foi salvo no banco de dados.</p>
              </div>
              <Button onClick={() => setView({ type: 'editTrip', tripId: draftTrip.id })} className="bg-amber-600 text-white hover:bg-amber-700 border-none mt-4 md:mt-0">
                Continuar Preenchimento
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {!activeTrip && !draftTrip && (
        <Card>
            <CardContent className="text-center py-8">
                <p className="text-slate-300">Nenhuma viagem em andamento no momento.</p>
                <Button onClick={() => setView({type: 'newTrip'})} className="mt-4">
                    <ICONS.plus className="w-5 h-5 mr-2" />
                    Iniciar Nova Viagem
                </Button>
            </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader><CardTitle>Suas Estatísticas</CardTitle></CardHeader>
          <CardContent>
             <div className="flex items-center justify-between p-2">
                <span className="text-slate-400">Viagens Finalizadas</span>
                <span className="font-bold text-lg text-white">{completedTrips}</span>
            </div>
             <div className="flex items-center justify-between p-2">
                <span className="text-slate-400">Total KM Rodados</span>
                <span className="font-bold text-lg text-white">{totalKm.toLocaleString('pt-BR')} km</span>
            </div>
          </CardContent>
        </Card>
        <Card>
            <CardHeader><CardTitle>Seu Histórico</CardTitle></CardHeader>
             <CardContent>
                <p className="text-slate-400 mb-4">Veja seu histórico completo de viagens.</p>
                <Button onClick={() => setView({ type: 'tripList' })} variant="secondary" className="w-full">
                    Ver Histórico de Viagens
                </Button>
             </CardContent>
        </Card>
      </div>

    </div>
  );
};