"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { Toaster } from "sonner";
import {
  LayoutDashboard,
  Package,
  Boxes,
  Receipt,
  Search,
  ChevronLeft,
  ArrowLeft,
  LogOut,
  Bell,
  Menu,
  Tag,
  Check,
  Trash2,
  X,
} from "lucide-react";

const navItems = [
  { href: "/admin", label: "Dashboard", icon: LayoutDashboard, exact: true },
  { href: "/admin/productos", label: "Productos", icon: Package },
  { href: "/admin/categorias", label: "Categorías", icon: Tag },
  { href: "/admin/inventario", label: "Inventario", icon: Boxes },
  { href: "/admin/ventas", label: "Ventas", icon: Receipt },
];

interface Notification {
  id: number;
  type: string;
  title?: string;
  product_name: string;
  message: string;
  created_at: string;
  is_read: boolean;
}

export default function AdminLayoutClient({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [showMobileMenu, setShowMobileMenu] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [processingId, setProcessingId] = useState<number | null>(null);
  const [processingAll, setProcessingAll] = useState(false);

  useEffect(() => {
    fetchNotifications();
  }, []);

  useEffect(() => {
    const verifySession = async () => {
      try {
        const res = await fetch("/api/auth/me", { credentials: "include" });
        if (!res.ok) {
          router.push("/login");
        }
      } catch {
        router.push("/login");
      }
    };

    verifySession();

    let lastFocus = Date.now();
    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        const now = Date.now();
        if (now - lastFocus > 30000) {
          lastFocus = now;
          verifySession();
        }
      } else {
        lastFocus = Date.now();
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () => document.removeEventListener("visibilitychange", handleVisibilityChange);
  }, [router]);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const handleNotificationUpdate = () => fetchNotifications();

    window.addEventListener("notifications:update", handleNotificationUpdate);

    return () => {
      window.removeEventListener("notifications:update", handleNotificationUpdate);
    };
  }, []);

  const fetchNotifications = async () => {
    try {
      const res = await fetch(`/api/admin/notifications?_t=${Date.now()}`, { credentials: "include" });
      if (res.ok) {
        const data = await res.json();
        setNotifications(data || []);
        const unread = data?.filter((n: Notification) => !n.is_read) || [];
        setUnreadCount(unread.length);
      }
    } catch (e) {
      console.error("fetch error:", e);
    }
  };

  const handleMarkAsRead = async (id: number) => {
    if (processingId) return;
    setProcessingId(id);
    try {
      const res = await fetch(`/api/admin/notifications/${id}`, { method: 'PUT', credentials: 'include' });
      if (res.ok) {
        setNotifications(prev => prev.map(n => n.id === id ? { ...n, is_read: true } : n));
        setUnreadCount(prev => Math.max(0, prev - 1));
        window.dispatchEvent(new Event("notifications:update"));
      }
    } catch (e) {
      console.error(e);
    } finally {
      setProcessingId(null);
    }
  };

  const handleMarkAllAsRead = async () => {
    if (processingAll) return;
    setProcessingAll(true);
    try {
      const res = await fetch('/api/admin/notifications/read-all', { method: 'PATCH', credentials: 'include' });
      if (res.ok) {
        setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
        setUnreadCount(0);
        setShowNotifications(false);
        window.dispatchEvent(new Event("notifications:update"));
      }
    } catch (e) {
      console.error("Error:", e);
    } finally {
      setProcessingAll(false);
    }
  };

  const handleDeleteOne = async (id: number) => {
    if (!confirm("¿Eliminar esta notificación?")) return;
    if (processingId) return;
    setProcessingId(id);
    try {
      const res = await fetch(`/api/admin/notifications/${id}`, { method: "DELETE", credentials: "include" });
      if (res.ok) {
        setNotifications(prev => {
          const wasUnread = prev.some(n => n.id === id && !n.is_read);
          if (wasUnread) setUnreadCount(c => Math.max(0, c - 1));
          return prev.filter(n => n.id !== id);
        });
        window.dispatchEvent(new Event("notifications:update"));
      }
    } catch (e) {
      console.error("Error:", e);
    } finally {
      setProcessingId(null);
    }
  };

  const handleDeleteAll = async () => {
    if (!confirm("¿Eliminar todas las notificaciones?")) return;
    if (processingAll) return;
    setProcessingAll(true);
    try {
      const res = await fetch('/api/admin/notifications', { method: 'DELETE', credentials: "include" });
      if (res.ok) {
        setNotifications([]);
        setUnreadCount(0);
        setShowNotifications(false);
        window.dispatchEvent(new Event("notifications:update"));
      }
    } catch (e) {
      console.error("Error:", e);
    } finally {
      setProcessingAll(false);
    }
  };

  const handleLogout = async () => {
    try {
      await fetch("/api/auth/logout", { method: "POST" });
      router.push("/login");
    } catch (error) {
      console.error("Logout error:", error);
    }
  };

  const isActive = (href: string, exact?: boolean) =>
    exact ? pathname === href : pathname.startsWith(href);

  return (
    <div className="min-h-screen flex bg-muted/30">
      {/* Sidebar */}
      <aside
        className={cn(
          "shrink-0 bg-coffee-dark text-cream flex flex-col transition-all duration-300 sticky top-0 h-screen z-40",
          collapsed ? "w-20" : "w-64",
          showMobileMenu ? "fixed inset-0 w-64" : "hidden md:flex"
        )}
      >
        <div className="h-18 flex items-center justify-between px-5 py-4 border-b border-cream/10">
          <Link href="/admin" className="flex items-center gap-2.5 overflow-hidden">
            <img
              src="/imagenes/LOGO-CC.png"
              alt="Cafe Creencia"
              className="h-9 w-9 rounded-full object-cover shrink-0"
            />
            {!collapsed && (
              <div className="leading-tight">
                <div className="font-display text-base text-cream">Creencia</div>
                <div className="text-[10px] uppercase tracking-[0.18em] text-cream/50">Admin</div>
              </div>
            )}
          </Link>
          <button
            onClick={() => setCollapsed(!collapsed)}
            className="size-7 rounded-md hover:bg-cream/10 flex items-center justify-center text-cream/70 hover:text-cream transition-colors"
            aria-label="Colapsar"
          >
            <ChevronLeft
              className={cn("size-4 transition-transform", collapsed && "rotate-180")}
            />
          </button>
        </div>

        <nav className="flex-1 px-3 py-6 space-y-1 overflow-y-auto">
          {navItems.map((item) => {
            const active = isActive(item.href, "exact" in item ? item.exact : false);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200",
                  active
                    ? "bg-cream text-coffee-dark shadow-warm-sm"
                    : "text-cream/70 hover:text-cream hover:bg-cream/10"
                )}
              >
                <item.icon className="size-[18px] shrink-0" strokeWidth={1.75} />
                {!collapsed && <span>{item.label}</span>}
              </Link>
            );
          })}
        </nav>

        <button
          onClick={() => setShowMobileMenu(false)}
          className="md:hidden p-4 text-cream/70 hover:text-cream border-t border-cream/10"
        >
          <X className="size-5" />
        </button>
      </aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Header */}
        <header className="h-18 bg-background border-b border-border sticky top-0 z-30 flex items-center justify-between px-4 md:px-8 py-4">
          <div className="flex items-center gap-4">
            <button
              onClick={() => setShowMobileMenu(true)}
              className="md:hidden p-2 hover:bg-muted rounded-lg transition-colors"
            >
              <Menu className="size-5" />
            </button>
            <div className="relative w-full max-w-sm hidden sm:block">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
              <input
                type="search"
                placeholder="Buscar..."
                className="w-full pl-10 pr-4 py-2 text-sm rounded-full bg-muted border border-transparent focus:bg-background focus:border-border outline-none transition-all"
              />
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            {/* Notifications */}
            <div className="relative">
              <button
                onClick={() => setShowNotifications(!showNotifications)}
                className="relative p-2.5 hover:bg-muted rounded-xl transition-colors cursor-pointer"
                aria-label="Notificaciones"
              >
                <Bell className="size-5 text-muted-foreground" />
                {unreadCount > 0 && (
                  <span className="absolute -top-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-danger text-xs font-bold text-white">
                    {unreadCount > 9 ? "9+" : unreadCount}
                  </span>
                )}
              </button>

              {showNotifications && (
                <>
                  <div
                    className="fixed inset-0 z-40"
                    onClick={() => setShowNotifications(false)}
                  />
                  <div className="absolute right-0 mt-2 w-80 sm:w-96 bg-card border border-border rounded-2xl shadow-elevated z-50 overflow-hidden">
                    <div className="px-5 py-4 border-b border-border flex items-center justify-between bg-muted/50">
                      <h3 className="font-semibold text-sm text-foreground">Notificaciones</h3>
                      <div className="flex gap-2">
                        <button
                          onClick={handleMarkAllAsRead}
                          disabled={unreadCount === 0 || processingAll}
                          className="px-3 py-1.5 text-xs font-medium rounded-lg bg-coffee-dark text-cream hover:bg-coffee-medium disabled:opacity-50 disabled:cursor-not-allowed transition-colors cursor-pointer"
                        >
                          <span className="flex items-center gap-1.5">
                            <Check className="size-3" />
                            Todo leído
                          </span>
                        </button>
                        <button
                          onClick={handleDeleteAll}
                          disabled={processingAll || notifications.length === 0}
                          className="px-3 py-1.5 text-xs font-medium rounded-lg bg-danger/10 text-danger hover:bg-danger/20 disabled:opacity-50 flex items-center gap-1.5 transition-colors cursor-pointer"
                        >
                          <Trash2 className="size-3" />
                        </button>
                      </div>
                    </div>
                    <div className="max-h-80 overflow-y-auto">
                      {notifications.length === 0 ? (
                        <div className="px-5 py-10 text-center">
                          <Bell className="size-10 text-muted-foreground/30 mx-auto mb-2" />
                          <p className="text-sm text-muted-foreground">No hay notificaciones</p>
                        </div>
                      ) : (
                        <div className="p-3">
                          {notifications.map((notif) => (
                            <div
                              key={notif.id}
                              className={cn(
                                "flex items-start gap-3 p-3 rounded-xl mb-2 last:mb-0 transition-colors",
                                notif.is_read ? "bg-muted/30 opacity-60" : "bg-brand-caramel/5 border border-brand-caramel/20"
                              )}
                            >
                              {!notif.is_read && (
                                <div className="mt-0.5 h-2 w-2 rounded-full bg-brand-caramel shrink-0" />
                              )}
                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium text-foreground truncate">
                                  {notif.product_name || notif.title || 'Notificación'}
                                </p>
                                <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">
                                  {notif.message}
                                </p>
                                <p className="text-[10px] text-muted-foreground/70 mt-1">
                                  {new Date(notif.created_at).toLocaleDateString("es-ES", {
                                    month: "short",
                                    day: "numeric",
                                    hour: "2-digit",
                                    minute: "2-digit",
                                  })}
                                </p>
                              </div>
                              <div className="flex flex-col gap-1 shrink-0">
                                {!notif.is_read && (
                                  <button
                                    onClick={() => handleMarkAsRead(notif.id)}
                                    disabled={processingId === notif.id}
                                    className="size-7 rounded-lg bg-success/10 text-success hover:bg-success/20 flex items-center justify-center transition-colors cursor-pointer disabled:opacity-50"
                                    title="Marcar como leída"
                                  >
                                    {processingId === notif.id ? (
                                      <span className="size-3 border-2 border-success/30 border-t-success rounded-full animate-spin" />
                                    ) : (
                                      <Check className="size-3.5" />
                                    )}
                                  </button>
                                )}
                                <button
                                  onClick={() => handleDeleteOne(notif.id)}
                                  disabled={processingId === notif.id}
                                  className="size-7 rounded-lg bg-danger/10 text-danger hover:bg-danger/20 flex items-center justify-center transition-colors cursor-pointer disabled:opacity-50"
                                  title="Eliminar"
                                >
                                  {processingId === notif.id ? (
                                    <span className="size-3 border-2 border-danger/30 border-t-danger rounded-full animate-spin" />
                                  ) : (
                                    <Trash2 className="size-3.5" />
                                  )}
                                </button>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                    <Link
                      href="/admin/notificaciones"
                      onClick={() => setShowNotifications(false)}
                      className="block px-5 py-3.5 text-center text-sm font-medium text-brand-caramel hover:text-coffee-dark hover:bg-muted border-t border-border transition-colors"
                    >
                      Ver todas las notificaciones
                    </Link>
                  </div>
                </>
              )}
            </div>

            {/* User Menu */}
            <div className="relative">
              <button
                onClick={() => setShowUserMenu(!showUserMenu)}
                className="flex items-center gap-2 pl-2 hover:opacity-80 transition-opacity"
              >
                <img
                  src="/imagenes/LOGO-CC.png"
                  alt="Admin"
                  className="h-9 w-9 rounded-full object-cover"
                />
                <div className="hidden sm:block leading-tight text-left">
                  <div className="text-sm font-medium text-foreground">Admin</div>
                  <div className="text-[11px] text-muted-foreground">Cafe Creencia</div>
                </div>
              </button>
              {showUserMenu && (
                <div className="absolute top-full right-0 mt-2 bg-card border border-border rounded-xl shadow-elevated z-50 min-w-[180px] overflow-hidden">
                  <Link
                    href="/"
                    onClick={() => setShowUserMenu(false)}
                    className="flex items-center gap-2.5 px-4 py-3 text-sm text-foreground hover:bg-muted transition-colors"
                  >
                    <ArrowLeft className="size-4" strokeWidth={1.75} />
                    Ver sitio
                  </Link>
                  <button
                    onClick={handleLogout}
                    className="flex items-center gap-2.5 px-4 py-3 text-sm text-danger hover:bg-danger/5 transition-colors w-full border-t border-border"
                  >
                    <LogOut className="size-4" strokeWidth={1.75} />
                    Cerrar sesión
                  </button>
                </div>
              )}
            </div>
          </div>
        </header>

        {/* Main */}
        <main className="flex-1 p-6 md:p-8 max-w-[1400px] w-full mx-auto">
          {children}
        </main>
      </div>

      {/* Mobile Overlay */}
      {showMobileMenu && (
        <div
          className="fixed inset-0 bg-black/50 z-30 md:hidden"
          onClick={() => setShowMobileMenu(false)}
        />
      )}
      <Toaster position="top-right" richColors />
    </div>
  );
}