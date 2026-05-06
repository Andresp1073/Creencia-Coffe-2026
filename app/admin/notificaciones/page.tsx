"use client";

import { useState, useEffect } from "react";
import { X, Check, Trash2, Bell, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface Notification {
  id: number;
  type: string;
  title?: string;
  product_name: string;
  message: string;
  created_at: string;
  is_read: boolean;
}

export default function AdminNotificationsPage() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<number | null>(null);

  // Cargar notificaciones
  useEffect(() => {
    loadNotifications();
  }, []);

  const loadNotifications = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/notifications", { credentials: "include" });
      if (res.ok) {
        const data = await res.json();
        setNotifications(data);
      }
    } catch (err) {
      console.error("Error cargando notificaciones:", err);
    } finally {
      setLoading(false);
    }
  };

  // Marcar una como leída
  const handleMarkAsRead = async (id: number) => {
    setActionLoading(id);
    try {
      const res = await fetch(`/api/admin/notifications/${id}`, { 
        method: "PUT", 
        credentials: "include" 
      });
      if (res.ok) {
        setNotifications(prev => prev.map(n => n.id === id ? { ...n, is_read: true } : n));
        window.dispatchEvent(new Event("notifications:update"));
      }
    } catch (err) {
      console.error("Error marcando como leída:", err);
    } finally {
      setActionLoading(null);
    }
  };

  // Marcar todas como leídas
  const handleMarkAllAsRead = async () => {
    setActionLoading(-1)
    try {
      const res = await fetch("/api/admin/notifications/read-all", { 
        method: "PATCH", 
        credentials: "include" 
      });
      if (res.ok) {
        setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
        window.dispatchEvent(new Event("notifications:update"));
      }
    } catch (err) {
      console.error("Error marcando todas:", err);
    } finally {
      setActionLoading(null);
    }
  };

  // Eliminar una
  const handleDelete = async (id: number) => {
    setActionLoading(id)
    try {
      const res = await fetch(`/api/admin/notifications/${id}`, { 
        method: "DELETE", 
        credentials: "include" 
      });
      if (res.ok) {
        setNotifications(prev => prev.filter(n => n.id !== id));
        window.dispatchEvent(new Event("notifications:update"));
      }
    } catch (err) {
      console.error("Error eliminando:", err);
    } finally {
      setActionLoading(null);
    }
  };

  // Eliminar todas
  const handleDeleteAll = async () => {
    if (!confirm("¿Estás seguro de eliminar todas las notificaciones?")) return;
    setActionLoading(-2)
    try {
      const res = await fetch("/api/admin/notifications", { 
        method: "DELETE", 
        credentials: "include" 
      });
      if (res.ok) {
        setNotifications([]);
        window.dispatchEvent(new Event("notifications:update"));
      }
    } catch (err) {
      console.error("Error eliminando todas:", err);
    } finally {
      setActionLoading(null);
    }
  };

  const unreadCount = notifications.filter(n => !n.is_read).length;

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="font-display text-3xl">Notificaciones</h1>
          <p className="text-muted-foreground mt-1">Alertas y avisos del sistema</p>
        </div>
        <div className="flex gap-3">
          {unreadCount > 0 && (
            <button
              onClick={handleMarkAllAsRead}
              disabled={actionLoading !== null}
              className="px-4 py-2 rounded-lg border border-border hover:bg-muted text-sm disabled:opacity-50"
            >
              {actionLoading === -1 ? <Loader2 className="size-4 animate-spin" /> : "Marcar todo como leído"}
            </button>
          )}
          {notifications.length > 0 && (
            <button
              onClick={handleDeleteAll}
              disabled={actionLoading !== null}
              className="px-4 py-2 rounded-lg border border-red-200 text-red-600 hover:bg-red-50 text-sm disabled:opacity-50"
            >
              {actionLoading === -2 ? <Loader2 className="size-4 animate-spin" /> : "Eliminar todo"}
            </button>
          )}
        </div>
      </div>

      <div className="bg-card rounded-2xl shadow-soft border border-border/50 overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-muted-foreground">
            <Loader2 className="size-6 animate-spin mx-auto mb-2" />
            Cargando...
          </div>
        ) : notifications.length === 0 ? (
          <div className="p-12 text-center">
            <Bell className="size-12 text-muted-foreground/30 mx-auto mb-4" />
            <p className="text-muted-foreground">No hay notificaciones</p>
          </div>
        ) : (
          <div className="divide-y divide-border">
            {notifications.map((notif) => (
              <div
                key={notif.id}
                className={cn(
                  "p-4 flex items-start gap-4 hover:bg-muted/30 transition-colors",
                  !notif.is_read && "bg-sage/5"
                )}
              >
                <div className={cn(
                  "size-10 rounded-full flex items-center justify-center shrink-0",
                  notif.type === "warning" ? "bg-yellow-100 text-yellow-700" :
                  notif.type === "success" ? "bg-green-100 text-green-700" :
                  "bg-blue-100 text-blue-700"
                )}>
                  <Bell className="size-5" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium">{notif.title || notif.product_name}</p>
                  <p className="text-sm text-muted-foreground mt-1">{notif.message}</p>
                  <p className="text-xs text-muted-foreground mt-2">
                    {new Date(notif.created_at).toLocaleDateString("es-ES", {
                      month: "short",
                      day: "numeric",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  {!notif.is_read && (
                    <button
                      onClick={() => handleMarkAsRead(notif.id)}
                      disabled={actionLoading !== null}
                      className="p-2 hover:bg-muted rounded-lg text-muted-foreground hover:text-green-600 disabled:opacity-50"
                      title="Marcar como leído"
                    >
                      {actionLoading === notif.id ? (
                        <Loader2 className="size-4 animate-spin" />
                      ) : (
                        <Check className="size-4" />
                      )}
                    </button>
                  )}
                  <button
                    onClick={() => handleDelete(notif.id)}
                    disabled={actionLoading !== null}
                    className="p-2 hover:bg-red-50 rounded-lg text-red-500 hover:text-red-700 disabled:opacity-50"
                    title="Eliminar"
                  >
                    {actionLoading === notif.id ? (
                      <Loader2 className="size-4 animate-spin" />
                    ) : (
                      <Trash2 className="size-4" />
                    )}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default function AdminNotificationsPage() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    console.log("Page loaded, notifications:", notifications.length);
    loadNotifications();
  }, []);

  const loadNotifications = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/notifications?_t=${Date.now()}`, { credentials: "include" });
      if (res.ok) {
        const data = await res.json();
        setNotifications(data);
      }
    } catch {
      // Mock data fallback removed for brevity if we are fetching db
      setNotifications([]);
    } finally {
      setLoading(false);
    }
  };

  const handleMarkAsRead = async (id: number) => {
    alert("Iniciando marcar leído... ID: " + id);
    try {
      const res = await fetch(`/api/admin/notifications/${id}`, { method: 'PUT', credentials: 'include' });
      alert("Respuesta servidor: " + res.status);
      await loadNotifications();
      window.dispatchEvent(new Event("notifications:update"));
    } catch (e) {
      console.error(e);
      alert("Error: " + e);
    }
  };

  const handleMarkAllAsRead = async () => {
    alert("Iniciando marcar todo como leído...");
    try {
      const res = await fetch('/api/admin/notifications/read-all', { method: 'PATCH', credentials: 'include' });
      alert("Respuesta servidor: " + res.status);
      await loadNotifications();
      window.dispatchEvent(new Event("notifications:update"));
    } catch (e) {
      console.error(e);
      alert("Error: " + e);
    }
  };

  const handleDelete = async (id: number) => {
    try {
      await fetch(`/api/admin/notifications/${id}`, { method: 'DELETE', credentials: 'include' });
      await loadNotifications();
      window.dispatchEvent(new Event("notifications:update"));
    } catch (e) {
      console.error(e);
    }
  };

  const handleDeleteAll = async () => {
    if (!confirm("¿Estás seguro de eliminar todas las notificaciones?")) return;
    try {
      await fetch('/api/admin/notifications', { method: 'DELETE', credentials: 'include' });
      await loadNotifications();
      window.dispatchEvent(new Event("notifications:update"));
    } catch (e) {
      console.error(e);
    }
  };

  const unreadCount = notifications.filter(n => !n.is_read).length;

  return (
    <div>
      {/* BOTÓN DE PRUEBA SIMPLE */}
      <button 
        onClick={() => alert("BOTÓN FUNCIONA")}
        className="bg-red-500 text-white px-4 py-2 mb-4"
      >
        PRUEBA CLICK
      </button>
      
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="font-display text-3xl">Notificaciones</h1>
          <p className="text-muted-foreground mt-1">Alertas y avisos del sistema - {notifications.length} items</p>
        </div>
        <div className="flex gap-3">
          {unreadCount > 0 && (
            <button
              onClick={handleMarkAllAsRead}
              className="px-4 py-2 rounded-lg border border-border hover:bg-muted text-sm"
            >
              Marcar todo como leído
            </button>
          )}
          {notifications.length > 0 && (
            <button
              onClick={handleDeleteAll}
              className="px-4 py-2 rounded-lg border border-red-200 text-red-600 hover:bg-red-50 text-sm"
            >
              Eliminar todo
            </button>
          )}
        </div>
      </div>

      <div className="bg-card rounded-2xl shadow-soft border border-border/50 overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-muted-foreground">Cargando...</div>
        ) : notifications.length === 0 ? (
          <div className="p-12 text-center">
            <Bell className="size-12 text-muted-foreground/30 mx-auto mb-4" />
            <p className="text-muted-foreground">No hay notificaciones</p>
          </div>
        ) : (
          <div className="divide-y divide-border">
            {notifications.map((notif) => (
              <div
                key={notif.id}
                className={cn(
                  "p-4 flex items-start gap-4 hover:bg-muted/30 transition-colors",
                  !notif.is_read && "bg-sage/5"
                )}
              >
                <div className={cn(
                  "size-10 rounded-full flex items-center justify-center shrink-0",
                  notif.type === "warning" ? "bg-yellow-100 text-yellow-700" :
                  notif.type === "success" ? "bg-green-100 text-green-700" :
                  "bg-blue-100 text-blue-700"
                )}>
                  <Bell className="size-5" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium">{notif.title || notif.product_name}</p>
                  <p className="text-sm text-muted-foreground mt-1">{notif.message}</p>
                  <p className="text-xs text-muted-foreground mt-2">
                    {new Date(notif.created_at).toLocaleDateString("es-ES", {
                      month: "short",
                      day: "numeric",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  {!notif.is_read && (
                    <button
                      onClick={() => handleMarkAsRead(notif.id)}
                      className="p-2 hover:bg-muted rounded-lg text-muted-foreground"
                      title="Marcar como leído"
                    >
                      <Check className="size-4" />
                    </button>
                  )}
                  <button
                    onClick={() => handleDelete(notif.id)}
                    className="p-2 hover:bg-red-50 rounded-lg text-red-500"
                    title="Eliminar"
                  >
                    <Trash2 className="size-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}