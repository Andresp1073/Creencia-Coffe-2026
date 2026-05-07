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

export function NotificacionesClient() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"all" | "unread">("all");
  const [processingId, setProcessingId] = useState<number | null>(null);
  const [processingAllRead, setProcessingAllRead] = useState(false);
  const [processingAllDelete, setProcessingAllDelete] = useState(false);

  useEffect(() => {
    fetchNotifications();
  }, []);

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

  const handleMarkAsRead = async (id: number) => {
    if (processingId) return;
    setProcessingId(id);
    try {
      const res = await fetch(`/api/admin/notifications/${id}`, { method: "PUT", credentials: "include" });
      if (res.ok) {
        setNotifications(prev => prev.map(n => n.id === id ? { ...n, is_read: true } : n));
        window.dispatchEvent(new Event("notifications:update"));
      } else {
        const data = await res.json();
        console.error("Error:", data.error);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setProcessingId(null);
    }
  };

  const handleMarkAllAsRead = async () => {
    if (processingAllRead) return;
    setProcessingAllRead(true);
    try {
      const res = await fetch('/api/admin/notifications/read-all', { method: 'PATCH', credentials: 'include' });
      if (res.ok) {
        setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
        window.dispatchEvent(new Event("notifications:update"));
      } else {
        const data = await res.json();
        console.error("Error:", data.error);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setProcessingAllRead(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (processingId) return;
    setProcessingId(id);
    try {
      const res = await fetch(`/api/admin/notifications/${id}`, { method: "DELETE", credentials: "include" });
      if (res.ok) {
        setNotifications(prev => prev.filter(n => n.id !== id));
        window.dispatchEvent(new Event("notifications:update"));
      } else {
        const data = await res.json();
        console.error("Error:", data.error);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setProcessingId(null);
    }
  };

  const handleDeleteAll = async () => {
    if (!confirm("¿Eliminar todas las notificaciones?")) return;
    if (processingAllDelete) return;
    setProcessingAllDelete(true);
    try {
      const res = await fetch('/api/admin/notifications', { method: 'DELETE', credentials: 'include' });
      if (res.ok) {
        setNotifications([]);
        window.dispatchEvent(new Event("notifications:update"));
      } else {
        const data = await res.json();
        console.error("Error:", data.error);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setProcessingAllDelete(false);
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
    <div>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="font-display text-3xl">Notificaciones</h1>
          <p className="text-muted-foreground mt-1">Alertas y avisos del sistema</p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={handleMarkAllAsRead}
            disabled={unreadCount === 0 || processingAllRead}
            className="px-4 py-2 rounded-full text-sm font-medium bg-coffee-dark text-cream hover:bg-coffee-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            {processingAllRead ? (
              <span className="size-4 border-2 border-cream/30 border-t-cream rounded-full animate-spin" />
            ) : (
              <Check className="size-4" />
            )}
            Leer todo
          </button>
          <button
            onClick={handleDeleteAll}
            disabled={notifications.length === 0 || processingAllDelete}
            className="px-4 py-2 rounded-full text-sm font-medium bg-brand-terracotta text-cream hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            {processingAllDelete ? (
              <span className="size-4 border-2 border-cream/30 border-t-cream rounded-full animate-spin" />
            ) : (
              <Trash2 className="size-4" />
            )}
            Eliminar todo
          </button>
        </div>
      </div>

      <div className="flex items-center gap-2 mb-6">
        <button
          onClick={() => setFilter("all")}
          className={cn(
            "px-4 py-2 rounded-full text-sm font-medium transition-smooth",
            filter === "all" ? "bg-coffee-dark text-cream" : "bg-muted text-muted-foreground hover:bg-muted/80"
          )}
        >
          Todas ({notifications.length})
        </button>
        <button
          onClick={() => setFilter("unread")}
          className={cn(
            "px-4 py-2 rounded-full text-sm font-medium transition-smooth",
            filter === "unread" ? "bg-coffee-dark text-cream" : "bg-muted text-muted-foreground hover:bg-muted/80"
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
                  "p-6 flex items-start gap-4 transition-colors",
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
                      disabled={processingId === notif.id}
                      className="size-9 rounded-full hover:bg-brand-caramel/10 flex items-center justify-center text-brand-caramel transition-smooth disabled:opacity-50"
                      title="Marcar como leída"
                    >
                      {processingId === notif.id ? (
                        <span className="size-4 border-2 border-brand-caramel/30 border-t-brand-caramel rounded-full animate-spin" />
                      ) : (
                        <Check className="size-4" />
                      )}
                    </button>
                  )}
                  <button
                    onClick={() => handleDelete(notif.id)}
                    disabled={processingId === notif.id}
                    className="size-9 rounded-full hover:bg-brand-terracotta/10 flex items-center justify-center text-brand-terracotta transition-smooth disabled:opacity-50"
                    title="Eliminar"
                  >
                    {processingId === notif.id ? (
                      <span className="size-4 border-2 border-brand-terracotta/30 border-t-brand-terracotta rounded-full animate-spin" />
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