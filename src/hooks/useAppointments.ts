'use client'

import { useState, useEffect } from 'react';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { format } from 'date-fns'; // IMPORTANTE: Usamos date-fns

export interface Appointment {
  id: string;
  date: string;
  time: string;
  clientName: string;
  clientPhone?: string;
  type?: string;
  isOvertime?: boolean;
  createdAt?: string;
}

export function useAppointments(selectedDate: Date) {
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // CORRECCIÓN: Usamos format() en lugar de toISOString()
    // Esto asegura que "23 de Dic" sea siempre "2025-12-23" sin importar la hora
    const dateStr = format(selectedDate, 'yyyy-MM-dd');
    
    const q = query(
      collection(db, "appointments"),
      where("date", "==", dateStr)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Appointment[];
      
      setAppointments(data);
      setLoading(false);
    }, (error) => {
      console.error("Error fetching appointments:", error);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [selectedDate]);

  return { appointments, loading };
}