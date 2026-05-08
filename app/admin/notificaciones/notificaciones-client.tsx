"use client";

import { useState, useEffect } from "react";
import { Check, Trash2, Bell, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

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
  const [processingId, setProcessingId] = useState<number | null>(null);
  const [processingAllRead, setProcessingAllRead] = useState(false);
  const [processingAllDelete, setProcessingAllDelete] = useState(false);

  useEffect(() => {
    fetchNotifications();
  }, []);

  const fetchNotifications = async () => {
    console.log("fetchNotifications called");
    try {
      const res = await fetch("/api/admin/notifications", { credentials: "include" });
      console.log("fetchNotifications response status:", res.status);
      if (res.ok) {
        const data = await res.json();
        console.log("fetchNotifications data count:", data?.length);
        console.log("First notification:", data?.[0]);
        setNotifications(data || []);
      } else {
        console.log("fetchNotifications error:", res.status);
      }
    } catch (e) {
      console.error("Error fetching:", e);
    } finally {
      setLoading(false);
    }
  };

  const handleMarkAsRead = async (id: number) => {
    console.log("handleMarkAsRead called with id:", id, "type:", typeof id);
    if (processingId) return;
    setProcessingId(id);
    try {
      const url = `/api/admin/notifications/${id}`;
      console.log("Fetching:", url);
      const res = await fetch(url, { method: "PUT", credentials: "include" });
      console.log("Response status:", res.status, "ok:", res.ok);
      if (res.ok) {
        console.log("Updating state for id:", id);
        setNotifications(prev => prev.map(n => n.id === id ? { ...n, is_read: true } : n));
        window.dispatchEvent(new Event("notifications:update"));
      } else {
        const data = await res.json();
        console.error("Error response:", data);
      }
    } catch (e) {
      console.error("Fetch error:", e);
    } finally {
      setProcessingId(null);
    }
  };

  const handleMarkAllAsRead = async () => {
    console.log("handleMarkAllAsRead called");
    if (processingAllRead) return;
    setProcessingAllRead(true);
    try {
      console.log("Fetching PATCH /api/admin/notifications/read-all");
      const res = await fetch('/api/admin/notifications/read-all', { method: 'PATCH', credentials: 'include' });
      console.log("PATCH Response status:", res.status, "ok:", res.ok);
      if (res.ok) {
        console.log("Updating all notifications to is_read = true");
        setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
        window.dispatchEvent(new Event("notifications:update"));
      } else {
        const data = await res.json();
        console.error("PATCH Error response:", data);
      }
    } catch (e) {
      console.error("PATCH Fetch error:", e);
    } finally {
      setProcessingAllRead(false);
    }
  };

  const handleDelete = async (id: number) => {
    console.log("handleDelete called with id:", id, "type:", typeof id);
    if (!confirm("¿Eliminar esta notificación?")) return;
    if (processingId) return;
    setProcessingId(id);
    try {
      const url = `/api/admin/notifications/${id}`;
      console.log("Fetching DELETE:", url);
      const res = await fetch(url, { method: "DELETE", credentials: "include" });
      console.log("DELETE Response status:", res.status, "ok:", res.ok);
      if (res.ok) {
        console.log("Removing notification from state:", id);
        setNotifications(prev => prev.filter(n => n.id !== id));
        window.dispatchEvent(new Event("notifications:update"));
      } else {
        const data = await res.json();
        console.error("DELETE Error response:", data);
      }
    } catch (e) {
      console.error("DELETE Fetch error:", e);
    } finally {
      setProcessingId(null);
    }
  };

  const handleDeleteAll = async () => {
    console.log("handleDeleteAll called");
    if (!confirm("¿Eliminar todas las notificaciones?")) return;
    if (processingAllDelete) return;
    setProcessingAllDelete(true);
    try {
      console.log("Fetching DELETE /api/admin/notifications");
      const res = await fetch('/api/admin/notifications', { method: 'DELETE', credentials: "include" });
      console.log("DELETE all Response status:", res.status, "ok:", res.ok);
      if (res.ok) {
        console.log("Clearing all notifications from state");
        setNotifications([]);
        window.dispatchEvent(new Event("notifications:update"));
      } else {
        const data = await res.json();
        console.error("DELETE all Error response:", data);
      }
    } catch (e) {
      console.error("DELETE all Fetch error:", e);
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
            className="px-5 py-2.5 rounded-full text-sm font-medium bg-coffee-dark text-cream hover:bg-coffee-medium hover:scale-110 hover:-translate-y-1 hover:shadow-xl active:scale-90 active:translate-y-0 cursor-pointer transition-all duration-200 ease-out disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
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
            className="px-5 py-2.5 rounded-full text-sm font-medium bg-brand-terracotta text-cream hover:opacity-80 hover:scale-110 hover:-translate-y-1 hover:shadow-xl active:scale-90 active:translate-y-0 cursor-pointer transition-all duration-200 ease-out disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
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
            "px-5 py-2.5 rounded-full text-sm font-medium cursor-pointer transition-all duration-200 ease-out hover:scale-110 hover:-translate-y-1 hover:shadow-xl active:scale-90 active:translate-y-0",
            filter === "all" ? "bg-coffee-dark text-cream" : "bg-muted text-muted-foreground hover:bg-muted/80"
          )}
        >
          Todas ({notifications.length})
        </button>
        <button
          onClick={() => setFilter("unread")}
          className={cn(
            "px-5 py-2.5 rounded-full text-sm font-medium cursor-pointer transition-all duration-200 ease-out hover:scale-110 hover:-translate-y-1 hover:shadow-xl active:scale-90 active:translate-y-0",
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
                      className="size-10 rounded-full bg-brand-caramel/15 border border-brand-caramel/20 text-brand-caramel cursor-pointer transition-all duration-200 ease-out hover:bg-brand-caramel/30 hover:scale-110 hover:-translate-y-1 hover:shadow-xl active:scale-90 active:translate-y-0 flex items-center justify-center"
                      title="Marcar como leída"
                      aria-label="Marcar notificación como leída"
                    >
                      {processingId === notif.id ? (
                        <span className="size-4 border-2 border-brand-caramel/30 border-t-brand-caramel rounded-full animate-spin" />
                      ) : (
                        <Check className="size-5" />
                      )}
                    </button>
                  )}
                  <button
                    onClick={() => handleDelete(notif.id)}
                    disabled={processingId === notif.id}
                    className="size-10 rounded-full bg-brand-terracotta/15 border border-brand-terracotta/20 text-brand-terracotta cursor-pointer transition-all duration-200 ease-out hover:bg-brand-terracotta/30 hover:scale-110 hover:-translate-y-1 hover:shadow-xl active:scale-90 active:translate-y-0 flex items-center justify-center"
                    title="Eliminar notificación"
                    aria-label="Eliminar notificación"
                  >
                    {processingId === notif.id ? (
                      <span className="size-4 border-2 border-brand-terracotta/30 border-t-brand-terracotta rounded-full animate-spin" />
                    ) : (
                      <Trash2 className="size-5" />
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