"use client";

import { useActionState, useState } from "react";
import { loginAdmin, type AuthState } from "@/actions/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertCircle, Eye, EyeOff, Loader2, LockKeyhole, User } from "lucide-react";

interface AdminLoginFormProps {
  initialMessage?: string;
}

const initialState: AuthState = {
  success: false,
};

export function AdminLoginForm({ initialMessage }: AdminLoginFormProps) {
  const [state, formAction, isPending] = useActionState(loginAdmin, initialState);
  const [showPassword, setShowPassword] = useState(false);

  return (
    <form action={formAction} className="space-y-4">
      {initialMessage && !state.error && (
        <Alert variant="default" className="border-indigo-200 bg-indigo-50/50 text-indigo-900 dark:border-indigo-900/50 dark:bg-indigo-950/20 dark:text-indigo-300">
          <AlertCircle className="size-4 text-indigo-600 dark:text-indigo-400" />
          <AlertDescription>{initialMessage}</AlertDescription>
        </Alert>
      )}

      {state.error && (
        <Alert variant="destructive">
          <AlertCircle className="size-4" />
          <AlertDescription>{state.error}</AlertDescription>
        </Alert>
      )}

      <div className="space-y-2">
        <label
          htmlFor="username"
          className="text-xs font-semibold tracking-wider text-slate-700 uppercase dark:text-slate-300"
        >
          Nama Pengguna
        </label>
        <div className="relative">
          <Input
            id="username"
            name="username"
            type="text"
            required
            autoComplete="username"
            placeholder="admin"
            disabled={isPending}
            className="pl-9"
          />
          <User className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-slate-400" />
        </div>
      </div>

      <div className="space-y-2">
        <label
          htmlFor="password"
          className="text-xs font-semibold tracking-wider text-slate-700 uppercase dark:text-slate-300"
        >
          Kata Sandi
        </label>
        <div className="relative">
          <Input
            id="password"
            name="password"
            type={showPassword ? "text" : "password"}
            required
            autoComplete="current-password"
            placeholder="••••••••"
            disabled={isPending}
            className="pr-10 pl-9"
          />
          <LockKeyhole className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-slate-400" />
          <button
            type="button"
            onClick={() => setShowPassword((prev) => !prev)}
            disabled={isPending}
            className="absolute top-1/2 right-3 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
            tabIndex={-1}
            aria-label={showPassword ? "Sembunyikan kata sandi" : "Tampilkan kata sandi"}
          >
            {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
          </button>
        </div>
      </div>

      <Button
        type="submit"
        disabled={isPending}
        className="w-full bg-indigo-600 text-white hover:bg-indigo-700"
      >
        {isPending ? (
          <>
            <Loader2 className="mr-2 size-4 animate-spin" />
            Memverifikasi Kredensial...
          </>
        ) : (
          "Masuk ke Dasbor"
        )}
      </Button>
    </form>
  );
}

