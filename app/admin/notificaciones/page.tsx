"use client";

import { useState, useEffect } from "react";
import { X, Check, Trash2, Bell } from "lucide-react";
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
    } catch {
      setNotifications([
        { id: 1, type: "warning", product_name: "Café Suave 250g", message: "Stock bajo: 5 unidades", created_at: new Date().toISOString(), is_read: false },
        { id: 2, type: "info", product_name: "Nueva venta", message: "Venta registrada", created_at: new Date().toISOString(), is_read: false },
        { id: 3, type: "success", product_name: "Pedido entregado", message: "El pedido fue entregado", created_at: new Date(Date.now() - 86400000).toISOString(), is_read: true },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const handleMarkAsRead = async (id: number) => {
    // Siempre actualizar UI primero
    setNotifications(notifications.map(n => n.id === id ? { ...n, is_read: true } : n));
    if (typeof window !== "undefined") {
      window.dispatchEvent(new Event("notifications:update"));
    }
    // Luego intentar API
    try {
      await fetch(`/api/admin/notifications/${id}`, { method: "PUT", credentials: "include" });
    } catch {
      // Ignorar error - UI ya se actualizó
    }
  };

  const handleMarkAllAsRead = async () => {
    // Siempre actualizar UI primero
    setNotifications(notifications.map(n => ({ ...n, is_read: true })));
    if (typeof window !== "undefined") {
      window.dispatchEvent(new Event("notifications:update"));
    }
    // Luego intentar API
    try {
      await fetch("/api/admin/notifications/read-all", { method: "PATCH", credentials: "include" });
    } catch {
      // Ignorar error - UI ya se actualizó
    }
  };

  const handleDelete = async (id: number) => {
    // Siempre actualizar UI primero
    setNotifications(notifications.filter(n => n.id !== id));
    if (typeof window !== "undefined") {
      window.dispatchEvent(new Event("notifications:update"));
    }
    // Luego intentar API
    try {
      await fetch(`/api/admin/notifications/${id}`, { 
        method: "DELETE", 
        credentials: "include" 
      });
    } catch {
      // Ignorar error - UI ya se actualizó
    }
  };

  const handleDeleteAll = async () => {
    if (!confirm("¿Estás seguro de eliminar todas las notificaciones?")) return;
    // Siempre actualizar UI primero
    setNotifications([]);
    if (typeof window !== "undefined") {
      window.dispatchEvent(new Event("notifications:update"));
    }
    // Luego intentar API
    try {
      await fetch("/api/admin/notifications", { method: "DELETE", credentials: "include" });
    } catch {
      // Ignorar error - UI ya se actualizó
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