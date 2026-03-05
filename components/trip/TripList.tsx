import React, { useState } from 'react';
import { useTrips } from '../../context/TripContext';
import { useSession } from '../../context/SessionContext';
import { TripStatus, Trip } from '../../types';
import type { View } from '../../App';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/Card';
import { Button } from '../ui/Button';
import { ICONS } from '../../constants';
import { exportToXLSX } from '../../utils/exportUtils';

interface TripListProps {
  setView: (view: View) => void;
}

const getTripStatusLabel = (trip: Trip) => {
  if (trip.status === TripStatus.PLANNED && (!trip.origin || !trip.destination || !trip.startKm)) {
    return 'Rascunho';
  }
  return trip.status;
};

const getTripStatusClass = (trip: Trip) => {
  if (trip.status === TripStatus.PLANNED && (!trip.origin || !trip.destination || !trip.startKm)) {
    return 'bg-amber-600 text-white';
  }
  switch (trip.status) {
    case TripStatus.PLANNED:
      return 'bg-blue-500 text-white';
    case TripStatus.IN_PROGRESS:
      return 'bg-yellow-500 text-black';
    case TripStatus.COMPLETED:
      return 'bg-green-500 text-white';
    default:
      return 'bg-gray-500 text-white';
  }
};

export const TripList: React.FC<TripListProps> = ({ setView }) => {
  const { trips, getDriver, getVehicle, drivers, vehicles } = useTrips();
  const { currentDriverId } = useSession();
  
  const today = new Date();
  const currentMonthStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}`;

  // Filter states
  const [filterType, setFilterType] = useState<'all' | 'date' | 'month'>('month');
  const [selectedDate, setSelectedDate] = useState<string>('');
  const [startMonth, setStartMonth] = useState<string>(currentMonthStr);
  const [endMonth, setEndMonth] = useState<string>(currentMonthStr);
  const [selectedDriverId, setSelectedDriverId] = useState<string>('');
  const [selectedVehicleId, setSelectedVehicleId] = useState<string>('');

  const displayedTrips = currentDriverId
    ? trips.filter(trip => trip.driverId === currentDriverId)
    : trips;

  // Apply filters
  const filteredTrips = displayedTrips.filter(trip => {
    if (filterType === 'date' && selectedDate) {
      return trip.startDate === selectedDate;
    }
    if (filterType === 'month' && startMonth && endMonth) {
      const tripDate = new Date(trip.startDate + 'T00:00:00');
      const tripYearMonth = tripDate.getFullYear() + '-' + String(tripDate.getMonth() + 1).padStart(2, '0');
      if (tripYearMonth < startMonth || tripYearMonth > endMonth) return false;
    }

    if (selectedDriverId && trip.driverId !== selectedDriverId) return false;
    if (selectedVehicleId && trip.vehicleId !== selectedVehicleId) return false;

    return true;
  });

  const handleClearFilters = () => {
    setFilterType('all');
    setSelectedDate('');
    setStartMonth('');
    setEndMonth('');
    setSelectedDriverId('');
    setSelectedVehicleId('');
  };

  const handleExportExcel = () => {
    const dataToExport = filteredTrips.map(trip => {
      const driver = getDriver(trip.driverId);
      const vehicle = getVehicle(trip.vehicleId);
      return {
        'ID': trip.id,
        'Origem': trip.origin,
        'Destino': trip.destination,
        'Motorista': driver?.name || 'Não atribuído',
        'Veículo': vehicle ? `${vehicle.plate} (${vehicle.model})` : 'Não atribuído',
        'Data Início': trip.startDate,
        'Km Inicial': trip.startKm,
        'Status': getTripStatusLabel(trip),
        'Viagem do Mês': trip.monthlyTripNumber || '-'
      };
    });
    exportToXLSX(dataToExport, 'Relatorio_Viagens', 'Viagens');
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex justify-between items-center">
          <CardTitle>{currentDriverId ? 'Minhas Viagens' : 'Todas as Viagens'}</CardTitle>
          <div className="flex gap-2">
            <Button variant="secondary" onClick={handleExportExcel}>
              <ICONS.printer className="w-4 h-4 mr-2" />
              Exportar Excel
            </Button>
            <Button onClick={() => setView({type: 'newTrip'})}>Criar Nova Viagem</Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {/* Filter section */}
        <div className="mb-6 p-4 bg-slate-800 rounded-lg border border-slate-700">
          <div className="space-y-4">
            {/* Filter type selector */}
            <div className="flex flex-wrap gap-3">
              <button
                onClick={() => setFilterType('all')}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  filterType === 'all'
                    ? 'bg-blue-600 text-white'
                    : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                }`}
              >
                Todas as Viagens
              </button>
              <button
                onClick={() => setFilterType('date')}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  filterType === 'date'
                    ? 'bg-blue-600 text-white'
                    : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                }`}
              >
                Filtrar por Data
              </button>
              <button
                onClick={() => setFilterType('month')}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  filterType === 'month'
                    ? 'bg-blue-600 text-white'
                    : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                }`}
                >
                  Filtrar por Período
                </button>
              </div>

              {/* Driver and Vehicle Selectors */}
              {!currentDriverId && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="flex-1">
                    <label className="block text-sm text-slate-300 mb-2">Motorista</label>
                    <select
                      value={selectedDriverId}
                      onChange={(e) => setSelectedDriverId(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white text-sm focus:outline-none focus:border-blue-500"
                    >
                      <option value="">Todos os Motoristas</option>
                      {drivers.sort((a,b) => a.name.localeCompare(b.name)).map(d => (
                        <option key={d.id} value={d.id}>{d.name}</option>
                      ))}
                    </select>
                  </div>
                  <div className="flex-1">
                    <label className="block text-sm text-slate-300 mb-2">Veículo (Placa)</label>
                    <select
                      value={selectedVehicleId}
                      onChange={(e) => setSelectedVehicleId(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white text-sm focus:outline-none focus:border-blue-500"
                    >
                      <option value="">Todos os Veículos</option>
                      {vehicles.sort((a,b) => a.plate.localeCompare(b.plate)).map(v => (
                        <option key={v.id} value={v.id}>{v.plate} ({v.model})</option>
                      ))}
                    </select>
                  </div>
                </div>
              )}

            {/* Date filter */}
            {filterType === 'date' && (
              <div className="flex flex-wrap gap-3 items-end">
                <div className="flex-1 min-w-[200px]">
                  <label className="block text-sm text-slate-300 mb-2">Data da Viagem</label>
                  <input
                    type="date"
                    value={selectedDate}
                    onChange={(e) => setSelectedDate(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white text-sm focus:outline-none focus:border-blue-500"
                  />
                </div>
              </div>
            )}

            {/* Month range filter */}
            {filterType === 'month' && (
              <div className="flex flex-wrap gap-3 items-end">
                <div className="flex-1 min-w-[200px]">
                  <label className="block text-sm text-slate-300 mb-2">Mês Inicial</label>
                  <input
                    type="month"
                    value={startMonth}
                    onChange={(e) => setStartMonth(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white text-sm focus:outline-none focus:border-blue-500"
                  />
                </div>
                <div className="flex-1 min-w-[200px]">
                  <label className="block text-sm text-slate-300 mb-2">Mês Final</label>
                  <input
                    type="month"
                    value={endMonth}
                    onChange={(e) => setEndMonth(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white text-sm focus:outline-none focus:border-blue-500"
                  />
                </div>
              </div>
            )}

            {/* Clear filters button - show only when filters are active */}
            {(filterType !== 'all' || selectedDriverId || selectedVehicleId) && (selectedDate || startMonth || endMonth || selectedDriverId || selectedVehicleId) && (
              <div className="flex justify-end">
                <button
                  onClick={handleClearFilters}
                  className="px-3 py-1 text-sm text-slate-300 hover:text-red-400 transition-colors"
                >
                  ✕ Limpar Filtros
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Results info */}
        <p className="text-sm text-slate-400 mb-4">
          Exibindo {filteredTrips.length} viagem(ns) encontrada(s)
        </p>

        {/* Trips list */}
        <div className="space-y-4">
          {filteredTrips.length > 0 ? filteredTrips.map(trip => {
            const driver = getDriver(trip.driverId);
            const vehicle = getVehicle(trip.vehicleId);
            return (
              <div key={trip.id} className="bg-slate-700 p-4 rounded-lg flex flex-col md:flex-row justify-between md:items-center gap-4">
                <div className="flex-1">
                  <h3 className="font-bold text-lg text-white">{trip.origin} → {trip.destination}</h3>
                  <p className="text-sm text-slate-400">
                    {driver?.name} | {vehicle?.plate} ({vehicle?.model})
                  </p>
                  <p className="text-sm text-slate-400">
                    Início: {new Date(trip.startDate + 'T00:00:00').toLocaleDateString('pt-BR')}
                    {trip.monthlyTripNumber && ` | ${trip.monthlyTripNumber}ª Viagem do Mês`}
                  </p>
                </div>
                <div className="flex items-center gap-4">
                   <span className={`px-3 py-1 text-xs font-semibold rounded-full ${getTripStatusClass(trip)}`}>
                    {getTripStatusLabel(trip)}
                   </span>
                   <div className="flex items-center gap-2">
                     <Button variant="secondary" onClick={() => setView({ type: 'editTrip', tripId: trip.id })}>
                       <ICONS.pencil className="w-4 h-4 mr-1.5" />
                       Editar
                     </Button>
                     <Button variant="secondary" onClick={() => setView({ type: 'viewTrip', tripId: trip.id })}>
                      Ver Detalhes
                     </Button>
                   </div>
                </div>
              </div>
            )
          }) : <p className="text-slate-400 text-center py-8">Nenhuma viagem encontrada.</p>}
        </div>
      </CardContent>
    </Card>
  );
};