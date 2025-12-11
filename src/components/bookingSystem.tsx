'use client'

import { useState, useEffect } from 'react';
import { runTransaction, doc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useAppointments } from '../hooks/useAppointments';
import { toast } from 'sonner';
import { Loader2, X, MapPin, Clock, ChevronRight, Star, CalendarX, AlertCircle, AlertTriangle } from 'lucide-react';
import { format, addDays, isSameDay } from 'date-fns';
import { es } from 'date-fns/locale';

// --- CONFIGURACIÓN ---
const BARBER_PHONE = "56988280660"; 

// 1. LISTA DE HORARIOS (Agregadas 08:00 y 09:00 al inicio)
const HOURS = [
  '08:00', '09:00', // <--- NUEVAS HORAS MAÑANA
  '10:00', '11:00', '12:00', '13:00',
  '14:00', '15:00', '16:00', '17:00', '18:00', '19:00',
  '20:00', '21:00'
];

// 2. DEFINIR SOBRE CUPO (Mañana y Noche)
const OVERTIME_SLOTS = ['08:00', '09:00', '20:00', '21:00']; // <--- AQUI SE DEFINEN LAS QUE COBRAN EXTRA

const BASE_PRICE = 10000;
const EXTRA_FEE = 3000;

const getNextDays = () => {
  const days = [];
  const today = new Date();
  for (let i = 0; i < 14; i++) {
    days.push(addDays(today, i));
  }
  return days;
};

export default function BookingSystem() {
  const [isMounted, setIsMounted] = useState(false);
  const [selectedDate, setSelectedDate] = useState(new Date());
  const { appointments, loading } = useAppointments(selectedDate);
  const days = getNextDays();

  const [selectedSlot, setSelectedSlot] = useState<string | null>(null);
  const [clientName, setClientName] = useState('');
  const [clientPhone, setClientPhone] = useState('');
  const [processing, setProcessing] = useState(false);
  const [errors, setErrors] = useState({ name: '', phone: '' });

  const [showOvertimeWarning, setShowOvertimeWarning] = useState(false);

  const isDayBlocked = appointments.some(app => (app as any).type === 'day_blocked');

  useEffect(() => { setIsMounted(true); }, []);

  const openBookingModal = (time: string) => {
    setSelectedSlot(time);
    setClientName('');
    setClientPhone('');
    setErrors({ name: '', phone: '' });
    setShowOvertimeWarning(false);
  };

  const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    if (val === '' || /^[a-zA-ZáéíóúÁÉÍÓÚñÑ\s]+$/.test(val)) {
      if (val.length <= 20) {
        setClientName(val.replace(/\b\w/g, l => l.toUpperCase()));
        setErrors(prev => ({ ...prev, name: '' }));
      }
    }
  };

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value.replace(/[^0-9]/g, '');
    if (val.length <= 9) {
      setClientPhone(val);
      setErrors(prev => ({ ...prev, phone: '' }));
    }
  };

  const handleInitialSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    let hasError = false;
    const newErrors = { name: '', phone: '' };

    if (clientName.trim().length < 3) { newErrors.name = 'Mínimo 3 letras'; hasError = true; }
    if (clientPhone.length < 8) { newErrors.phone = 'Mínimo 8 números'; hasError = true; }

    if (hasError) {
      setErrors(newErrors);
      return;
    }

    if (selectedSlot && OVERTIME_SLOTS.includes(selectedSlot)) {
      setShowOvertimeWarning(true);
    } else {
      executeBooking();
    }
  };

  const executeBooking = async () => {
    if (!selectedSlot) return;
    setProcessing(true);

    const dateStr = selectedDate.toISOString().split('T')[0];
    const appointmentId = `${dateStr}-${selectedSlot}`;
    const isOvertime = OVERTIME_SLOTS.includes(selectedSlot);

    try {
      await runTransaction(db, async (transaction) => {
        const docRef = doc(db, "appointments", appointmentId);
        const sfDoc = await transaction.get(docRef);
        if (sfDoc.exists()) throw "¡Esta hora ya fue tomada!";

        transaction.set(docRef, {
          date: dateStr,
          time: selectedSlot,
          clientName: clientName.trim(),
          clientPhone: clientPhone.trim(),
          createdAt: new Date().toISOString(),
          type: 'booking',
          isOvertime: isOvertime
        });
      });

      toast.success("¡Reserva confirmada!");
      setSelectedSlot(null);

      const fechaBonita = format(selectedDate, "EEEE d 'de' MMMM", { locale: es });
      const totalPrice = isOvertime ? BASE_PRICE + EXTRA_FEE : BASE_PRICE;
      const extraText = isOvertime ? ` *(Sobrecupo +$3.000)*` : "";

      const mensaje = `Hola Daniel! Soy *${clientName}*. Agendé para el *${fechaBonita}* a las *${selectedSlot}*${extraText}. Total: $${totalPrice.toLocaleString('es-CL')}. Mi número es ${clientPhone}.`;

      setTimeout(() => {
        window.open(`https://wa.me/${BARBER_PHONE}?text=${encodeURIComponent(mensaje)}`, '_blank');
      }, 1500);

    } catch (error: any) {
      toast.error(typeof error === 'string' ? error : "Error al reservar");
    } finally {
      setProcessing(false);
    }
  };

  if (!isMounted) return <div className="h-screen flex items-center justify-center"><Loader2 className="animate-spin text-gray-400" /></div>;

  return (
    <div className="max-w-md mx-auto bg-gray-50 min-h-screen pb-20 font-sans">

      {/* HEADER */}
      <div className="bg-white p-6 pb-8 rounded-b-3xl shadow-sm border-b border-gray-100">
        <div className="flex flex-col items-center text-center">
          <div className="w-24 h-24 rounded-full bg-gray-200 mb-4 overflow-hidden border-4 border-white shadow-md">
            <img
              src="/foto-barberia-big-boss.jpg"
              alt="Logo Barbería Big Boss"
              className="w-full h-full object-cover"
            />
          </div>
          <h1 className="text-2xl font-bold text-gray-900">Big Boss BarberShop</h1>
          
          <div className="text-gray-500 text-sm mt-2 flex items-start justify-center gap-1 max-w-[280px]">
            <MapPin size={16} className="mt-0.5 flex-shrink-0 text-red-500 fill-red-100" />
            <a 
              href="https://www.google.com/maps/search/?api=1&query=Las+Tortolas+26,+La+Islita,+Isla+de+Maipo" 
              target="_blank" 
              rel="noopener noreferrer"
              className="hover:text-black hover:underline transition-colors text-left leading-tight"
            >
              Las Tortolas 26, La Islita, Isla de Maipo (Ver mapa)
            </a>
          </div>

          <div className="flex items-center gap-1 mt-2 bg-gray-100 px-3 py-1 rounded-full">
            <Star size={12} className="text-yellow-500 fill-yellow-500" />
            <span className="text-xs font-bold text-gray-700">5.0</span>
          </div>
        </div>
      </div>

      {/* TARJETA SERVICIOS */}
      <div className="px-4 -mt-4 space-y-2">
        <div className="bg-white p-4 rounded-xl shadow-md border border-gray-100 flex justify-between items-center">
          <div>
            <h3 className="font-bold text-gray-800">Corte de Pelo</h3>
            <p className="text-xs text-gray-400 mt-1 flex items-center gap-1">
              <Clock size={12} /> 1 hora • Corte & Estilo
            </p>
          </div>
          <div className="bg-black text-white px-3 py-1 rounded-lg text-sm font-bold">$10.000</div>
        </div>

        <div className="bg-white p-4 rounded-xl shadow-md border border-gray-100 flex justify-between items-center">
          <div>
            <h3 className="font-bold text-gray-800">Barba</h3>
            <p className="text-xs text-gray-400 mt-1 flex items-center gap-1">
              <Clock size={12} /> 15 minutos • Perfilado
            </p>
          </div>
          <div className="bg-black text-white px-3 py-1 rounded-lg text-sm font-bold">+ $4.000</div>
        </div>

        <div className="bg-white p-4 rounded-xl shadow-md border border-gray-100 flex justify-between items-center">
          <div>
            <h3 className="font-bold text-gray-800">Cejas</h3>
            <p className="text-xs text-gray-400 mt-1 flex items-center gap-1">
              <Clock size={12} /> 15 minutos • Perfilado
            </p>
          </div>
          <div className="bg-black text-white px-3 py-1 rounded-lg text-sm font-bold">+ $1.000</div>
        </div>

        {/* Tarjeta Informativa de Sobrecupo */}
        <div className="bg-amber-50 p-4 rounded-xl shadow-sm border border-amber-100 flex justify-between items-center">
          <div>
            {/* Texto actualizado para reflejar mañana y noche */}
            <h3 className="font-bold text-amber-900">Sobrecupo (08-09 / 20-21 hrs)</h3>
            <p className="text-xs text-amber-700 mt-1 flex items-center gap-1">
              <AlertTriangle size={12} /> Horario extendido
            </p>
          </div>
          <div className="bg-amber-500 text-white px-3 py-1 rounded-lg text-sm font-bold">+ $3.000</div>
        </div>
      </div>

      {/* CALENDARIO */}
      <div className="mt-8 px-4">
        <h3 className="text-sm font-bold text-gray-500 uppercase mb-3">Selecciona el día</h3>
        <div className="flex gap-3 overflow-x-auto pb-4 scrollbar-hide">
          {days.map((day) => {
            const isSelected = isSameDay(day, selectedDate);
            return (
              <button
                key={day.toISOString()}
                onClick={() => setSelectedDate(day)}
                className={`flex-shrink-0 flex flex-col items-center justify-center w-16 h-20 rounded-2xl border transition-all ${isSelected ? 'bg-black text-white border-black shadow-lg scale-105' : 'bg-white text-gray-500 border-gray-200'}`}
              >
                <span className="text-xs font-medium capitalize">{format(day, 'EEE', { locale: es }).replace('.', '')}</span>
                <span className="text-xl font-bold">{format(day, 'd')}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* GRILLA HORARIOS */}
      <div className="px-4 mt-2">
        <h3 className="text-sm font-bold text-gray-500 uppercase mb-3">Horarios ({format(selectedDate, 'EEEE d', { locale: es })})</h3>

        {loading ? <div className="flex justify-center py-10"><Loader2 className="animate-spin text-gray-400" /></div> :
          isDayBlocked ? (
            <div className="bg-red-50 border border-red-100 rounded-2xl p-8 text-center animate-in fade-in">
              <CalendarX className="mx-auto text-red-400 mb-2" size={32} />
              <h3 className="text-red-800 font-bold">No atendemos hoy</h3>
              <p className="text-red-500 text-sm">Agenda cerrada.</p>
            </div>
          ) : (
            <div className="grid grid-cols-3 sm:grid-cols-4 gap-3">
              {HOURS.map((time) => {
                const isTaken = appointments.some(app => app.time === time);
                const now = new Date();
                const isToday = isSameDay(selectedDate, now);
                const currentHour = now.getHours();
                const [slotHour] = time.split(':').map(Number);
                const isPast = isToday && slotHour <= currentHour;
                const isDisabled = isTaken || isPast;
                const isOvertime = OVERTIME_SLOTS.includes(time);

                return (
                  <button
                    key={time}
                    disabled={isDisabled}
                    onClick={() => openBookingModal(time)}
                    className={`
                    py-3 rounded-xl font-bold text-xs sm:text-sm transition-all border relative flex flex-col items-center justify-center gap-1
                    ${isDisabled
                        ? 'bg-gray-100 text-gray-300 border-transparent cursor-not-allowed'
                        : isOvertime
                          ? 'bg-amber-50 text-amber-900 border-amber-200 hover:bg-amber-100' // Estilo Sobrecupo
                          : 'bg-white text-gray-800 border-gray-200 hover:bg-black hover:text-white'
                      }
                  `}
                  >
                    {time}
                    {isOvertime && !isDisabled && (
                      <span className="text-[9px] font-bold bg-amber-200 text-amber-900 px-1.5 rounded-sm leading-tight">
                        SOBRECUPO
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          )}
      </div>

      <div className="text-center mt-10 text-gray-300 text-xs pb-10"><p>Powered by BarberBook</p></div>

      {/* MODAL DE CONFIRMACIÓN */}
      {selectedSlot && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-end sm:items-center justify-center backdrop-blur-sm p-4 animate-in fade-in">
          <div className="bg-white w-full max-w-sm rounded-3xl p-6 shadow-2xl animate-in slide-in-from-bottom-10">

            {/* VISTA 1: FORMULARIO NORMAL */}
            {!showOvertimeWarning && (
              <>
                <div className="flex justify-between items-center mb-6">
                  <div>
                    <p className="text-xs text-gray-400 uppercase font-bold">Confirmando reserva</p>
                    <h3 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                      {selectedSlot}
                      {OVERTIME_SLOTS.includes(selectedSlot) && <span className="text-xs bg-amber-100 text-amber-800 px-2 py-1 rounded-full">Sobrecupo</span>}
                    </h3>
                    <p className="text-sm text-gray-500 capitalize">{format(selectedDate, 'EEEE d MMMM', { locale: es })}</p>
                  </div>
                  <button onClick={() => setSelectedSlot(null)} className="bg-gray-100 p-2 rounded-full hover:bg-gray-200"><X size={20} /></button>
                </div>

                <form onSubmit={handleInitialSubmit} className="space-y-4">
                  <div className={`bg-gray-50 p-3 rounded-xl border focus-within:ring-1 transition-all ${errors.name ? 'border-red-300 ring-1 ring-red-100' : 'border-gray-100 focus-within:border-black focus-within:ring-black'}`}>
                    <label className="text-xs text-gray-400 font-bold block mb-1">Tu Nombre</label>
                    <input autoFocus className="w-full bg-transparent outline-none font-bold text-gray-800 placeholder-gray-300" placeholder="Ej: Tommy Shelby" value={clientName} onChange={handleNameChange} />
                    {errors.name && <p className="text-xs text-red-500 mt-1 flex items-center gap-1"><AlertCircle size={10} /> {errors.name}</p>}
                  </div>

                  <div className={`bg-gray-50 p-3 rounded-xl border focus-within:ring-1 transition-all ${errors.phone ? 'border-red-300 ring-1 ring-red-100' : 'border-gray-100 focus-within:border-black focus-within:ring-black'}`}>
                    <label className="text-xs text-gray-400 font-bold block mb-1">WhatsApp / Teléfono</label>
                    <div className="flex items-center gap-2">
                      <span className="text-gray-400 font-bold">+56</span>
                      <input type="tel" className="w-full bg-transparent outline-none font-bold text-gray-800 placeholder-gray-300" placeholder="9 1234 5678" value={clientPhone} onChange={handlePhoneChange} />
                    </div>
                    {errors.phone && <p className="text-xs text-red-500 mt-1 flex items-center gap-1"><AlertCircle size={10} /> {errors.phone}</p>}
                  </div>

                  <button
                    disabled={processing || !clientName || !clientPhone}
                    className="w-full bg-black text-white font-bold py-4 rounded-xl text-lg hover:scale-[1.02] active:scale-95 transition-all flex justify-center items-center gap-2 disabled:opacity-50"
                  >
                    Confirmar <ChevronRight />
                  </button>
                </form>
              </>
            )}

            {/* VISTA 2: ADVERTENCIA SOBRE CUPO */}
            {showOvertimeWarning && (
              <div className="text-center animate-in slide-in-from-right-10 fade-in">
                <div className="w-16 h-16 bg-amber-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <AlertTriangle className="text-amber-600" size={32} />
                </div>

                <h3 className="text-xl font-bold text-gray-900 mb-2">¡Atención! Hora Sobrecupo</h3>

                <div className="bg-gray-50 p-4 rounded-xl text-left mb-6 border border-gray-200">
                  <p className="text-gray-600 text-sm mb-3">Has seleccionado un horario especial fuera de turno regular. Esto tiene un costo adicional.</p>
                  <div className="flex justify-between items-center text-sm mb-1 text-gray-400">
                    <span>Corte Base:</span>
                    <span>${BASE_PRICE.toLocaleString('es-CL')}</span>
                  </div>
                  <div className="flex justify-between items-center text-sm mb-2 text-amber-600 font-bold">
                    <span>+ Recargo Sobrecupo:</span>
                    <span>${EXTRA_FEE.toLocaleString('es-CL')}</span>
                  </div>
                  <div className="border-t pt-2 flex justify-between items-center font-black text-lg text-gray-900">
                    <span>Total a Pagar:</span>
                    <span>${(BASE_PRICE + EXTRA_FEE).toLocaleString('es-CL')}</span>
                  </div>
                </div>

                <div className="flex gap-3">
                  <button
                    onClick={() => setShowOvertimeWarning(false)}
                    className="flex-1 py-3 text-gray-500 font-bold hover:bg-gray-50 rounded-xl"
                  >
                    Cancelar
                  </button>
                  <button
                    onClick={executeBooking}
                    className="flex-1 bg-amber-500 text-white font-bold py-3 rounded-xl shadow-lg shadow-amber-200 hover:bg-amber-600 flex justify-center items-center gap-2"
                  >
                    {processing ? <Loader2 className="animate-spin" /> : "Aceptar y Agendar"}
                  </button>
                </div>
              </div>
            )}

          </div>
        </div>
      )}
    </div>
  );
}