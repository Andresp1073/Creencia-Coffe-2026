"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Loader2, AlertCircle, CheckCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

const ADMIN_EMAIL = "andresmauriciope1073@gmail.com";

export default function RecoverPasswordPage() {
  const router = useRouter();
  const [step, setStep] = useState<"email" | "otp" | "reset">("email");
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [token, setToken] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [sent, setSent] = useState(false);

  const handleSendCode = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    if (email.toLowerCase() !== ADMIN_EMAIL.toLowerCase()) {
      setError("El correo no está registrado");
      setLoading(false);
      return;
    }

    try {
      const res = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });

      const data = await res.json();

      if (res.ok && data.message) {
        setSent(true);
        setStep("otp");
      } else {
        setError(data.error || "Error al enviar el código");
      }
    } catch {
      setError("Error de conexión");
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyCode = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const res = await fetch("/api/auth/verify-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code }),
      });

      const data = await res.json();

      if (data.verified) {
        setToken(data.token || "");
        setStep("reset");
      } else {
        setError(data.error || "Código incorrecto");
      }
    } catch {
      setError("Error de conexión");
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    if (password !== confirmPassword) {
      setError("Las contraseñas no coinciden");
      setLoading(false);
      return;
    }

    if (password.length < 6) {
      setError("La contraseña debe tener al menos 6 caracteres");
      setLoading(false);
      return;
    }

    try {
      const res = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password, token }),
      });

      const data = await res.json();

      if (data.success) {
        router.push("/login?success=password-reset");
      } else {
        setError(data.error || "Error al cambiar la contraseña");
      }
    } catch {
      setError("Error de conexión");
    } finally {
      setLoading(false);
    }
  };

  if (step === "otp") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-muted/30 px-4">
        <div className="w-full max-w-md">
          <Link href="/login" className="flex items-center gap-2 text-sm text-muted-foreground mb-6 hover:text-foreground">
            <ArrowLeft className="size-4" /> Volver
          </Link>

          <div className="text-center mb-8">
            <h1 className="font-display text-2xl">Verificar código</h1>
            <p className="text-sm text-muted-foreground mt-1">Ingresa el código de 6 dígitos enviado a tu correo</p>
          </div>

          <form onSubmit={handleVerifyCode} className="bg-background rounded-2xl p-8 shadow-soft border border-border/50">
            {error && (
              <div className="mb-6 p-4 rounded-xl bg-destructive/10 flex items-center gap-3 text-sm text-destructive">
                <AlertCircle className="size-4 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <div className="space-y-5">
              <div>
                <Input
                  type="text"
                  value={code}
                  onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                  className="text-center text-2xl tracking-widest"
                  placeholder="000000"
                  maxLength={6}
                  required
                />
              </div>

              <Button type="submit" disabled={loading || code.length !== 6} className="w-full">
                {loading ? <Loader2 className="size-5 animate-spin mx-auto" /> : "Verificar código"}
              </Button>
            </div>
          </form>
        </div>
      </div>
    );
  }

  if (step === "reset") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-muted/30 px-4">
        <div className="w-full max-w-md">
          <div className="text-center mb-8">
            <h1 className="font-display text-2xl">Nueva contraseña</h1>
            <p className="text-sm text-muted-foreground mt-1">Ingresa tu nueva contraseña</p>
          </div>

          <form onSubmit={handleResetPassword} className="bg-background rounded-2xl p-8 shadow-soft border border-border/50">
            {error && (
              <div className="mb-6 p-4 rounded-xl bg-destructive/10 flex items-center gap-3 text-sm text-destructive">
                <AlertCircle className="size-4 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <div className="space-y-5">
              <div>
                <label className="block text-sm font-medium mb-2">Nueva contraseña</label>
                <Input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Confirmar contraseña</label>
                <Input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                />
              </div>

              <Button type="submit" disabled={loading} className="w-full">
                {loading ? <Loader2 className="size-5 animate-spin mx-auto" /> : "Cambiar contraseña"}
              </Button>
            </div>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-muted/30 px-4">
      <div className="w-full max-w-md">
        <Link href="/login" className="flex items-center gap-2 text-sm text-muted-foreground mb-6 hover:text-foreground">
          <ArrowLeft className="size-4" /> Volver
        </Link>

        <div className="text-center mb-8">
          <h1 className="font-display text-2xl">Recuperar contraseña</h1>
          <p className="text-sm text-muted-foreground mt-1">Ingresa tu correo admin para recibir un código</p>
        </div>

        <form onSubmit={handleSendCode} className="bg-background rounded-2xl p-8 shadow-soft border border-border/50">
          {sent && (
            <div className="mb-6 p-4 rounded-xl bg-green-100 flex items-center gap-3 text-sm text-green-700">
              <CheckCircle className="size-4 shrink-0" />
              <span>Código enviado a tu correo</span>
            </div>
          )}

          {error && (
            <div className="mb-6 p-4 rounded-xl bg-destructive/10 flex items-center gap-3 text-sm text-destructive">
              <AlertCircle className="size-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <div className="space-y-5">
            <div>
              <Input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="correo@ejemplo.com"
                required
              />
            </div>

            <Button type="submit" disabled={loading} className="w-full">
              {loading ? <Loader2 className="size-5 animate-spin mx-auto" /> : "Enviar código"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}