'use client'

import { useState, useEffect } from 'react';
import { signInWithEmailAndPassword, onAuthStateChanged, signOut } from 'firebase/auth';
import { deleteDoc, doc, setDoc, updateDoc } from 'firebase/firestore';
import { auth, db } from '@/src/lib/firebase';
import { useAppointments } from '@/src/hooks/useAppointments';
import { toast } from 'sonner';
import { Trash2, LogOut, User, Phone, Edit2, X, Ban, CheckCircle, History, ChevronLeft, ChevronRight } from 'lucide-react';
import { format, startOfWeek, endOfWeek, eachDayOfInterval, addWeeks, subWeeks, isSameDay, isToday } from 'date-fns';
import { es } from 'date-fns/locale';

export default function AdminPage() {
  const [user, setUser] = useState<any>(null);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loadingAuth, setLoadingAuth] = useState(true);
  
  const [date, setDate] = useState(new Date());
  
  // NAVEGACIÓN SEMANAL
  const [viewWeekStart, setViewWeekStart] = useState(startOfWeek(new Date(), { weekStartsOn: 1 }));

  const { appointments, loading } = useAppointments(date);
  const [editingApp, setEditingApp] = useState<any>(null);
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
    // Ya no necesitamos hack de horas, solo pasar el día
    setDate(day);
    setShowHistory(false);
  };

  // --- ACCIONES ADMIN ---
  const toggleBlockDay = async () => {
    // CORRECCIÓN: Usar format para consistencia de fecha
    const dateStr = format(date, 'yyyy-MM-dd');
    const blockDocId = `${dateStr}-BLOCK`;
    
    try {
      if (isDayBlocked) {
        if(!confirm("¿Abrir agenda?")) return;
        await deleteDoc(doc(db, "appointments", blockDocId));
        toast.success("Abierto");
      } else {
        if(!confirm("¿Cerrar día?")) return;
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
    if(!confirm("¿Eliminar?")) return;
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

  // --- LÓGICA FILTRADO ---
  const now = new Date();
  const isSelectedDateToday = isSameDay(date, now);
  const currentHour = now.getHours();

  const bookingApps = appointments.filter(app => (app as any).type === 'booking');

  const upcomingAppointments = bookingApps.filter(app => {
    if (date > now && !isSelectedDateToday) return true;
    if (date < now && !isSelectedDateToday) return false;
    const [appHour] = app.time.split(':').map(Number);
    return appHour > currentHour;
  }).sort((a,b) => a.time.localeCompare(b.time));

  const pastAppointments = bookingApps.filter(app => {
    if (date > now && !isSelectedDateToday) return false;
    if (date < now && !isSelectedDateToday) return true;
    const [appHour] = app.time.split(':').map(Number);
    return appHour <= currentHour;
  }).sort((a,b) => b.time.localeCompare(a.time));


  if (loadingAuth) return <div className="p-10 text-center animate-pulse">Cargando sistema...</div>;

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-900 p-4">
        <form onSubmit={handleLogin} className="bg-white p-8 rounded-2xl w-full max-w-sm">
          <h1 className="text-2xl font-bold text-center mb-6">Acceso Admin</h1>
          <input type="email" placeholder="Email" className="w-full border p-3 rounded mb-3" onChange={e => setEmail(e.target.value)} />
          <input type="password" placeholder="Contraseña" className="w-full border p-3 rounded mb-3" onChange={e => setPassword(e.target.value)} />
          <button className="w-full bg-black text-white font-bold py-3 rounded">Entrar</button>
        </form>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 font-sans pb-20">
      <div className="max-w-md mx-auto">
        
        {/* HEADER SIMPLE */}
        <div className="bg-white p-4 shadow-sm border-b border-slate-100 flex justify-between items-center sticky top-0 z-10">
          <div>
            <h1 className="font-bold text-lg text-slate-800">Barber Admin</h1>
            <p className="text-xs text-slate-400 capitalize">{format(date, "EEEE d 'de' MMMM", { locale: es })}</p>
          </div>
          <button onClick={handleLogout} className="text-slate-400 hover:text-red-500 p-2"><LogOut size={20}/></button>
        </div>
        
        {/* NAVEGACIÓN SEMANAL */}
        <div className="bg-white pb-4 shadow-sm mb-4">
          <div className="flex justify-between items-center px-4 py-2 mb-2">
            <button onClick={prevWeek} className="p-1 rounded-full hover:bg-slate-100"><ChevronLeft size={20}/></button>
            <span className="text-sm font-bold text-slate-600 capitalize">
              {format(viewWeekStart, 'MMMM yyyy', { locale: es })}
            </span>
            <button onClick={nextWeek} className="p-1 rounded-full hover:bg-slate-100"><ChevronRight size={20}/></button>
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
                      ? 'bg-black text-white shadow-md scale-105 z-10' 
                      : 'bg-transparent text-slate-500 hover:bg-slate-50'
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
                    <span className={`absolute bottom-1 w-1 h-1 rounded-full ${isSelected ? 'bg-white' : 'bg-blue-600'}`}></span>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        <div className="px-4">
          {/* ACCIÓN BLOQUEAR */}
          {!showHistory && (
            <div className="mb-4">
              <button 
                onClick={toggleBlockDay}
                className={`w-full py-3 rounded-xl font-bold flex items-center justify-center gap-2 shadow-sm text-sm transition-all ${
                  isDayBlocked ? 'bg-red-100 text-red-600 border border-red-200' : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
                }`}
              >
                {isDayBlocked ? <><CheckCircle size={18}/> DÍA CERRADO (Abrir)</> : <><Ban size={18}/> CERRAR DÍA</>}
              </button>
            </div>
          )}

          {/* TABS */}
          <div className="flex p-1 bg-white rounded-xl shadow-sm mb-4 border border-slate-200">
            <button 
              onClick={() => setShowHistory(false)}
              className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all ${!showHistory ? 'bg-black text-white' : 'text-slate-400'}`}
            >
              Pendientes ({upcomingAppointments.length})
            </button>
            <button 
              onClick={() => setShowHistory(true)}
              className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-1 ${showHistory ? 'bg-black text-white' : 'text-slate-400'}`}
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
                  <div className="text-center py-12 bg-white rounded-xl border border-dashed border-slate-200 opacity-60">
                    <CheckCircle className="mx-auto text-slate-300 mb-2" size={32}/>
                    <p className="text-slate-500 font-medium text-sm">Todo libre por hoy</p>
                  </div>
                )}

                {upcomingAppointments.map(app => (
                  <div key={app.id} className="bg-white p-4 rounded-2xl shadow-sm border border-slate-100 flex flex-col gap-3">
                    <div className="flex justify-between items-center border-b border-slate-50 pb-2">
                      <div className="flex items-center gap-3">
                        <span className="text-2xl font-black text-slate-800 tracking-tight">{app.time}</span>
                        {/* Indicador de sobrecupo visual en admin */}
                        {(app as any).isOvertime && (
                          <span className="text-[10px] bg-amber-100 text-amber-800 px-2 py-0.5 rounded-full font-bold">SOBRECUPO</span>
                        )}
                        <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
                      </div>
                      <div className="flex gap-1">
                        <button onClick={() => setEditingApp(app)} className="p-2 bg-slate-50 text-slate-600 rounded-full hover:bg-blue-50 hover:text-blue-600 transition"><Edit2 size={16}/></button>
                        <button onClick={() => handleDelete(app.id)} className="p-2 bg-slate-50 text-slate-600 rounded-full hover:bg-red-50 hover:text-red-600 transition"><Trash2 size={16}/></button>
                      </div>
                    </div>
                    
                    <div className="flex flex-col gap-1 px-1">
                      <div className="flex items-center gap-2">
                        <User size={14} className="text-slate-400" />
                        <span className="font-bold text-slate-700 text-base">{app.clientName}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Phone size={14} className="text-slate-400" />
                        <a href={`tel:${(app as any).clientPhone}`} className="text-slate-500 text-sm font-medium hover:text-blue-600 hover:underline">
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
              <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
                {pastAppointments.length === 0 ? (
                  <p className="text-center py-8 text-slate-400 text-sm">Sin historial hoy.</p>
                ) : (
                  <div className="divide-y divide-slate-50">
                    {pastAppointments.map(app => (
                      <div key={app.id} className="p-4 flex items-center justify-between hover:bg-slate-50 transition">
                        <div className="flex items-center gap-4 opacity-60">
                          <span className="font-mono text-slate-500 font-bold">{app.time}</span>
                          <div>
                             <p className="font-bold text-slate-700 text-sm line-through decoration-slate-300">{app.clientName}</p>
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
          <div className="bg-white w-full max-w-sm rounded-3xl p-6 shadow-2xl">
            <h3 className="font-bold text-lg mb-6 text-center">Editar Reserva</h3>
            <form onSubmit={handleUpdate} className="space-y-4">
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-400 ml-1">Nombre</label>
                <input className="w-full bg-slate-50 border-none p-4 rounded-xl font-bold text-slate-800 focus:ring-2 focus:ring-black outline-none" value={editingApp.clientName} onChange={e => setEditingApp({...editingApp, clientName: e.target.value})} />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-400 ml-1">Teléfono</label>
                <input className="w-full bg-slate-50 border-none p-4 rounded-xl font-bold text-slate-800 focus:ring-2 focus:ring-black outline-none" value={editingApp.clientPhone} onChange={e => setEditingApp({...editingApp, clientPhone: e.target.value})} />
              </div>
              <div className="flex gap-3 pt-4">
                <button type="button" onClick={() => setEditingApp(null)} className="flex-1 py-4 text-slate-500 font-bold hover:bg-slate-50 rounded-xl transition">Cancelar</button>
                <button className="flex-1 bg-black text-white font-bold py-4 rounded-xl hover:scale-[1.02] transition shadow-lg">Guardar</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}