"use client";

import { useState, useEffect } from "react";
import { Check, Trash2, Bell, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast, Toaster } from "sonner";

interface Notification {
  id: number;
  title?: string;
  product_name: string;
  message: string;
  created_at: string;
  is_read: boolean;
  type: string;
}

export function NotificacionesClient() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"all" | "unread">("all");

  const fetchNotifications = async () => {
    try {
      const res = await fetch("/api/admin/notifications", { credentials: "include" });
      if (res.ok) {
        const data = await res.json();
        setNotifications(data || []);
      }
    } catch (e) {
      console.error("Error fetching:", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchNotifications();
  }, []);

  const handleMarkAsRead = async (id: number) => {
    console.log("handleMarkAsRead clicked for id:", id);
    toast.info("Marcando como leída...");
    
    try {
      const res = await fetch(`/api/admin/notifications/${id}`, {
        method: "PUT",
        credentials: "include",
      });
      
      console.log("Response status:", res.status);
      
      if (res.ok) {
        setNotifications(prev => prev.map(n => n.id === id ? { ...n, is_read: true } : n));
        window.dispatchEvent(new Event("notifications:update"));
        toast.success("Marcada como leída");
      } else {
        const data = await res.json();
        toast.error(data.error || "Error");
      }
    } catch (e) {
      console.error("Fetch error:", e);
      toast.error("Error de conexión");
    }
  };

  const handleMarkAllAsRead = async () => {
    console.log("handleMarkAllAsRead clicked");
    toast.info("Marcando todas...");
    
    try {
      const res = await fetch('/api/admin/notifications/read-all', {
        method: 'PATCH',
        credentials: 'include',
      });
      
      if (res.ok) {
        setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
        window.dispatchEvent(new Event("notifications:update"));
        toast.success("Todas marcadas");
      } else {
        toast.error("Error");
      }
    } catch (e) {
      console.error("Fetch error:", e);
      toast.error("Error de conexión");
    }
  };

  const handleDelete = async (id: number) => {
    console.log("handleDelete clicked for id:", id);
    if (!confirm("¿Eliminar esta notificación?")) return;
    
    toast.info("Eliminando...");
    
    try {
      const res = await fetch(`/api/admin/notifications/${id}`, {
        method: "DELETE",
        credentials: "include",
      });
      
      if (res.ok) {
        setNotifications(prev => prev.filter(n => n.id !== id));
        window.dispatchEvent(new Event("notifications:update"));
        toast.success("Eliminada");
      } else {
        toast.error("Error");
      }
    } catch (e) {
      console.error("Fetch error:", e);
      toast.error("Error de conexión");
    }
  };

  const handleDeleteAll = async () => {
    console.log("handleDeleteAll clicked");
    if (!confirm("¿Eliminar todas las notificaciones?")) return;
    
    toast.info("Eliminando todas...");
    
    try {
      const res = await fetch('/api/admin/notifications', {
        method: 'DELETE',
        credentials: "include",
      });
      
      if (res.ok) {
        setNotifications([]);
        window.dispatchEvent(new Event("notifications:update"));
        toast.success("Todas eliminadas");
      } else {
        toast.error("Error");
      }
    } catch (e) {
      console.error("Fetch error:", e);
      toast.error("Error de conexión");
    }
  };

  const filtered = filter === "unread" ? notifications.filter(n => !n.is_read) : notifications;
  const unreadCount = notifications.filter(n => !n.is_read).length;

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="size-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <>
      <Toaster position="top-right" richColors />
      <div>
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="font-display text-3xl">Notificaciones</h1>
            <p className="text-muted-foreground mt-1">Alertas y avisos del sistema</p>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={handleMarkAllAsRead}
              disabled={unreadCount === 0}
              className="px-5 py-2.5 rounded-full text-sm font-medium bg-coffee-dark text-cream disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Check className="size-4 inline mr-1" />
              Leer todo
            </button>
            <button
              onClick={handleDeleteAll}
              disabled={notifications.length === 0}
              className="px-5 py-2.5 rounded-full text-sm font-medium bg-brand-terracotta text-cream disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Trash2 className="size-4 inline mr-1" />
              Eliminar todo
            </button>
          </div>
        </div>

        <div className="flex items-center gap-2 mb-6">
          <button
            onClick={() => setFilter("all")}
            className={cn(
              "px-5 py-2.5 rounded-full text-sm font-medium",
              filter === "all" ? "bg-coffee-dark text-cream" : "bg-muted"
            )}
          >
            Todas ({notifications.length})
          </button>
          <button
            onClick={() => setFilter("unread")}
            className={cn(
              "px-5 py-2.5 rounded-full text-sm font-medium",
              filter === "unread" ? "bg-coffee-dark text-cream" : "bg-muted"
            )}
          >
            Sin leer ({unreadCount})
          </button>
        </div>

        <div className="bg-card rounded-2xl shadow-soft border border-border/50 overflow-hidden">
          {filtered.length === 0 ? (
            <div className="p-12 text-center text-muted-foreground">
              <Bell className="size-12 mx-auto mb-4 opacity-30" />
              <p>No hay notificaciones</p>
            </div>
          ) : (
            <div className="divide-y divide-border/50">
              {filtered.map((notif) => (
                <div
                  key={notif.id}
                  className={cn(
                    "p-6 flex items-start gap-4",
                    !notif.is_read && "bg-yellow-50/30"
                  )}
                >
                  <div className={cn(
                    "size-10 rounded-full flex items-center justify-center shrink-0",
                    notif.type === "warning" ? "bg-brand-terracotta/20" : "bg-brand-caramel/20"
                  )}>
                    <Bell className={cn("size-5", notif.type === "warning" ? "text-brand-terracotta" : "text-brand-caramel")} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="font-medium text-foreground">{notif.title || notif.product_name}</h3>
                      {!notif.is_read && (
                        <span className="px-2 py-0.5 text-xs font-medium bg-brand-caramel/20 text-brand-brown rounded-full">
                          Nueva
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground mb-2">{notif.message}</p>
                    <p className="text-xs text-muted-foreground/70">
                      {new Date(notif.created_at).toLocaleString("es-CO", {
                        day: "numeric",
                        month: "short",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    {!notif.is_read && (
                      <button
                        onClick={() => handleMarkAsRead(notif.id)}
                        className="px-4 py-2 bg-brand-caramel text-white rounded-lg text-sm"
                      >
                        <Check className="size-4 inline" /> Leer
                      </button>
                    )}
                    <button
                      onClick={() => handleDelete(notif.id)}
                      className="px-4 py-2 bg-red-500 text-white rounded-lg text-sm"
                    >
                      <Trash2 className="size-4 inline" /> Eliminar
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </>
  );
}