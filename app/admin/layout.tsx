"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
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
  X,
  Tag,
  Check,
  Trash2,
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

export default function AdminLayout({
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
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [loading, setLoading] = useState(true);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    // Check sessionStorage for tab-specific session
    if (typeof window !== 'undefined' && !sessionStorage.getItem('admin-session-active')) {
      // No session in this tab, logout and redirect
      fetch('/api/auth/logout', { method: 'POST' }).finally(() => {
        router.push('/login');
      });
      return;
    }
    checkAuth();
  }, []);

  // Poll for notifications every 30 seconds
  useEffect(() => {
    if (isAuthenticated) {
      const interval = setInterval(() => {
        fetchNotifications();
      }, 30000);
      return () => clearInterval(interval);
    }
  }, [isAuthenticated]);

  useEffect(() => {
    if (!isAuthenticated || typeof window === "undefined") return;

    const handleNotificationUpdate = () => {
      fetchNotifications();
    };

    const handleForceRefresh = () => {
      fetchNotifications();
    };

    window.addEventListener("notifications:update", handleNotificationUpdate);
    window.addEventListener("force-notif-refresh", handleForceRefresh);
    
    // Also listen for storage events (from other pages)
    const handleStorageChange = (e: StorageEvent) => {
      if ((e.key === "admin-unread-count" || e.key === "notif-unread-count") && e.newValue) {
        setUnreadCount(0);
      }
    };
    window.addEventListener("storage", handleStorageChange);
    
    return () => {
      window.removeEventListener("notifications:update", handleNotificationUpdate);
      window.removeEventListener("force-notif-refresh", handleForceRefresh);
      window.removeEventListener("storage", handleStorageChange);
    };
  }, [isAuthenticated]);

  const checkAuth = async () => {
    try {
      const res = await fetch("/api/auth/me");
      if (res.ok) {
        const data = await res.json();
        setIsAuthenticated(data.authenticated);
        if (data.authenticated) {
          fetchNotifications();
        }
      } else {
        setIsAuthenticated(false);
      }
    } catch {
      setIsAuthenticated(false);
    } finally {
      setLoading(false);
    }
  };

  const fetchNotifications = async () => {
    console.log(">>> fetchNotifications called");
    try {
      const res = await fetch(`/api/admin/notifications?_t=${Date.now()}`, { credentials: "include" });
      console.log(">>> fetch response:", res.status);
      if (res.ok) {
        const data = await res.json();
        console.log(">>> notifications loaded:", data.length);
        setNotifications(data || []);
        const unread = data?.filter((n: Notification) => !n.is_read) || [];
        setUnreadCount(unread.length);
      }
    } catch (e) {
      console.error(">>> fetch error:", e);
    }
  };

const handleMarkAsRead = async (id: number) => {
    try {
      await fetch(`/api/admin/notifications/${id}`, { method: 'PUT', credentials: 'include' });
      await fetchNotifications();
      window.dispatchEvent(new Event("notifications:update"));
    } catch (e) {
      console.error(e);
    }
  };

  const handleMarkAllAsRead = async () => {
    console.log(">>> handleMarkAllAsRead called");
    try {
      const res = await fetch('/api/admin/notifications/read-all', { method: 'PATCH', credentials: 'include' });
      console.log(">>> Mark all response:", res.status, res.ok);
      await fetchNotifications();
      setShowNotifications(false);
      window.dispatchEvent(new Event("notifications:update"));
    } catch (e) {
      console.error(">>> Error:", e);
    }
  };

  const handleDeleteOne = async (id: number) => {
    console.log(">>> handleDeleteOne called:", id);
    try {
      const res = await fetch(`/api/admin/notifications/${id}`, { method: 'DELETE', credentials: 'include' });
      console.log(">>> Delete response:", res.status, res.ok);
      await fetchNotifications();
      window.dispatchEvent(new Event("notifications:update"));
    } catch (e) {
      console.error(">>> Error:", e);
    }
  };

  const handleDeleteAll = async () => {
    console.log(">>> handleDeleteAll called");
    if (!confirm("¿Eliminar todas las notificaciones?")) return;
    try {
      const res = await fetch('/api/admin/notifications', { method: 'DELETE', credentials: 'include' });
      console.log(">>> Delete all response:", res.status, res.ok);
      await fetchNotifications();
      setShowNotifications(false);
      window.dispatchEvent(new Event("notifications:update"));
    } catch (e) {
      console.error(">>> Error:", e);
    }
  };

  const handleLogout = async () => {
    try {
      await fetch("/api/auth/logout", { method: "POST" });
      sessionStorage.removeItem('admin-session-active');
      setIsAuthenticated(false);
      router.push("/login");
    } catch (error) {
      console.error("Logout error:", error);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-coffee-dark" />
      </div>
    );
  }

  if (!isAuthenticated) {
    if (typeof window !== "undefined") {
      router.push("/login");
    }
    return null;
  }

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
        <div className="h-18 flex items-center justify-between px-5 border-b border-cream/10 py-4">
          <Link href="/admin" className="flex items-center gap-2.5 overflow-hidden">
            <img
              src="/imagenes/LOGO-CC.png"
              alt="Cafe Creencia"
              className="h-9 w-9 rounded-full object-cover shrink-0"
            />
            {!collapsed && (
              <div className="leading-tight">
                <div className="font-display text-base">Creencia</div>
                <div className="text-[10px] uppercase tracking-[0.18em] text-cream/50">Admin</div>
              </div>
            )}
          </Link>
          <button
            onClick={() => setCollapsed(!collapsed)}
            className="size-7 rounded-md hover:bg-cream/10 flex items-center justify-center text-cream/70 hover:text-cream transition-smooth"
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
                  "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-smooth",
                  active
                    ? "bg-cream text-coffee-dark font-medium shadow-soft"
                    : "text-cream/75 hover:bg-cream/10 hover:text-cream"
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
          Cerrar menú
        </button>
      </aside>

      {/* Main content */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Header */}
        <header className="h-18 bg-background border-b border-border sticky top-0 z-30 flex items-center justify-between px-4 md:px-8 py-4">
          <div className="flex items-center gap-4">
            <button
              onClick={() => setShowMobileMenu(true)}
              className="md:hidden p-2 hover:bg-muted rounded-lg"
            >
              <Menu className="size-5" />
            </button>
            <div className="relative w-full max-w-sm hidden sm:block">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
              <input
                type="search"
                placeholder="Buscar productos, ventas..."
                className="w-full pl-10 pr-4 py-2 text-sm rounded-full bg-muted border border-transparent focus:bg-background focus:border-border outline-none transition-smooth"
              />
            </div>
          </div>
          <div className="flex items-center gap-3">
            {/* Notifications Dropdown */}
            <div className="relative">
              <button
                onClick={() => setShowNotifications(!showNotifications)}
                className="relative p-2 hover:bg-muted rounded-full transition-smooth"
              >
                <Bell className="size-5 text-muted-foreground" />
                {unreadCount > 0 && (
                  <span className="absolute -top-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-xs font-bold text-white">
                    {unreadCount > 9 ? "9+" : unreadCount}
                  </span>
                )}
              </button>
              
              {showNotifications && (
                <div className="absolute right-0 mt-2 w-80 bg-cream border border-border rounded-xl shadow-lg z-50 overflow-hidden">
                  <div className="px-4 py-3 border-b border-border flex items-center justify-between">
                    <span className="font-semibold text-sm text-coffee-dark">Notificaciones</span>
<div className="flex gap-2">
                      <button
                        type="button"
                        onClick={(e) => { e.preventDefault(); e.stopPropagation(); handleMarkAllAsRead(); }}
                        disabled={unreadCount === 0}
                        className="px-3 py-1.5 text-xs font-medium rounded-md bg-blue-500 text-white hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        ✓ Leer todo
                      </button>
                      <button
                        type="button"
                        onClick={(e) => { e.preventDefault(); e.stopPropagation(); handleDeleteAll(); }}
                        className="px-3 py-1.5 text-xs font-medium rounded-md bg-red-500 text-white hover:bg-red-600"
                      >
                        ✗ Eliminar
                      </button>
                    </div>
                  </div>
                  <div className="max-h-96 overflow-y-auto">
                    {notifications.length === 0 ? (
                      <div className="px-4 py-8 text-center text-sm text-gray-500">
                        No hay notificaciones
                      </div>
                    ) : (
                      <div className="space-y-2 p-2">
                        {notifications.map((notif) => (
                          <div
                            key={notif.id}
                            className={cn(
                              "flex items-start gap-2 rounded-lg p-3 transition-colors group",
                              notif.is_read ? "bg-gray-50 opacity-60" : "bg-yellow-50 hover:bg-yellow-100"
                            )}
                          >
                            {!notif.is_read && (
                              <div className="mt-0.5 h-2 w-2 rounded-full bg-red-500 flex-shrink-0" />
                            )}
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium text-coffee-dark truncate">
                                {notif.title || notif.product_name}
                              </p>
                              <p className="text-xs text-gray-600 mt-1 line-clamp-2">
                                {notif.message}
                              </p>
                              <p className="text-xs text-gray-500 mt-1">
                                {new Date(notif.created_at).toLocaleDateString("es-ES", {
                                  month: "short",
                                  day: "numeric",
                                  hour: "2-digit",
                                  minute: "2-digit",
                                })}
                              </p>
                            </div>
                            <div className="flex gap-1">
                              {!notif.is_read && (
                                <button
                                  onClick={() => handleMarkAsRead(notif.id)}
                                  className="p-1.5 rounded-md opacity-0 group-hover:opacity-100 hover:text-green-600 hover:bg-green-50"
                                  title="Marcar como leído"
                                >
                                  <Check className="h-4 w-4" />
                                </button>
                              )}
                              <button
                                onClick={() => handleDeleteOne(notif.id)}
                                className="p-1.5 rounded-md opacity-0 group-hover:opacity-100 hover:text-red-600 hover:bg-red-50"
                                title="Eliminar"
                              >
                                <Trash2 className="h-4 w-4" />
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
                    className="block px-4 py-3 text-center text-sm text-sage hover:text-coffee-dark hover:bg-muted border-t border-border"
                  >
                    Ver todas
                  </Link>
                </div>
              )}
            </div>

            {/* User menu */}
            <div className="relative">
              <button
                onClick={() => setShowUserMenu(!showUserMenu)}
                className="flex items-center gap-2.5 pl-2 hover:opacity-75 transition-opacity"
              >
                <img
                  src="/imagenes/LOGO-CC.png"
                  alt="Admin"
                  className="h-9 w-9 rounded-full object-cover"
                />
                <div className="hidden sm:block leading-tight">
                  <div className="text-sm font-medium">Admin</div>
                  <div className="text-[11px] text-muted-foreground">Cafe Creencia</div>
                </div>
              </button>
              {showUserMenu && (
                <div className="absolute top-full right-0 mt-2 bg-cream border border-border rounded-lg shadow-lg z-50 min-w-[160px]">
                  <Link
                    href="/"
                    onClick={() => setShowUserMenu(false)}
                    className="flex items-center gap-2 px-4 py-2.5 text-sm text-coffee-dark hover:bg-coffee-dark/10 rounded-lg transition-colors w-full"
                  >
                    <ArrowLeft className="size-4" strokeWidth={1.75} />
                    Volver al sitio
                  </Link>
                  <button
                    onClick={handleLogout}
                    className="flex items-center gap-2 px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 rounded-lg transition-colors w-full border-t border-border"
                  >
                    <LogOut className="size-4" strokeWidth={1.75} />
                    Cerrar sesión
                  </button>
                </div>
              )}
            </div>
          </div>
        </header>

        {/* Main content */}
        <main className="flex-1 p-4 md:p-8 max-w-[1400px] w-full">
          {children}
        </main>
      </div>

      {/* Mobile overlay */}
      {showMobileMenu && (
        <div
          className="fixed inset-0 bg-black/50 z-30 md:hidden"
          onClick={() => setShowMobileMenu(false)}
        />
      )}

      {/* Notifications overlay */}
      {showNotifications && (
        <div
          className="fixed inset-0 z-40"
          onClick={() => setShowNotifications(false)}
        />
      )}
    </div>
  );
}