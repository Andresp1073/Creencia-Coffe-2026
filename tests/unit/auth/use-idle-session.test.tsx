import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { renderHook, act } from "@testing-library/react";
import {
  useIdleSession,
  IDLE_TIMEOUT_MS,
  IDLE_GRACE_MS,
  EXPIRED_REDIRECT_DELAY_MS,
} from "@/components/ui/use-idle-session";

const { pushMock } = vi.hoisted(() => ({ pushMock: vi.fn() }));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: pushMock }),
}));

/** Respuesta fetch genérica (200). */
function okResponse() {
  return Promise.resolve(new Response(null, { status: 200 }));
}

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(new Date("2026-01-01T00:00:00Z"));
  pushMock.mockReset();
  vi.mocked(fetch).mockReset();
  vi.mocked(fetch).mockImplementation(okResponse);
});

afterEach(() => {
  vi.useRealTimers();
  vi.mocked(fetch).mockReset();
});

describe("useIdleSession (Fase 8 - inactividad admin)", () => {
  it("tras idleMs sin actividad muestra el aviso de extender", () => {
    const { result } = renderHook(() => useIdleSession({ idleMs: 1000, graceMs: IDLE_GRACE_MS }));

    act(() => {
      vi.advanceTimersByTime(1000);
    });

    expect(result.current.warning).toBe("extend");
  });

  it("la actividad reinicia el contador y retrasa el aviso", () => {
    const { result } = renderHook(() => useIdleSession({ idleMs: 35000, graceMs: IDLE_GRACE_MS }));

    act(() => {
      vi.advanceTimersByTime(31000);
      window.dispatchEvent(new Event("mousemove"));
    });
    act(() => {
      vi.advanceTimersByTime(34000);
    });
    expect(result.current.warning).toBeNull();

    act(() => {
      vi.advanceTimersByTime(1000);
    });
    expect(result.current.warning).toBe("extend");
  });

  it("confirmExtend llama a /api/auth/extend, reinicia el aviso y reprograma el contador", async () => {
    const extendCall = vi.fn(okResponse);
    vi.mocked(fetch).mockImplementation((input) =>
      String(input).includes("/api/auth/extend") ? extendCall() : okResponse()
    );

    const { result } = renderHook(() => useIdleSession({ idleMs: 1000, graceMs: IDLE_GRACE_MS }));
    act(() => {
      vi.advanceTimersByTime(1000);
    });
    expect(result.current.warning).toBe("extend");
    expect(extendCall).not.toHaveBeenCalled();

    await act(async () => {
      await result.current.confirmExtend();
    });
    expect(extendCall).toHaveBeenCalledTimes(1);
    expect(result.current.warning).toBeNull();

    act(() => {
      vi.advanceTimersByTime(1000);
    });
    expect(result.current.warning).toBe("extend");
  });

  it("si el extend responde 401, muestra Sesión expirada y luego navega a login", async () => {
    vi.mocked(fetch).mockImplementation((input) =>
      String(input).includes("/api/auth/extend")
        ? Promise.resolve(new Response(null, { status: 401 }))
        : okResponse()
    );

    const { result } = renderHook(() => useIdleSession({ idleMs: 1000, graceMs: IDLE_GRACE_MS }));
    act(() => {
      vi.advanceTimersByTime(1000);
    });

    await act(async () => {
      await result.current.confirmExtend();
    });

    expect(result.current.warning).toBe("expired");
    expect(pushMock).not.toHaveBeenCalled();

    act(() => {
      vi.advanceTimersByTime(EXPIRED_REDIRECT_DELAY_MS);
    });
    expect(pushMock).toHaveBeenCalledWith("/login");
  });

  it("markExpired muestra Sesión expirada de inmediato y redirige después del delay", () => {
    const { result } = renderHook(() => useIdleSession({ idleMs: 1000, graceMs: IDLE_GRACE_MS }));
    act(() => {
      vi.advanceTimersByTime(1000);
    });

    act(() => {
      result.current.markExpired();
    });
    expect(result.current.warning).toBe("expired");
    expect(pushMock).not.toHaveBeenCalled();

    act(() => {
      vi.advanceTimersByTime(EXPIRED_REDIRECT_DELAY_MS);
    });
    expect(pushMock).toHaveBeenCalledWith("/login");
  });

  it("si no responde en graceMs: muestra Sesión expirada, hace logout y redirige", () => {
    const { result } = renderHook(() => useIdleSession({ idleMs: 1000, graceMs: 500 }));

    act(() => {
      vi.advanceTimersByTime(1000);
    });
    expect(result.current.warning).toBe("extend");

    act(() => {
      vi.advanceTimersByTime(500);
    });
    expect(result.current.warning).toBe("expired");

    const logoutCall = vi.mocked(fetch).mock.calls.find(([input]) => String(input).includes("/api/auth/logout"));
    expect(logoutCall).toBeTruthy();
    expect(pushMock).not.toHaveBeenCalled();

    act(() => {
      vi.advanceTimersByTime(EXPIRED_REDIRECT_DELAY_MS);
    });
    expect(pushMock).toHaveBeenCalledWith("/login");
  });

  it("logoutNow cierra la sesión y navega a login de inmediato", async () => {
    const { result } = renderHook(() => useIdleSession({ idleMs: 1000, graceMs: IDLE_GRACE_MS }));

    await act(async () => {
      await result.current.logoutNow();
    });

    const logoutCall = vi.mocked(fetch).mock.calls.find(([input]) => String(input).includes("/api/auth/logout"));
    expect(logoutCall).toBeTruthy();
    expect(result.current.warning).toBeNull();
    expect(pushMock).toHaveBeenCalledWith("/login");
  });
});