'use client'

import React, { useState, useEffect } from 'react';
import { signInWithEmailAndPassword, onAuthStateChanged, signOut } from 'firebase/auth';
import { deleteDoc, doc, setDoc, updateDoc } from 'firebase/firestore';
// Tus imports locales se mantienen intactos
import { auth, db } from '@/src/lib/firebase';
import { useAppointments } from '@/src/hooks/useAppointments';
import { toast } from 'sonner';
// Agregamos Sun y Moon para el botón de cambio de tema
import { Trash2, LogOut, User, Phone, Edit2, X, Ban, CheckCircle, History, ChevronLeft, ChevronRight, PlusCircle, UserCheck, Save, Loader2, Sun, Moon } from 'lucide-react';
import { format, startOfWeek, endOfWeek, eachDayOfInterval, addWeeks, subWeeks, isSameDay, isToday } from 'date-fns';
import { es } from 'date-fns/locale';

const HOURS: string[] = [
  '08:00', '09:00', '10:00', '11:00', '12:00', '13:00',
  '14:00', '15:00', '16:00', '17:00', '18:00', '19:00',
  '20:00', '21:00'
];

export default function AdminPage() {
  const [user, setUser] = useState<any>(null);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loadingAuth, setLoadingAuth] = useState(true);

  // --- ESTADO PARA EL TEMA (Light / Dark) ---
  const [isDarkMode, setIsDarkMode] = useState(false); // Por defecto claro, cambiar a true si prefieres oscuro por defecto
  // ------------------------------------------

  const [date, setDate] = useState(new Date());

  // NAVEGACIÓN SEMANAL
  const [viewWeekStart, setViewWeekStart] = useState(startOfWeek(new Date(), { weekStartsOn: 1 }));

  const { appointments, loading } = useAppointments(date);
  const [editingApp, setEditingApp] = useState<any>(null);

  // --- NUEVOS ESTADOS PARA AGREGAR MANUALMENTE ---
  const [showAddModal, setShowAddModal] = useState(false);
  const [newApp, setNewApp] = useState({ time: '', name: '', phone: '' });

  const [showHistory, setShowHistory] = useState(false);

  const isDayBlocked = appointments.some(app => (app as any).type === 'day_blocked');

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (u) => {
      setUser(u);
      setLoadingAuth(false);
    });
    return () => unsub();
  }, []);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await signInWithEmailAndPassword(auth, email, password);
      toast.success("Bienvenido Jefe");
    } catch (error) { toast.error("Credenciales incorrectas"); }
  };

  const handleLogout = async () => { await signOut(auth); };

  // --- LOGICA DE NAVEGACIÓN ---
  const weekDays = eachDayOfInterval({
    start: viewWeekStart,
    end: endOfWeek(viewWeekStart, { weekStartsOn: 1 })
  });

  const nextWeek = () => setViewWeekStart(addWeeks(viewWeekStart, 1));
  const prevWeek = () => setViewWeekStart(subWeeks(viewWeekStart, 1));
  const selectDay = (day: Date) => {
    setDate(day);
    setShowHistory(false);
  };

  // --- ACCIONES ADMIN ---
  const toggleBlockDay = async () => {
    const dateStr = format(date, 'yyyy-MM-dd');
    const blockDocId = `${dateStr}-BLOCK`;
    
    try {
      if (isDayBlocked) {
        if (!confirm("¿Abrir agenda?")) return;
        await deleteDoc(doc(db, "appointments", blockDocId));
        toast.success("Abierto");
      } else {
        if (!confirm("¿Cerrar día?")) return;
        await setDoc(doc(db, "appointments", blockDocId), {
          date: dateStr,
          type: 'day_blocked',
          createdAt: new Date().toISOString()
        });
        toast.success("Cerrado");
      }
    } catch (e: any) {
      console.error(e);
      toast.error("Error al cambiar estado");
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("¿Eliminar?")) return;
    try { await deleteDoc(doc(db, "appointments", id)); toast.success("Eliminado"); } catch (e) { toast.error("Error"); }
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingApp) return;
    try {
      await updateDoc(doc(db, "appointments", editingApp.id), { clientName: editingApp.clientName, clientPhone: editingApp.clientPhone });
      toast.success("Actualizado");
      setEditingApp(null);
    } catch (error) { toast.error("Error"); }
  };

  const handleManualAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newApp.time || !newApp.name) {
      toast.error("Faltan datos");
      return;
    }

    const dateStr = format(date, 'yyyy-MM-dd');
    const appointmentId = `${dateStr}-${newApp.time}`;

    const exists = appointments.some(app => (app as any).time === newApp.time && (app as any).type === 'booking');
    if (exists) {
      toast.error("Esa hora ya está reservada");
      return;
    }

    try {
      await setDoc(doc(db, "appointments", appointmentId), {
        date: dateStr,
        time: newApp.time,
        clientName: newApp.name,
        clientPhone: newApp.phone || 'Manual/Presencial',
        type: 'booking',
        isManual: true, 
        createdAt: new Date().toISOString()
      });
      toast.success("Cliente agregado correctamente");
      setShowAddModal(false);
      setNewApp({ time: '', name: '', phone: '' });
    } catch (error) {
      toast.error("Error al guardar");
    }
  };

  // --- LÓGICA FILTRADO ---
  const now = new Date();
  const isSelectedDateToday = isSameDay(date, now);
  const currentHour = now.getHours();

  const bookingApps = appointments.filter(app => (app as any).type === 'booking');

  const upcomingAppointments = bookingApps.filter(app => {
    if (date > now && !isSelectedDateToday) return true;
    if (date < now && !isSelectedDateToday) return false;
    const [appHour] = (app as any).time.split(':').map(Number);
    return appHour > currentHour;
  }).sort((a: any, b: any) => a.time.localeCompare(b.time));

  const pastAppointments = bookingApps.filter(app => {
    if (date > now && !isSelectedDateToday) return false;
    if (date < now && !isSelectedDateToday) return true;
    const [appHour] = (app as any).time.split(':').map(Number);
    return appHour <= currentHour;
  }).sort((a: any, b: any) => b.time.localeCompare(a.time));


  if (loadingAuth) return <div className="p-10 text-center animate-pulse flex justify-center h-screen items-center bg-slate-900"><Loader2 className="animate-spin text-slate-500"/></div>;

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-950 p-4 font-sans">
        <form onSubmit={handleLogin} className="bg-slate-900 p-8 rounded-2xl w-full max-w-sm shadow-2xl border border-slate-800">
          <div className="w-16 h-16 bg-slate-800 rounded-full flex items-center justify-center mx-auto mb-4 text-slate-200 border border-slate-700">
             <UserCheck size={32}/>
          </div>
          <h1 className="text-2xl font-bold text-center mb-6 text-white tracking-wide">Acceso Admin</h1>
          <input type="email" placeholder="Email" className="w-full bg-slate-950 border border-slate-800 text-white p-3 rounded-xl mb-3 focus:ring-1 focus:ring-slate-500 outline-none placeholder-slate-600" onChange={e => setEmail(e.target.value)} />
          <input type="password" placeholder="Contraseña" className="w-full bg-slate-950 border border-slate-800 text-white p-3 rounded-xl mb-6 focus:ring-1 focus:ring-slate-500 outline-none placeholder-slate-600" onChange={e => setPassword(e.target.value)} />
          <button className="w-full bg-slate-200 text-slate-900 font-bold py-4 rounded-xl hover:bg-white transition shadow-lg uppercase tracking-wider">Entrar</button>
        </form>
      </div>
    );
  }

  return (
    // CAMBIO: Clases dinámicas en el contenedor principal
    <div className={`min-h-screen font-sans pb-20 transition-colors duration-300 ${isDarkMode ? 'bg-slate-950 text-slate-200' : 'bg-slate-50 text-slate-900'}`}>
      <div className="max-w-md mx-auto">
        
        {/* HEADER */}
        <div className={`p-4 shadow-sm border-b flex justify-between items-center sticky top-0 z-10 transition-colors ${isDarkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-100'}`}>
          <div>
            <h1 className={`font-bold text-lg ${isDarkMode ? 'text-white' : 'text-slate-800'}`}>Barber Admin</h1>
            <p className="text-xs text-slate-400 capitalize">{format(date, "EEEE d 'de' MMMM", { locale: es })}</p>
          </div>
          
          <div className="flex gap-2">
            {/* BOTÓN CAMBIO DE TEMA */}
            <button 
              onClick={() => setIsDarkMode(!isDarkMode)} 
              className={`p-2 rounded-lg transition-colors ${isDarkMode ? 'bg-slate-800 text-amber-500 hover:bg-slate-700' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
            >
              {isDarkMode ? <Sun size={20} /> : <Moon size={20} />}
            </button>

            <button 
              onClick={handleLogout} 
              className={`p-2 rounded-lg transition-colors text-slate-400 hover:text-red-500 ${isDarkMode ? 'bg-slate-800 hover:bg-slate-700' : 'bg-slate-50 hover:bg-slate-100'}`}
            >
              <LogOut size={20}/>
            </button>
          </div>
        </div>
        
        {/* NAVEGACIÓN SEMANAL */}
        <div className={`pb-4 shadow-sm mb-4 transition-colors ${isDarkMode ? 'bg-slate-900 border-b border-slate-800 shadow-md' : 'bg-white'}`}>
          <div className="flex justify-between items-center px-4 py-2 mb-2">
            <button onClick={prevWeek} className={`p-1 rounded-full ${isDarkMode ? 'hover:bg-slate-800 text-slate-400' : 'hover:bg-slate-100 text-slate-600'}`}><ChevronLeft size={20}/></button>
            <span className={`text-sm font-bold capitalize ${isDarkMode ? 'text-slate-300' : 'text-slate-600'}`}>
              {format(viewWeekStart, 'MMMM yyyy', { locale: es })}
            </span>
            <button onClick={nextWeek} className={`p-1 rounded-full ${isDarkMode ? 'hover:bg-slate-800 text-slate-400' : 'hover:bg-slate-100 text-slate-600'}`}><ChevronRight size={20}/></button>
          </div>

          <div className="flex justify-between px-2 gap-1 overflow-x-auto scrollbar-hide">
            {weekDays.map((day) => {
              const isSelected = isSameDay(day, date);
              const isTodayDay = isToday(day);

              return (
                <button
                  key={day.toISOString()}
                  onClick={() => selectDay(day)}
                  className={`
                    flex flex-col items-center justify-center p-2 rounded-xl min-w-[3rem] transition-all relative
                    ${isSelected 
                      ? (isDarkMode ? 'bg-slate-200 text-slate-950 shadow-md scale-105 z-10' : 'bg-black text-white shadow-md scale-105 z-10')
                      : (isDarkMode ? 'bg-transparent text-slate-500 hover:bg-slate-800' : 'bg-transparent text-slate-500 hover:bg-slate-50')
                    }
                  `}
                >
                  <span className="text-[10px] uppercase font-bold mb-1 opacity-80">
                    {format(day, 'EEE', { locale: es }).replace('.', '')}
                  </span>
                  <span className={`text-lg font-bold ${isTodayDay && !isSelected ? 'text-blue-600' : ''}`}>
                    {format(day, 'd')}
                  </span>
                  {isTodayDay && (
                    <span className={`absolute bottom-1 w-1 h-1 rounded-full ${isSelected ? (isDarkMode ? 'bg-slate-950' : 'bg-white') : 'bg-blue-600'}`}></span>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        <div className="px-4">
          
          {!showHistory && (
            <div className="flex gap-2 mb-4">
               {/* BOTÓN AGREGAR (Color condicional) */}
              <button 
                onClick={() => setShowAddModal(true)}
                className={`flex-1 py-3 rounded-xl font-bold flex items-center justify-center gap-2 shadow-lg text-xs sm:text-sm active:scale-95 transition-all ${isDarkMode ? 'bg-amber-700 text-white hover:bg-amber-600' : 'bg-slate-900 text-white hover:bg-slate-800'}`}
              >
                <PlusCircle size={18} /> AGREGAR CLIENTE
              </button>

               {/* BOTÓN CERRAR DÍA */}
              <button 
                onClick={toggleBlockDay}
                className={`flex-1 py-3 rounded-xl font-bold flex items-center justify-center gap-2 shadow-sm text-xs sm:text-sm transition-all border ${
                  isDayBlocked 
                    ? 'bg-red-50 text-red-600 border-red-200' // Igual en ambos para destacar peligro
                    : (isDarkMode ? 'bg-slate-800 text-slate-300 border-slate-700 hover:bg-slate-700' : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50')
                }`}
              >
                {isDayBlocked ? <><CheckCircle size={18}/> ABRIR DÍA</> : <><Ban size={18}/> CERRAR DÍA</>}
              </button>
            </div>
          )}

          {/* TABS */}
          <div className={`flex p-1 rounded-xl shadow-sm mb-4 border transition-colors ${isDarkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'}`}>
            <button 
              onClick={() => setShowHistory(false)}
              className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all ${!showHistory ? (isDarkMode ? 'bg-slate-700 text-white shadow-sm' : 'bg-black text-white') : 'text-slate-400'}`}
            >
              Pendientes ({upcomingAppointments.length})
            </button>
            <button 
              onClick={() => setShowHistory(true)}
              className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-1 ${showHistory ? (isDarkMode ? 'bg-slate-700 text-white shadow-sm' : 'bg-black text-white') : 'text-slate-400'}`}
            >
              <History size={14}/> Historial ({pastAppointments.length})
            </button>
          </div>

          {/* LISTA RESERVAS */}
          <div className="space-y-3 pb-10">
            {loading && <p className="text-center py-10 text-slate-400 text-sm animate-pulse">Buscando citas...</p>}
            
            {/* VISTA PENDIENTES */}
            {!showHistory && (
              <>
                {!loading && !isDayBlocked && upcomingAppointments.length === 0 && (
                  <div className={`text-center py-12 rounded-xl border border-dashed opacity-60 ${isDarkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'}`}>
                    <CheckCircle className={`mx-auto mb-2 ${isDarkMode ? 'text-slate-700' : 'text-slate-300'}`} size={32}/>
                    <p className="text-slate-500 font-medium text-sm">Todo libre por hoy</p>
                  </div>
                )}

                {upcomingAppointments.map((app: any) => (
                  <div key={app.id} className={`p-4 rounded-2xl shadow-sm border flex flex-col gap-3 transition-colors ${
                    (app as any).isManual 
                      ? (isDarkMode ? 'bg-blue-950/20 border-blue-900/30' : 'bg-blue-50/50 border-blue-100') // Estilo Manual
                      : (isDarkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-100') // Estilo Normal
                  }`}>
                    <div className={`flex justify-between items-center border-b pb-2 ${isDarkMode ? 'border-slate-800' : 'border-slate-50'}`}>
                      <div className="flex items-center gap-3">
                        <span className={`text-2xl font-black tracking-tight ${isDarkMode ? 'text-white' : 'text-slate-800'}`}>{app.time}</span>
                        
                        {(app as any).isOvertime && (
                          <span className="text-[10px] bg-amber-100 text-amber-800 px-2 py-0.5 rounded-full font-bold">SOBRECUPO</span>
                        )}
                        
                        {(app as any).isManual && (
                          <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold flex items-center gap-1 ${isDarkMode ? 'bg-blue-900/30 text-blue-400 border border-blue-900/50' : 'bg-blue-100 text-blue-800'}`}><UserCheck size={10}/> MANUAL</span>
                        )}
                        
                        <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
                      </div>
                      <div className="flex gap-1">
                        <button onClick={() => setEditingApp(app)} className={`p-2 rounded-full transition ${isDarkMode ? 'bg-slate-800 text-slate-400 hover:bg-blue-900/50 hover:text-blue-400' : 'bg-slate-50 text-slate-600 hover:bg-blue-50 hover:text-blue-600'}`}><Edit2 size={16}/></button>
                        <button onClick={() => handleDelete(app.id)} className={`p-2 rounded-full transition ${isDarkMode ? 'bg-slate-800 text-slate-400 hover:bg-red-900/50 hover:text-red-400' : 'bg-slate-50 text-slate-600 hover:bg-red-50 hover:text-red-600'}`}><Trash2 size={16}/></button>
                      </div>
                    </div>
                    
                    <div className="flex flex-col gap-1 px-1">
                      <div className="flex items-center gap-2">
                        <User size={14} className={isDarkMode ? 'text-slate-500' : 'text-slate-400'} />
                        <span className={`font-bold text-base ${isDarkMode ? 'text-slate-200' : 'text-slate-700'}`}>{app.clientName}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Phone size={14} className={isDarkMode ? 'text-slate-500' : 'text-slate-400'} />
                        <a href={`tel:${(app as any).clientPhone}`} className={`text-sm font-medium hover:underline ${isDarkMode ? 'text-slate-400 hover:text-white' : 'text-slate-500 hover:text-blue-600'}`}>
                          {(app as any).clientPhone || 'Sin teléfono'}
                        </a>
                      </div>
                    </div>
                  </div>
                ))}
              </>
            )}

            {/* VISTA HISTORIAL */}
            {showHistory && (
              <div className={`rounded-2xl shadow-sm border overflow-hidden ${isDarkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-100'}`}>
                {pastAppointments.length === 0 ? (
                  <p className="text-center py-8 text-slate-400 text-sm">Sin historial hoy.</p>
                ) : (
                  <div className={`divide-y ${isDarkMode ? 'divide-slate-800' : 'divide-slate-50'}`}>
                    {pastAppointments.map((app: any) => (
                      <div key={app.id} className={`p-4 flex items-center justify-between transition ${isDarkMode ? 'hover:bg-slate-800/50' : 'hover:bg-slate-50'}`}>
                        <div className="flex items-center gap-4 opacity-60">
                          <span className="font-mono text-slate-500 font-bold">{app.time}</span>
                          <div>
                             <p className={`font-bold text-sm line-through decoration-slate-300 flex items-center gap-2 ${isDarkMode ? 'text-slate-400' : 'text-slate-700'}`}>
                               {app.clientName}
                               {(app as any).isManual && <UserCheck size={12} className={isDarkMode ? 'text-blue-500' : 'text-blue-400'}/>}
                             </p>
                          </div>
                        </div>
                        <button onClick={() => handleDelete(app.id)} className="text-slate-200 hover:text-red-400 p-2">
                          <X size={16}/>
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* MODAL EDITAR */}
      {editingApp && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
          <div className={`w-full max-w-sm rounded-3xl p-6 shadow-2xl ${isDarkMode ? 'bg-slate-900 border border-slate-800' : 'bg-white'}`}>
            <h3 className={`font-bold text-lg mb-6 text-center ${isDarkMode ? 'text-white' : 'text-slate-800'}`}>Editar Reserva</h3>
            <form onSubmit={handleUpdate} className="space-y-4">
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-400 ml-1">Nombre</label>
                <input className={`w-full border-none p-4 rounded-xl font-bold outline-none focus:ring-2 ${isDarkMode ? 'bg-slate-950 text-white focus:ring-slate-500' : 'bg-slate-50 text-slate-800 focus:ring-black'}`} value={editingApp.clientName} onChange={e => setEditingApp({...editingApp, clientName: e.target.value})} />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-400 ml-1">Teléfono</label>
                <input className={`w-full border-none p-4 rounded-xl font-bold outline-none focus:ring-2 ${isDarkMode ? 'bg-slate-950 text-white focus:ring-slate-500' : 'bg-slate-50 text-slate-800 focus:ring-black'}`} value={editingApp.clientPhone} onChange={e => setEditingApp({...editingApp, clientPhone: e.target.value})} />
              </div>
              <div className="flex gap-3 pt-4">
                <button type="button" onClick={() => setEditingApp(null)} className={`flex-1 py-4 font-bold rounded-xl transition ${isDarkMode ? 'text-slate-400 hover:bg-slate-800' : 'text-slate-500 hover:bg-slate-50'}`}>Cancelar</button>
                <button className={`flex-1 font-bold py-4 rounded-xl hover:scale-[1.02] transition shadow-lg ${isDarkMode ? 'bg-slate-200 text-slate-900 hover:bg-white' : 'bg-black text-white'}`}>Guardar</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* --- MODAL AGREGAR MANUAL --- */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4 backdrop-blur-sm animate-in fade-in">
          <div className={`w-full max-w-sm rounded-3xl p-6 shadow-2xl relative ${isDarkMode ? 'bg-slate-900 border border-slate-800' : 'bg-white'}`}>
            <button onClick={() => setShowAddModal(false)} className="absolute top-4 right-4 text-slate-300 hover:text-slate-600"><X/></button>
            
            <div className="text-center mb-6">
              <div className={`w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-3 ${isDarkMode ? 'bg-slate-800 text-slate-200' : 'bg-slate-100 text-slate-800'}`}>
                <UserCheck size={24} />
              </div>
              <h3 className={`font-bold text-xl ${isDarkMode ? 'text-white' : 'text-slate-800'}`}>Cliente Presencial</h3>
              <p className="text-xs text-slate-400 mt-1">Registrar corte sin reserva previa</p>
            </div>

            <form onSubmit={handleManualAdd} className="space-y-4">
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-400 ml-1">Hora del corte</label>
                <div className="relative">
                  <select 
                    className={`w-full border-none p-4 rounded-xl font-bold outline-none appearance-none focus:ring-2 ${isDarkMode ? 'bg-slate-950 text-white focus:ring-slate-500' : 'bg-slate-50 text-slate-800 focus:ring-black'}`}
                    value={newApp.time}
                    onChange={e => setNewApp({...newApp, time: e.target.value})}
                  >
                    <option value="" className={isDarkMode ? 'bg-slate-900' : ''}>Seleccionar Hora...</option>
                    {HOURS.map(h => (
                      <option key={h} value={h} className={isDarkMode ? 'bg-slate-900' : ''}>{h}</option>
                    ))}
                  </select>
                  <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400">
                    <History size={16}/>
                  </div>
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-400 ml-1">Nombre Cliente</label>
                <input 
                  className={`w-full border-none p-4 rounded-xl font-bold outline-none focus:ring-2 ${isDarkMode ? 'bg-slate-950 text-white focus:ring-slate-500 placeholder-slate-700' : 'bg-slate-50 text-slate-800 focus:ring-black'}`}
                  placeholder="Ej: Cliente Walk-in"
                  value={newApp.name} 
                  onChange={e => setNewApp({...newApp, name: e.target.value})} 
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-400 ml-1">Teléfono (Opcional)</label>
                <input 
                  className={`w-full border-none p-4 rounded-xl font-bold outline-none focus:ring-2 ${isDarkMode ? 'bg-slate-950 text-white focus:ring-slate-500 placeholder-slate-700' : 'bg-slate-50 text-slate-800 focus:ring-black'}`}
                  placeholder="Solo si lo tienes"
                  value={newApp.phone} 
                  onChange={e => setNewApp({...newApp, phone: e.target.value})} 
                />
              </div>

              <button className={`w-full font-bold py-4 rounded-xl hover:scale-[1.02] transition shadow-lg mt-2 flex items-center justify-center gap-2 ${isDarkMode ? 'bg-amber-700 text-white hover:bg-amber-600' : 'bg-slate-900 text-white'}`}>
                <Save size={18} /> Registrar Corte
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}