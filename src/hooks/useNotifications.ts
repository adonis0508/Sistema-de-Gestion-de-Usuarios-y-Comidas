import { useState, useEffect } from 'react';
import { collection, query, where, onSnapshot, updateDoc, doc, limit, arrayUnion } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useAuth } from '../contexts/AuthContext';
import toast from 'react-hot-toast';

export interface AppNotification {
  id: string;
  userId: string;
  title: string;
  message: string;
  createdAt: string;
  readBy: string[];
}

export function useNotifications() {
  const { profile } = useAuth();
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    if (!profile) return;

    // Solicitar permiso para notificaciones del navegador
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission();
    }

    // Escuchar notificaciones dirigidas al usuario o a todos ('ALL')
    const q = query(
      collection(db, 'notifications'),
      where('userId', 'in', [profile.uid, 'ALL']),
      limit(10)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const notifs: AppNotification[] = [];
      let unread = 0;

      snapshot.forEach((docSnap) => {
        const data = docSnap.data() as Omit<AppNotification, 'id'>;
        const isRead = data.readBy?.includes(profile.uid);
        
        // Solo mostrar notificaciones no leídas (borrarlas de la vista una vez leídas)
        if (!isRead) {
          notifs.push({ id: docSnap.id, ...data });
          unread++;
        }
      });

      // Ordenar por fecha (más recientes primero)
      notifs.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

      setNotifications(notifs);
      setUnreadCount(unread);

      // Disparar notificación del navegador para mensajes nuevos
      snapshot.docChanges().forEach((change) => {
        if (change.type === 'added') {
          const data = change.doc.data();
          const isRecent = (new Date().getTime() - new Date(data.createdAt).getTime()) < 60000; // Menos de 1 minuto
          const isRead = data.readBy?.includes(profile.uid);
          
          if (isRecent && !isRead && 'Notification' in window && Notification.permission === 'granted') {
            new Notification(data.title, { body: data.message, icon: '/DEf.png' });
          }
        }
      });
    });

    return () => unsubscribe();
  }, [profile]);

  const markAsRead = async (notificationId: string, currentReadBy: string[]) => {
    if (!profile) return;
    if (currentReadBy.includes(profile.uid)) return;

    try {
      await updateDoc(doc(db, 'notifications', notificationId), {
        readBy: arrayUnion(profile.uid)
      });
    } catch (error) {
      console.error("Error marking notification as read:", error);
      toast.error("Error al marcar la notificación como leída");
    }
  };

  const markAllAsRead = async () => {
    if (!profile) return;
    const unreadNotifs = notifications.filter(n => !(n.readBy || []).includes(profile.uid));
    
    try {
      await Promise.all(unreadNotifs.map(notif => markAsRead(notif.id, notif.readBy || [])));
    } catch (error) {
      console.error("Error marking all as read:", error);
    }
  };

  return { notifications, unreadCount, markAsRead, markAllAsRead };
}
