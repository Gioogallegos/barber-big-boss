'use client'

import { useState, useEffect } from 'react';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { db } from '../lib/firebase';

export interface Appointment {
  id: string;
  date: string;
  time: string;
  clientName: string;
}

export function useAppointments(selectedDate: Date) {
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Convertimos la fecha JS a string YYYY-MM-DD para buscar en la BD
    const dateStr = selectedDate.toISOString().split('T')[0];
    
    // Consulta: "Dame documentos de la colección 'appointments' donde la fecha sea X"
    const q = query(
      collection(db, "appointments"),
      where("date", "==", dateStr)
    );

    // Escuchamos cambios en tiempo real
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Appointment[];
      
      setAppointments(data);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [selectedDate]);

  return { appointments, loading };
}