"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useState } from "react";

export function AdminSession() {
  const router = useRouter();

  useEffect(() => {
    const path = window.location.pathname;
    if (!path.startsWith("/admin")) {
      return;
    }

    // -------- COMPROBACIÓN DE SESIÓN POR PESTAÑA --------
    const tabId = sessionStorage.getItem("adminTabId");
    if (!tabId) {
      // Nueva pestaña / sesión sin identificador → obligar login
      router.replace("/login");
      return;
    }
    // ---------------------------------------------------------------------------

    // -------- TIMEOUT DE INACTIVIDAD (5 min) --------
    const IDLE_TIMEOUT = 5 * 60 * 1000; // 5 minutos en ms
    let timerId: NodeJS.Timeout;

    const resetTimer = () => {
      clearTimeout(timerId);
      timerId = setTimeout(async () => {
        try {
          await fetch("/api/auth/logout", { method: "POST" });
        } catch {}
        sessionStorage.removeItem("adminTabId");
        router.replace("/login");
      }, IDLE_TIMEOUT);
    };

    // Reinicia el timer cada vez que el usuario interactúa
    const activarEscucha = () => resetTimer();

    // Eventos considerados "actividad"
    const eventos = ["click", "keydown", "mousemove", "scroll", "touchstart"];
    eventos.forEach((e) => window.addEventListener(e, activarEscucha));

    // Iniciar el timer inmediatamente
    resetTimer();

    // Limpieza al desmontar
    return () => {
      eventos.forEach((e) => window.removeEventListener(e, activarEscucha));
      clearTimeout(timerId);
    };
  }, [router]);

  // El componente no renderiza nada visible; su trabajo es el side‑effect.
  return null;
}