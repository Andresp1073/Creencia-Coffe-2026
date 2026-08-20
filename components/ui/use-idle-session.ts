"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";

export type IdleWarning = "extend" | "expired" | null;

/** Tiempo de inactividad que dispara el aviso de extensión (5 minutos). */
export const IDLE_TIMEOUT_MS = 5 * 60 * 1000;
/** Tiempo que se espera la respuesta del usuario antes de expirar la sesión. */
export const IDLE_GRACE_MS = 60 * 1000;
/** Espera al redirigir después de mostrar "Sesión expirada" (tiempo visible). */
export const EXPIRED_REDIRECT_DELAY_MS = 5000;
/** Umbral de eventos de actividad para no resetear el timer a cada mousemove. */
const ACTIVITY_THROTTLE_MS = 30 * 1000;

const ACTIVITY_EVENTS = ["mousedown", "keydown", "touchstart", "scroll", "click", "mousemove", "wheel"];

export interface UseIdleSessionOptions {
  idleMs?: number;
  graceMs?: number;
}

/**
 * Control de sesión por inactividad (solo admin).
 *
 * - Tras `idleMs` sin actividad se muestra el aviso "extender sesión".
 * - Si el usuario confirma, se llama a POST /api/auth/extend (renueva el JWT)
 *   y se reinicia el contador.
 * - Si no responde en `graceMs`, la sesión se cierra: muestra "Sesión
 *   expirada", ejecuta /api/auth/logout y redirige a /login.
 */
export function useIdleSession(options: UseIdleSessionOptions = {}) {
  // El router se captura UNA vez: en el test y en renderizados su identidad
  // puede cambiar y cada cambio re-ejecutaría el effect de listeners, cuyo
  // cleanup cancelaría los timers de inactividad/gracia.
  const routerRef = useRef(useRouter());
  const { idleMs = IDLE_TIMEOUT_MS, graceMs = IDLE_GRACE_MS } = options;

  const [warning, setWarning] = useState<IdleWarning>(null);

  const warningRef = useRef<IdleWarning>(null);
  const lastActivityRef = useRef<number>(Date.now());
  const idleTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const graceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clearTimers = useCallback(() => {
    if (idleTimerRef.current) {
      clearTimeout(idleTimerRef.current);
      idleTimerRef.current = null;
    }
    if (graceTimerRef.current) {
      clearTimeout(graceTimerRef.current);
      graceTimerRef.current = null;
    }
  }, []);

  const applyWarning = useCallback(
    (next: IdleWarning) => {
      warningRef.current = next;
      setWarning(next);
      if (!next) clearTimers();
    },
    [clearTimers]
  );

  const goToLogin = useCallback(() => {
    routerRef.current.push("/login");
  }, []);

  /** Cierre inmediato de sesión (igual que el logout actual del menú). */
  const logoutNow = useCallback(async () => {
    clearTimers();
    try {
      await fetch("/api/auth/logout", { method: "POST", credentials: "include" });
    } catch {
      // Si el fetch falla el cookie httpOnly igual no se valida en el servidor.
    }
    goToLogin();
  }, [clearTimers, goToLogin]);

  /**
   * Muestra "Sesión expirada", cierra la cookie de sesión y redirige después
   * de EXPIRED_REDIRECT_DELAY_MS. NUNCA redirige sin avisar: se usa siempre
   * que la sesión murió por inactividad, por JWT caducado (extend 401) o al
   * volver a la pestaña con sesión inválida.
   */
  const markExpired = useCallback(() => {
    if (warningRef.current === "expired") return;
    applyWarning("expired");
    void fetch("/api/auth/logout", { method: "POST", credentials: "include" }).catch(() => {});
    setTimeout(goToLogin, EXPIRED_REDIRECT_DELAY_MS);
  }, [applyWarning, goToLogin]);

  const startGrace = useCallback(() => {
    if (graceTimerRef.current) clearTimeout(graceTimerRef.current);
    graceTimerRef.current = setTimeout(markExpired, graceMs);
  }, [graceMs, markExpired]);

  const showExtendPrompt = useCallback(() => {
    if (warningRef.current !== null) return;
    applyWarning("extend");
    startGrace();
  }, [applyWarning, startGrace]);

  const scheduleIdle = useCallback(() => {
    clearTimers();
    if (warningRef.current !== null) return;
    idleTimerRef.current = setTimeout(showExtendPrompt, idleMs);
  }, [clearTimers, idleMs, showExtendPrompt]);

  const confirmExtend = useCallback(async () => {
    try {
      const res = await fetch("/api/auth/extend", { method: "POST", credentials: "include" });
      if (!res.ok) {
        // La sesión ya caducó en el servidor: avisar y cerrar, NO redirigir al tiro.
        markExpired();
        return;
      }
      lastActivityRef.current = Date.now();
      applyWarning(null);
      scheduleIdle();
    } catch {
      markExpired();
    }
  }, [applyWarning, scheduleIdle, markExpired]);

  useEffect(() => {
    const onActivity = () => {
      const now = Date.now();
      if (now - lastActivityRef.current < ACTIVITY_THROTTLE_MS) return;
      lastActivityRef.current = now;
      if (warningRef.current === null) scheduleIdle();
    };

    for (const event of ACTIVITY_EVENTS) {
      window.addEventListener(event, onActivity, { passive: true });
    }
    scheduleIdle();

    return () => {
      for (const event of ACTIVITY_EVENTS) {
        window.removeEventListener(event, onActivity);
      }
      clearTimers();
    };
  }, [scheduleIdle, clearTimers]);

  return { warning, confirmExtend, logoutNow, goToLogin, markExpired };
}