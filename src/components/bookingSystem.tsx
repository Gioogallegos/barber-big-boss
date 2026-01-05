'use client'

import { useState, useEffect, useRef } from 'react';
import { runTransaction, doc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useAppointments } from '../hooks/useAppointments';
import { toast } from 'sonner';
import { Loader2, X, MapPin, Clock, ChevronRight, Star, CalendarX, AlertTriangle, MessageCircle, Scissors, Image as ImageIcon, ZoomIn } from 'lucide-react';
import { format, addDays, isSameDay } from 'date-fns';
import { es } from 'date-fns/locale';

// --- CONFIGURACIÓN ---
const BARBER_PHONE = "56988280660";

// FOTOS DEL CARRUSEL
const GALLERY_IMAGES = ["corte 1.jpeg", "corte 2.jpeg", "corte 3.jpeg",
  "corte 4.jpeg", "corte 5.jpeg", "corte 6.jpeg"];

const HOURS = [
  '08:00', '09:00',
  '10:00', '11:00', '12:00', '13:00',
  '14:00', '15:00', '16:00', '17:00', '18:00', '19:00',
  '20:00', '21:00'
];

const OVERTIME_SLOTS = ['08:00', '09:00', '20:00', '21:00'];
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
  const [bookingSuccess, setBookingSuccess] = useState(false);

  // Referencia para el carrusel automático
  const scrollRef = useRef<HTMLDivElement>(null);
  // Estado para pausar el carrusel si el usuario interactúa
  const [isPaused, setIsPaused] = useState(false);

  const isDayBlocked = appointments.some(app => (app as any).type === 'day_blocked');

  useEffect(() => { setIsMounted(true); }, []);

  // EFECTO PARA AUTO-SCROLL DEL CARRUSEL
  useEffect(() => {
    if (isPaused) return;

    const interval = setInterval(() => {
      if (scrollRef.current) {
        const { scrollLeft, scrollWidth, clientWidth } = scrollRef.current;
        const isEnd = scrollLeft + clientWidth >= scrollWidth - 10;

        if (isEnd) {
          scrollRef.current.scrollTo({ left: 0, behavior: 'smooth' });
        } else {
          scrollRef.current.scrollBy({ left: 176, behavior: 'smooth' });
        }
      }
    }, 3000);

    return () => clearInterval(interval);
  }, [isPaused]);

  const openBookingModal = (time: string) => {
    setSelectedSlot(time);
    setClientName('');
    setClientPhone('');
    setErrors({ name: '', phone: '' });
    setShowOvertimeWarning(false);
    setBookingSuccess(false);
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

    if (hasError) { setErrors(newErrors); return; }

    if (selectedSlot && OVERTIME_SLOTS.includes(selectedSlot)) {
      setShowOvertimeWarning(true);
    } else {
      executeBooking();
    }
  };

  const executeBooking = async () => {
    if (!selectedSlot) return;
    setProcessing(true);

    const dateStr = format(selectedDate, 'yyyy-MM-dd');
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
      setBookingSuccess(true);

    } catch (error: any) {
      toast.error(typeof error === 'string' ? error : "Error al reservar");
    } finally {
      setProcessing(false);
    }
  };

  const openWhatsApp = () => {
    if (!selectedSlot) return;

    const isOvertime = OVERTIME_SLOTS.includes(selectedSlot);
    const fechaBonita = format(selectedDate, "EEEE d 'de' MMMM", { locale: es });
    const totalPrice = isOvertime ? BASE_PRICE + EXTRA_FEE : BASE_PRICE;
    const extraText = isOvertime ? ` *(Sobrecupo +$3.000)*` : "";

    const mensaje = `Hola Daniel! Soy *${clientName}*. Agendé para el *${fechaBonita}* a las *${selectedSlot}*${extraText}. Total: $${totalPrice.toLocaleString('es-CL')}. Mi número es ${clientPhone}.`;

    window.open(`https://wa.me/${BARBER_PHONE}?text=${encodeURIComponent(mensaje)}`, '_blank');
  };

  if (!isMounted) return <div className="h-screen flex items-center justify-center bg-slate-950"><Loader2 className="animate-spin text-slate-500" /></div>;

  return (
    <div className="max-w-md mx-auto bg-slate-950 min-h-screen pb-20 font-sans text-slate-200">

      {/* HEADER */}
      <div className="bg-slate-900 p-6 pb-8 rounded-b-3xl shadow-2xl shadow-black border-b border-slate-800">
        <div className="flex flex-col items-center text-center">
          <div className="w-24 h-24 rounded-full bg-slate-800 mb-4 overflow-hidden border-2 border-slate-700 shadow-lg">
            <img
              src="Foto_portada_dani.jpeg"
              alt="Logo"
              className="w-full h-full object-cover grayscale contrast-125"
            />
          </div>
          {/* CAMBIADO A FONT-SANS */}
          <h1 className="text-2xl font-bold text-white tracking-wider font-sans">Big Boss BarberShop</h1>

          <div className="text-slate-400 text-sm mt-2 flex items-start justify-center gap-1 max-w-[280px]">
            <MapPin size={16} className="mt-0.5 flex-shrink-0 text-red-600" />
            <a
              href="https://www.google.com/maps/search/?api=1&query=Las+Tortolas+26,+La+Islita,+Isla+de+Maipo"
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-white hover:underline transition-colors text-left leading-tight"
            >
              Las Tortolas 26, La Islita, Isla de Maipo (Ver mapa)
            </a>
          </div>

          <div className="flex items-center gap-1 mt-3 bg-slate-950 border border-slate-800 px-3 py-1 rounded-full">
            <Star size={12} className="text-amber-600 fill-amber-600" />
            <span className="text-xs font-bold text-slate-300">5.0 ESTRELLAS</span>
          </div>
 {/* --- BIOGRAFÍA AGREGADA */}
          <div className="mt-8 max-w-xs animate-in fade-in slide-in-from-bottom-4 duration-700">
            <div className="relative bg-slate-950/40 p-5 rounded-xl border border-slate-800/50 backdrop-blur-sm shadow-inner">
               {/* Icono de Cita Manual SVG */}
               <svg className="absolute -top-3 left-3 text-amber-700/40 fill-amber-900/20 w-6 h-6" xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M3 21c3 0 7-1 7-8V5c0-1.25-.756-2.017-2-2H4c-1.25 0-2 .75-2 1.972V11c0 1.25.75 2 2 2 1 0 1 0 1 1v1c0 1-1 2-2 2s-1 .008-1 1.031V20c0 1 0 1 1 1z" />
                  <path d="M15 21c3 0 7-1 7-8V5c0-1.25-.757-2.017-2-2h-4c-1.25 0-2 .75-2 1.972V11c0 1.25.75 2 2 2 1 0 1 0 1 1v1c0 1-1 2-2 2s-1 .008-1 1.031V20c0 1 0 1 1 1z" />
               </svg>
               
               <p className="text-xs text-slate-400 text-justify leading-relaxed font-light pt-2">
                 <span className="font-bold text-slate-200">Daniel Barrera</span>, profesional en barbería con estudios en Mario Mezza y participación en exposiciones como <span className="italic text-slate-300">“Expresión”</span> (liderado por Ema Medina, Andrea Migheti y Guille Larrosa).
                 <br/><br/>
                 Con 3 años de experiencia, en <span className="text-amber-600 font-bold tracking-wide">Big Boss</span> busco más que vender un corte: es dar una grata atención y hacerlos sentir cómodos a través de mi servicio. Queremos potenciar el atractivo del cliente, crear imágenes únicas y en un futuro formar profesionales del rubro.
               </p>
               
               <div className="w-8 h-1 bg-amber-800/30 mx-auto mt-4 rounded-full"></div>
            </div>
          </div>
          {/* ------------------------- */}
        </div>
      </div>

      {/* CARRUSEL DE IMÁGENES */}
      <div className="mt-6 pl-2 relative z-10">
        <h3 className="text-[10px] text-slate-500 uppercase tracking-widest font-bold mb-3 flex items-center gap-2 pl-2">
          <ImageIcon size={12} /> Estilos Recientes
        </h3>

        <div
          ref={scrollRef}
          // Eliminado touch-pan-x para permitir scroll vertical en móvil
          className="flex gap-4 overflow-x-auto pb-6 scrollbar-hide pr-4 snap-x"
          onMouseEnter={() => setIsPaused(true)}
          onMouseLeave={() => setIsPaused(false)}
          onTouchStart={() => setIsPaused(true)}
          onTouchEnd={() => setIsPaused(false)}
        >
          {GALLERY_IMAGES.map((img, index) => (
            <div
              key={index}
              // Se agregó 'active:' para feedback en móvil
              className="snap-center shrink-0 w-40 h-56 rounded-xl overflow-hidden border border-slate-800 shadow-lg relative group cursor-pointer transition-all duration-500 hover:border-amber-700/50 hover:shadow-amber-900/20 active:border-amber-700 active:shadow-amber-900/40 active:scale-95"
            >
              <img
                src={img}
                alt={`Corte ${index + 1}`}
                // AQUÍ EL CAMBIO CLAVE: group-active:grayscale-0
                className="w-full h-full object-cover grayscale group-hover:grayscale-0 group-active:grayscale-0 group-hover:scale-110 group-active:scale-110 transition-all duration-700 ease-out"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-transparent to-transparent opacity-80"></div>
              <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 group-active:opacity-100 transition-opacity duration-500 delay-100">
                <ZoomIn size={16} className="text-white/80" />
              </div>
              <div className="absolute bottom-3 left-0 right-0 text-center transform translate-y-2 group-hover:translate-y-0 transition-transform duration-500">
                <span className="text-[10px] font-black uppercase tracking-widest text-amber-500 border-b border-amber-500/0 group-hover:border-amber-500 pb-0.5">
                  Estilo {index + 1}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* TARJETAS SERVICIOS */}
      <div className="px-4 mt-2 space-y-3 relative z-10">
        <h3 className="text-[10px] text-slate-500 uppercase tracking-widest font-bold mb-3 flex items-center gap-2">
          <Scissors size={12} /> Servicios
        </h3>

        {/* Servicio 1 - CAMBIADO A FONT-SANS */}
        <div className="bg-slate-900 p-4 rounded-xl shadow-lg border border-slate-800 flex justify-between items-center group hover:border-slate-600 transition-colors">
          <div>
            <h3 className="font-bold text-gray-100">Corte de Pelo</h3>
            <p className="text-xs text-gray-400 mt-1 flex items-center gap-1">
              <Clock size={12} /> 1 hora • Corte & Estilo
            </p>
          </div>
          <div className="bg-emerald-950 border border-emerald-900 text-emerald-100 px-3 py-1 rounded text-sm font-bold shadow-inner">
            $10.000
          </div>
        </div>

        {/* Servicio 2 - CAMBIADO A FONT-SANS */}
        <div className="bg-slate-900 p-4 rounded-xl shadow-lg border border-slate-800 flex justify-between items-center group hover:border-slate-600 transition-colors">
          <div>
            <h3 className="font-bold text-gray-100">Barba</h3>
            <p className="text-xs text-gray-400 mt-1 flex items-center gap-1">
              <Clock size={12} /> 15 minutos • Perfilado
            </p>
          </div>
          <div className="bg-emerald-950 border border-emerald-900 text-emerald-100 px-3 py-1 rounded text-sm font-bold shadow-inner">
            +$4.000
          </div>
        </div>

        {/* Servicio 3 - CAMBIADO A FONT-SANS */}
        <div className="bg-slate-900 p-4 rounded-xl shadow-lg border border-slate-800 flex justify-between items-center group hover:border-slate-600 transition-colors">
          <div>
            <h3 className="font-bold text-gray-100">Cejas</h3>
            <p className="text-xs text-gray-400 mt-1 flex items-center gap-1">
              <Clock size={12} /> 15 minutos • Perfilado
            </p>
          </div>
          <div className="bg-emerald-950 border border-emerald-900 text-emerald-100 px-3 py-1 rounded text-sm font-bold shadow-inner">
            +$1.000
          </div>
        </div>

        {/* Sobrecupo - CAMBIADO A FONT-SANS */}
        <div className="bg-amber-950/20 p-4 rounded-xl shadow-sm border border-amber-900/30 flex justify-between items-center">
          <div>
            <h3 className="font-bold text-amber-600 uppercase text-xs tracking-wider font-sans">Sobrecupo (08-09 / 20-21 hrs)</h3>
            <p className="text-[10px] text-amber-700/80 mt-1 flex items-center gap-1">
              <AlertTriangle size={10} /> Horario extendido
            </p>
          </div>
          <div className="bg-amber-900/40 text-amber-500 border border-amber-900/50 px-3 py-1 rounded text-sm font-bold">
            +$3.000
          </div>
        </div>
      </div>

      {/* CALENDARIO */}
      <div className="mt-10 px-4">
        <h3 className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-4 pl-1">Selecciona el día</h3>
        <div className="flex gap-3 overflow-x-auto pb-4 scrollbar-hide">
          {days.map((day) => {
            const isSelected = isSameDay(day, selectedDate);
            return (
              <button
                key={day.toISOString()}
                onClick={() => setSelectedDate(day)}
                className={`
                  flex-shrink-0 flex flex-col items-center justify-center w-16 h-20 rounded-lg border transition-all duration-300
                  ${isSelected
                    ? 'bg-slate-200 text-black border-white shadow-[0_0_15px_rgba(255,255,255,0.1)] scale-105'
                    : 'bg-slate-900 text-slate-600 border-slate-800 hover:border-slate-600 hover:text-slate-400'
                  }
                `}
              >
                <span className="text-[10px] uppercase font-bold tracking-wider">{format(day, 'EEE', { locale: es }).replace('.', '')}</span>
                {/* CAMBIADO A FONT-SANS */}
                <span className="text-lg font-semibold font-sans">{format(day, 'd')}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* GRILLA HORARIOS */}
      <div className="px-4 mt-4">
        <h3 className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-4 pl-1">
          Horarios ({format(selectedDate, 'EEEE d', { locale: es })})
        </h3>

        {loading ? <div className="flex justify-center py-10"><Loader2 className="animate-spin text-slate-600" /></div> :
          isDayBlocked ? (
            <div className="bg-red-950/20 border border-red-900/30 rounded-xl p-8 text-center animate-in fade-in">
              <CalendarX className="mx-auto text-red-800 mb-3" size={32} />
              <h3 className="text-red-700 font-bold uppercase tracking-wider">Cerrado por hoy</h3>
              <p className="text-red-900/50 text-xs mt-1">Por orden de los Peaky Blinders.</p>
            </div>
          ) : (
            <div className="grid grid-cols-3 sm:grid-cols-4 gap-3">
              {HOURS.map((time) => {
                const isTaken = appointments.some(app => app.time === time);
                const now = new Date();
                const isToday = isSameDay(selectedDate, now);
                const [slotHour] = time.split(':').map(Number);
                const isPast = isToday && slotHour <= now.getHours();
                const isDisabled = isTaken || isPast;
                const isOvertime = OVERTIME_SLOTS.includes(time);

                return (
                  <button
                    key={time}
                    disabled={isDisabled}
                    onClick={() => openBookingModal(time)}
                    className={`
                    py-3 rounded-lg font-bold text-xs sm:text-sm transition-all border relative flex flex-col items-center justify-center gap-1
                    ${isDisabled
                        ? 'bg-slate-950 text-slate-800 border-transparent cursor-not-allowed opacity-50'
                        : isOvertime
                          ? 'bg-amber-950/20 text-amber-600 border-amber-900/30 hover:bg-amber-900/40 hover:border-amber-700'
                          : 'bg-slate-800 text-slate-300 border-slate-700 hover:bg-slate-200 hover:text-black hover:border-white'
                      }
                  `}
                  >
                    {time}
                    {isOvertime && !isDisabled && (
                      <span className="text-[8px] font-black uppercase tracking-wide text-amber-700">Extra</span>
                    )}
                  </button>
                );
              })}
            </div>
          )}
      </div>

      <div className="text-center mt-12 text-slate-700 text-[10px] uppercase tracking-widest pb-10">By order of Big Boss Barber</div>

      {/* MODAL PRINCIPAL */}
      {selectedSlot && (
        <div className="fixed inset-0 bg-black/80 z-50 flex items-end sm:items-center justify-center backdrop-blur-md p-4 animate-in fade-in duration-300">
          <div className="bg-slate-900 w-full max-w-sm rounded-2xl p-6 shadow-2xl border border-slate-800 animate-in slide-in-from-bottom-10">

            {/* --- ESCENARIO 1: ÉXITO --- */}
            {bookingSuccess ? (
              <div className="text-center py-6">
                <div className="w-20 h-20 bg-emerald-950/50 border border-emerald-900 rounded-full flex items-center justify-center mx-auto mb-6">
                  <MessageCircle className="text-emerald-500" size={32} />
                </div>
                <h3 className="text-2xl font-black text-white mb-2 uppercase tracking-wide">Cita Reservada</h3>
                <p className="text-slate-400 text-sm mb-8 px-4">
                  El trato está hecho. Ahora confirma con Daniel por WhatsApp.
                </p>
                <button
                  onClick={openWhatsApp}
                  className="w-full bg-emerald-700 text-white font-bold py-4 rounded-lg text-sm uppercase tracking-widest hover:bg-emerald-600 transition-all shadow-[0_0_20px_rgba(4,120,87,0.2)] flex items-center justify-center gap-2"
                >
                  Confirmar <ChevronRight size={16} />
                </button>
                <button
                  onClick={() => setSelectedSlot(null)}
                  className="mt-6 text-slate-600 text-xs hover:text-white uppercase tracking-widest"
                >
                  Cerrar
                </button>
              </div>
            ) : (
              /* --- ESCENARIO 2: FORMULARIO --- */
              <>
                {!showOvertimeWarning && (
                  <>
                    <div className="flex justify-between items-start mb-8 border-b border-slate-800 pb-4">
                      <div>
                        <p className="text-[10px] text-slate-500 uppercase tracking-widest font-bold mb-1">Nueva Reserva</p>
                        {/* CAMBIADO A FONT-SANS */}
                        <h3 className="text-3xl font-black text-white flex items-center gap-2 font-sans">
                          {selectedSlot}
                          {OVERTIME_SLOTS.includes(selectedSlot) && <span className="text-[10px] bg-amber-900/40 text-amber-500 border border-amber-900 px-2 py-1 rounded ml-2 font-sans tracking-wide">EXTRA</span>}
                        </h3>
                        <p className="text-sm text-slate-400 capitalize mt-1">{format(selectedDate, "EEEE d 'de' MMMM", { locale: es })}</p>
                      </div>
                      <button onClick={() => setSelectedSlot(null)} className="text-slate-500 hover:text-white transition-colors"><X size={24} /></button>
                    </div>

                    <form onSubmit={handleInitialSubmit} className="space-y-5">
                      {/* Input Nombre */}
                      <div className={`bg-slate-950 p-4 rounded-lg border transition-all ${errors.name ? 'border-red-900' : 'border-slate-800 focus-within:border-white'}`}>
                        <label className="text-[10px] text-slate-500 font-bold block mb-2 uppercase tracking-wider">Tu Nombre</label>
                        <input autoFocus className="w-full bg-transparent outline-none font-bold text-lg text-white placeholder-slate-700" placeholder="Ej: Thomas Shelby" value={clientName} onChange={handleNameChange} />
                        {errors.name && <p className="text-xs text-red-500 mt-2 flex items-center gap-1">{errors.name}</p>}
                      </div>

                      {/* Input Teléfono */}
                      <div className={`bg-slate-950 p-4 rounded-lg border transition-all ${errors.phone ? 'border-red-900' : 'border-slate-800 focus-within:border-white'}`}>
                        <label className="text-[10px] text-slate-500 font-bold block mb-2 uppercase tracking-wider">WhatsApp</label>
                        <div className="flex items-center gap-3">
                          <span className="text-slate-500 font-bold text-lg">+56</span>
                          <input type="tel" className="w-full bg-transparent outline-none font-bold text-lg text-white placeholder-slate-700" placeholder="9 1234 5678" value={clientPhone} onChange={handlePhoneChange} />
                        </div>
                        {errors.phone && <p className="text-xs text-red-500 mt-2 flex items-center gap-1">{errors.phone}</p>}
                      </div>

                      {/* Botón Principal */}
                      <button
                        disabled={processing || !clientName || !clientPhone}
                        className="w-full bg-slate-200 text-black font-black py-4 rounded-lg text-sm uppercase tracking-widest hover:bg-white hover:scale-[1.01] active:scale-95 transition-all flex justify-center items-center gap-2 disabled:opacity-30 disabled:scale-100 mt-6"
                      >
                        {processing ? <Loader2 className="animate-spin" /> : "Confirmar"}
                      </button>
                    </form>
                  </>
                )}

                {/* ADVERTENCIA SOBRECUPO */}
                {showOvertimeWarning && (
                  <div className="text-center animate-in slide-in-from-right-10 fade-in">
                    <div className="w-16 h-16 bg-amber-900/20 border border-amber-900/50 rounded-full flex items-center justify-center mx-auto mb-6">
                      <AlertTriangle className="text-amber-600" size={32} />
                    </div>
                    {/* CAMBIADO A FONT-SANS */}
                    <h3 className="text-xl font-bold text-white mb-2 font-sans uppercase tracking-wide">Tarifa Especial</h3>

                    <div className="bg-slate-950 p-5 rounded-lg text-left mb-8 border border-slate-800">
                      <div className="flex justify-between items-center text-sm mb-3 text-slate-400">
                        <span>Corte Base</span><span>${BASE_PRICE.toLocaleString('es-CL')}</span>
                      </div>
                      <div className="flex justify-between items-center text-sm mb-4 text-amber-600 font-bold">
                        <span>Horario Extra</span><span>+${EXTRA_FEE.toLocaleString('es-CL')}</span>
                      </div>
                      <div className="border-t border-slate-800 pt-3 flex justify-between items-center font-black text-xl text-white">
                        <span>Total</span><span>${(BASE_PRICE + EXTRA_FEE).toLocaleString('es-CL')}</span>
                      </div>
                    </div>

                    <div className="flex gap-3">
                      <button onClick={() => setShowOvertimeWarning(false)} className="flex-1 py-3 text-slate-500 font-bold hover:text-white uppercase text-xs tracking-widest">Volver</button>
                      <button onClick={executeBooking} className="flex-1 bg-amber-700 text-white font-bold py-3 rounded-lg hover:bg-amber-600 shadow-lg text-xs uppercase tracking-widest">
                        {processing ? <Loader2 className="animate-spin inline" /> : "Aceptar"}
                      </button>
                    </div>
                  </div>
                )}
              </>
            )}

          </div>
        </div>
      )}
    </div>
  );
}