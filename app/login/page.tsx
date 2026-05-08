"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Coffee, ArrowLeft, Loader2, Eye, EyeOff, AlertCircle, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

interface FormErrors {
  username?: string;
  password?: string;
}

export default function LoginPage() {
  const router = useRouter();
  const usernameRef = useRef<HTMLInputElement>(null);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [errors, setErrors] = useState<FormErrors>({});

  const validateForm = (): boolean => {
    const newErrors: FormErrors = {};

    if (!username.trim()) {
      newErrors.username = "El usuario es obligatorio";
    } else if (username.trim().length < 3) {
      newErrors.username = "El usuario debe tener al menos 3 caracteres";
    }

    if (!password) {
      newErrors.password = "La contraseña es obligatoria";
    } else if (password.length < 4) {
      newErrors.password = "La contraseña debe tener al menos 4 caracteres";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    
    if (!validateForm()) {
      if (errors.username) {
        usernameRef.current?.focus();
      } else if (errors.password) {
        const passwordInput = document.getElementById("password") as HTMLInputElement;
        passwordInput?.focus();
      }
      return;
    }

    setLoading(true);

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username: username.trim(), password }),
      });

      const data = await res.json();

      if (!res.ok) {
        if (data.code === "INVALID_CREDENTIALS") {
          setError("El usuario o la contraseña no son correctos. Por favor verifica e intenta nuevamente.");
        } else if (data.code === "ACCOUNT_LOCKED") {
          setError("Tu cuenta está temporalmente bloqueada. Intenta más tarde o contacta al administrador.");
        } else if (data.code === "ACCOUNT_DISABLED") {
          setError("Tu cuenta ha sido desactivada. Contacta al administrador para más información.");
        } else {
          setError(data.error || "Ocurrió un error al iniciar sesión. Por favor intenta nuevamente.");
        }
        
        const passwordInput = document.getElementById("password") as HTMLInputElement;
        passwordInput?.focus();
      } else {
        window.location.href = "/admin";
      }
    } catch {
      setError("No se puede conectar al servidor. Verifica tu conexión a internet e intenta nuevamente.");
    } finally {
      setLoading(false);
    }
  };

  const handleUsernameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setUsername(e.target.value);
    if (errors.username) {
      setErrors(prev => ({ ...prev, username: undefined }));
    }
  };

  const handlePasswordChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setPassword(e.target.value);
    if (errors.password) {
      setErrors(prev => ({ ...prev, password: undefined }));
    }
  };

  return (
    <main id="main-content" className="min-h-screen flex items-center justify-center bg-muted/30 px-4 py-12">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div 
            className="mx-auto size-14 rounded-full bg-coffee-dark/10 flex items-center justify-center mb-4" 
            aria-hidden="true"
          >
            <Coffee className="size-7 text-coffee-dark" strokeWidth={1.5} />
          </div>
          <h1 className="font-display text-2xl text-foreground">Admin</h1>
          <p className="text-sm text-muted-foreground mt-1">Ingresa tus credenciales</p>
        </div>

        <form 
          onSubmit={handleSubmit} 
          className="bg-background rounded-2xl p-8 shadow-soft border border-border/50"
          noValidate
          aria-label="Formulario de inicio de sesión"
        >
          {error && (
            <div 
              className="mb-6 p-4 rounded-xl bg-destructive/10 flex items-start gap-3 text-sm text-destructive border border-destructive/20" 
              role="alert"
              aria-live="assertive"
            >
              <AlertCircle className="size-4 shrink-0 mt-0.5" aria-hidden="true" />
              <div>
                <p className="font-medium">Error de autenticación</p>
                <p className="mt-1 opacity-90">{error}</p>
              </div>
            </div>
          )}

          <div className="space-y-5">
            <div>
              <label 
                htmlFor="username" 
                className="block text-sm font-medium mb-2"
              >
                Usuario
                <span className="text-destructive ml-1" aria-hidden="true">*</span>
                <span className="sr-only"> (obligatorio)</span>
              </label>
              <Input
                ref={usernameRef}
                id="username"
                type="text"
                value={username}
                onChange={handleUsernameChange}
                placeholder="Ingresa tu usuario"
                required
                aria-required="true"
                aria-invalid={!!errors.username}
                aria-describedby={errors.username ? "username-error" : "username-hint"}
                className={errors.username ? "border-destructive focus-visible:ring-destructive" : ""}
              />
              {errors.username && (
                <p id="username-error" className="text-xs text-destructive mt-1.5 flex items-center gap-1" role="alert">
                  <AlertCircle className="size-3" aria-hidden="true" />
                  {errors.username}
                </p>
              )}
              <p id="username-hint" className="text-xs text-muted-foreground mt-1.5">
                Mínimo 3 caracteres
              </p>
            </div>

            <div>
              <label 
                htmlFor="password" 
                className="block text-sm font-medium mb-2"
              >
                Contraseña
                <span className="text-destructive ml-1" aria-hidden="true">*</span>
                <span className="sr-only"> (obligatoria)</span>
              </label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={handlePasswordChange}
                  placeholder="Ingresa tu contraseña"
                  required
                  aria-required="true"
                  aria-invalid={!!errors.password}
                  aria-describedby={errors.password ? "password-error" : undefined}
                  className={errors.password ? "border-destructive focus-visible:ring-destructive pr-12" : "pr-12"}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-caramel rounded p-1"
                  aria-label={showPassword ? "Ocultar contraseña" : "Mostrar contraseña"}
                >
                  {showPassword ? <EyeOff className="size-5" /> : <Eye className="size-5" />}
                </button>
              </div>
              {errors.password && (
                <p id="password-error" className="text-xs text-destructive mt-1.5 flex items-center gap-1" role="alert">
                  <AlertCircle className="size-3" aria-hidden="true" />
                  {errors.password}
                </p>
              )}
            </div>

            <Button 
              type="submit" 
              disabled={loading}
              className="w-full"
              aria-describedby="submit-hint"
            >
              {loading ? (
                <>
                  <Loader2 className="size-5 animate-spin mr-2" aria-hidden="true" />
                  <span>Verificando credenciales...</span>
                </>
              ) : (
                "Ingresar"
              )}
            </Button>
            <p id="submit-hint" className="sr-only">
              {loading ? "正在验证您的凭据" : "Presiona el botón para iniciar sesión"}
            </p>
          </div>

          <Link
            href="/recuperar-password"
            className="block text-center text-sm text-muted-foreground hover:text-foreground mt-4 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-caramel rounded"
          >
            ¿Olvidaste tu contraseña?
          </Link>
        </form>

        <p className="text-center text-xs text-muted-foreground mt-6">
          <Link 
            href="/" 
            className="inline-flex items-center gap-1 hover:text-foreground transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-caramel rounded"
          >
            <ArrowLeft className="size-3" aria-hidden="true" />
            Volver al sitio
          </Link>
        </p>
      </div>
    </main>
  );
}