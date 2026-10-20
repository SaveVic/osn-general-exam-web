"use client";

import { useActionState, useEffect, useState } from "react";
import { loginAdmin, type AuthState } from "@/actions/auth";
import { useExamGateStore } from "@/lib/stores/exam-gate-store";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { AlertCircle, Eye, EyeOff, Loader2, LockKeyhole, User } from "lucide-react";

interface AdminLoginFormProps {
  initialMessage?: string;
}

const initialState: AuthState = {
  success: false,
};

export function AdminLoginForm({ initialMessage }: AdminLoginFormProps) {
  const [state, formAction, isPending] = useActionState(loginAdmin, initialState);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  // Pastikan state gerbang peserta ("/") dan form admin di-reset saat berpindah halaman
  useEffect(() => {
    useExamGateStore.getState().resetGate();
    return () => {
      setUsername("");
      setPassword("");
      setShowPassword(false);
    };
  }, []);

  const errorMessage = state.error || initialMessage;

  return (
    <form action={formAction} className="space-y-4">
      {errorMessage && (
        <div
          role="alert"
          className="flex items-start gap-2.5 rounded-lg border border-rose-200 bg-rose-50 p-3 text-xs text-rose-800 dark:border-rose-900/60 dark:bg-rose-950/40 dark:text-rose-200"
        >
          <AlertCircle className="mt-0.5 size-4 shrink-0" />
          <div className="flex-1 leading-relaxed">
            {errorMessage}
          </div>
        </div>
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
            value={username}
            onChange={(e) => setUsername(e.target.value)}
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
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            disabled={isPending}
            className="pr-10 pl-9"
          />
          <LockKeyhole className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-slate-400" />
          <button
            type="button"
            onClick={() => setShowPassword((prev) => !prev)}
            disabled={isPending}
            className="absolute top-1/2 right-3 -translate-y-1/2 cursor-pointer text-slate-400 hover:text-slate-600 disabled:cursor-not-allowed dark:hover:text-slate-200"
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
        className="w-full cursor-pointer bg-indigo-600 text-white hover:bg-indigo-700 disabled:cursor-not-allowed"
      >
        {isPending ? (
          <>
            <Loader2 className="mr-2 size-4 animate-spin" />
            <span>Memverifikasi</span>
          </>
        ) : (
          <span>Masuk</span>
        )}
      </Button>
    </form>
  );
}
