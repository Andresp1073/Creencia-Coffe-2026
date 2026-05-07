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
    try {
      await fetch(`/api/admin/notifications/${id}`, { method: "PUT", credentials: "include" });
      setNotifications(notifications.map(n => n.id === id ? { ...n, is_read: true } : n));
    } catch (e) {
      console.error(e);
    }
  };

  const handleDelete = async (id: number) => {
    try {
      await fetch(`/api/admin/notifications/${id}`, { method: "DELETE", credentials: "include" });
      setNotifications(notifications.filter(n => n.id !== id));
    } catch (e) {
      console.error(e);
    }
  };

  const filtered = filter === "unread" ? notifications.filter(n => !n.is_read) : notifications;

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
        <div className="flex items-center gap-2">
          <button
            onClick={() => setFilter("all")}
            className={cn(
              "px-4 py-2 rounded-full text-sm font-medium transition-smooth",
              filter === "all" ? "bg-coffee-dark text-cream" : "bg-muted text-muted-foreground hover:bg-muted/80"
            )}
          >
            Todas
          </button>
          <button
            onClick={() => setFilter("unread")}
            className={cn(
              "px-4 py-2 rounded-full text-sm font-medium transition-smooth",
              filter === "unread" ? "bg-coffee-dark text-cream" : "bg-muted text-muted-foreground hover:bg-muted/80"
            )}
          >
            Sin leer
          </button>
        </div>
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
                  !notif.is_read && "bg-yellow-50/50"
                )}
              >
                <div className={cn(
                  "size-10 rounded-full flex items-center justify-center shrink-0",
                  notif.type === "warning" ? "bg-amber-100" : "bg-blue-100"
                )}>
                  <Bell className={cn("size-5", notif.type === "warning" ? "text-amber-600" : "text-blue-600")} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="font-medium text-foreground">{notif.title || notif.product_name}</h3>
                    {!notif.is_read && (
                      <span className="px-2 py-0.5 text-xs font-medium bg-yellow-200 text-yellow-800 rounded-full">
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
                      className="size-8 rounded-full hover:bg-muted flex items-center justify-center text-muted-foreground transition-smooth"
                      title="Marcar como leída"
                    >
                      <Check className="size-4" />
                    </button>
                  )}
                  <button
                    onClick={() => handleDelete(notif.id)}
                    className="size-8 rounded-full hover:bg-red-50 flex items-center justify-center text-red-500 transition-smooth"
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