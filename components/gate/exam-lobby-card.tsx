"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useExamGateStore } from "@/lib/stores/exam-gate-store";
import { useExamSessionStore } from "@/lib/stores/exam-session-store";
import { useExamStatusEngine } from "@/hooks/use-exam-status-engine";
import { lobbyIdentitySchema } from "@/lib/validations/lobby";
import { startExamSessionAction } from "@/actions/exam-session";
import { MarkdownRenderer } from "@/components/ui/markdown-renderer";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import type { VerifiedGateData } from "@/actions/gate";
import {
  AlertCircle,
  ArrowRight,
  BookOpen,
  Calendar,
  CheckCircle2,
  Clock,
  GraduationCap,
  Hourglass,
  Loader2,
  RotateCcw,
  ShieldCheck,
  User,
} from "lucide-react";

interface ExamLobbyCardProps {
  verifiedData: VerifiedGateData;
}

export function ExamLobbyCard({ verifiedData }: ExamLobbyCardProps) {
  const router = useRouter();
  const resetGate = useExamGateStore((state) => state.resetGate);
  const studentName = useExamGateStore((state) => state.studentName);
  const studentClass = useExamGateStore((state) => state.studentClass);
  const setStudentName = useExamGateStore((state) => state.setStudentName);
  const setStudentClass = useExamGateStore((state) => state.setStudentClass);
  const initSession = useExamSessionStore((state) => state.initSession);

  const [formAttempted, setFormAttempted] = useState(false);
  const [isStarting, setIsStarting] = useState(false);
  const [startError, setStartError] = useState<string | null>(null);

  const { exam, referralCode, serverTime } = verifiedData;

  // Mesin status waktu dinamis
  const statusEngine = useExamStatusEngine({
    startsAt: exam.starts_at,
    endsAt: exam.ends_at,
    serverTime,
  });

  // Validasi form identitas
  const isNameValid = studentName.trim().length >= 3;
  const isClassValid = studentClass.trim().length >= 1;
  const isFormValid = isNameValid && isClassValid;

  const classOptions = useMemo(() => {
    if (Array.isArray(exam.class_options) && exam.class_options.length > 0) {
      return exam.class_options;
    }
    return ["Umum"];
  }, [exam.class_options]);

  const formatDateTime = (isoString: string) => {
    try {
      const d = new Date(isoString);
      return new Intl.DateTimeFormat("id-ID", {
        weekday: "long",
        day: "numeric",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
        timeZoneName: "short",
      }).format(d);
    } catch {
      return isoString;
    }
  };

  const handleStartExam = async () => {
    setFormAttempted(true);
    setStartError(null);
    if (!isFormValid || isStarting) return;

    // Tahapan validasi Zod
    const validation = lobbyIdentitySchema.safeParse({
      studentName,
      studentClass,
    });

    if (!validation.success) {
      return;
    }

    setIsStarting(true);
    try {
      const res = await startExamSessionAction({
        referralCode,
        studentName,
        studentClass,
      });

      if (res.success && res.data) {
        initSession(res.data);
        router.push(`/ujian/${res.data.sessionId}`);
      } else {
        setStartError(res.message || "Gagal memulai sesi pengerjaan ujian.");
        setIsStarting(false);
      }
    } catch {
      setStartError("Terjadi gangguan koneksi ke server saat memulai ujian.");
      setIsStarting(false);
    }
  };

  return (
    <div className="w-full max-w-2xl animate-in fade-in zoom-in-95 duration-200">
      {/* Header Lobi */}
      <div className="mb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <div className="inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700 shadow-xs dark:border-emerald-900/60 dark:bg-emerald-950/40 dark:text-emerald-300">
            <CheckCircle2 className="size-3.5 text-emerald-600 dark:text-emerald-400" />
            <span>Kode Rujukan:</span>
            <span className="font-mono tracking-wider font-bold uppercase">{referralCode}</span>
          </div>
          <h1 className="mt-2 text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-50">
            Lobi Pra-Ujian
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Periksa rincian ujian dan lengkapi identitas Anda sebelum memulai.
          </p>
        </div>

        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={resetGate}
          className="self-start sm:self-center text-xs text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-100"
        >
          <RotateCcw className="mr-1.5 size-3.5" />
          <span>Ganti Kode</span>
        </Button>
      </div>

      <div className="space-y-6">
        {/* Banner Penunjuk Status Waktu Dinamis */}
        <div
          className={`rounded-xl border p-4 transition-colors ${
            statusEngine.status === "NOT_STARTED"
              ? "border-amber-200 bg-amber-50/70 text-amber-950 dark:border-amber-900/60 dark:bg-amber-950/30 dark:text-amber-200"
              : statusEngine.status === "IN_PROGRESS"
              ? "border-emerald-200 bg-emerald-50/70 text-emerald-950 dark:border-emerald-900/60 dark:bg-emerald-950/30 dark:text-emerald-200"
              : "border-slate-200 bg-slate-100 text-slate-900 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-200"
          }`}
        >
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div className="flex items-center gap-2.5">
              {statusEngine.status === "NOT_STARTED" ? (
                <div className="flex size-9 items-center justify-center rounded-lg bg-amber-500/20 text-amber-700 dark:text-amber-400">
                  <Hourglass className="size-5 animate-pulse" />
                </div>
              ) : statusEngine.status === "IN_PROGRESS" ? (
                <div className="flex size-9 items-center justify-center rounded-lg bg-emerald-500/20 text-emerald-700 dark:text-emerald-400">
                  <Clock className="size-5" />
                </div>
              ) : (
                <div className="flex size-9 items-center justify-center rounded-lg bg-slate-500/20 text-slate-600 dark:text-slate-400">
                  <AlertCircle className="size-5" />
                </div>
              )}
              <div>
                <div className="text-xs font-semibold uppercase tracking-wider">
                  {statusEngine.status === "NOT_STARTED"
                    ? "Menunggu Jadwal Mulai"
                    : statusEngine.status === "IN_PROGRESS"
                    ? "Sesi Ujian Sedang Aktif"
                    : "Jadwal Pelaksanaan Selesai"}
                </div>
                <div className="text-xs opacity-80">
                  {statusEngine.status === "NOT_STARTED"
                    ? "Sistem akan membuka akses otomatis saat waktu tiba."
                    : statusEngine.status === "IN_PROGRESS"
                    ? "Anda dapat mengerjakan ujian hingga batas waktu berakhir."
                    : "Sesi ujian ini telah resmi ditutup."}
                </div>
              </div>
            </div>

            <div className="text-left sm:text-right font-mono tabular-nums">
              <span className="text-xs block opacity-70">
                {statusEngine.status === "NOT_STARTED"
                  ? "Dimulai dalam:"
                  : statusEngine.status === "IN_PROGRESS"
                  ? "Sisa waktu sesi:"
                  : "Status:"}
              </span>
              <span className="text-xl font-bold tracking-tight">
                {statusEngine.status === "ENDED"
                  ? "Selesai"
                  : statusEngine.countdownText}
              </span>
            </div>
          </div>
        </div>

        {/* Kartu Informasi & Petunjuk Naskah Ujian */}
        <Card className="border-slate-200 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <CardHeader className="space-y-2">
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="border-indigo-200 text-indigo-700 dark:border-indigo-800 dark:text-indigo-300">
                Naskah Ujian Resmi
              </Badge>
              <Badge variant="secondary" className="font-mono text-xs">
                {exam.duration_minutes} Menit
              </Badge>
            </div>
            <CardTitle className="text-xl font-bold text-slate-900 dark:text-slate-50 leading-snug">
              {exam.title}
            </CardTitle>
            <CardDescription className="text-xs text-slate-500">
              Pelajari informasi jadwal dan petunjuk teknis di bawah ini dengan saksama.
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-4 pt-0">
            {/* Grid Jadwal & Durasi */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              <div className="flex items-start gap-2.5 rounded-lg border border-slate-100 bg-slate-50/70 p-3 dark:border-slate-800/60 dark:bg-slate-800/40">
                <Calendar className="size-4 shrink-0 text-indigo-600 dark:text-indigo-400 mt-0.5" />
                <div>
                  <span className="font-medium text-slate-500 dark:text-slate-400 block">
                    Waktu Mulai
                  </span>
                  <span className="font-mono font-semibold text-slate-800 dark:text-slate-200 tabular-nums">
                    {formatDateTime(exam.starts_at)}
                  </span>
                </div>
              </div>

              <div className="flex items-start gap-2.5 rounded-lg border border-slate-100 bg-slate-50/70 p-3 dark:border-slate-800/60 dark:bg-slate-800/40">
                <Calendar className="size-4 shrink-0 text-indigo-600 dark:text-indigo-400 mt-0.5" />
                <div>
                  <span className="font-medium text-slate-500 dark:text-slate-400 block">
                    Batas Akhir Selesai
                  </span>
                  <span className="font-mono font-semibold text-slate-800 dark:text-slate-200 tabular-nums">
                    {formatDateTime(exam.ends_at)}
                  </span>
                </div>
              </div>
            </div>

            {/* Petunjuk Teknis Markdown */}
            {exam.description && (
              <div className="rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-950">
                <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-700 dark:text-slate-300 mb-2">
                  <BookOpen className="size-3.5 text-indigo-600 dark:text-indigo-400" />
                  <span>Petunjuk Pengerjaan Teknis</span>
                </div>
                <div className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed max-h-48 overflow-y-auto pr-1">
                  <MarkdownRenderer content={exam.description} />
                </div>
              </div>
            )}

            {/* Formulir Identitas Siswa */}
            <div className="rounded-xl border border-indigo-100 bg-indigo-50/30 p-4 dark:border-indigo-950/60 dark:bg-indigo-950/20 space-y-4">
              <div className="flex items-center gap-2">
                <div className="flex size-6 items-center justify-center rounded-full bg-indigo-600 text-white text-xs font-bold">
                  !
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                    Identitas Peserta Ujian
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Data ini akan dicatat pada lembar jawaban dan sesi ujian resmi Anda.
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Input Nama Lengkap */}
                <div className="space-y-1.5">
                  <label
                    htmlFor="student-name"
                    className="text-xs font-semibold tracking-wider text-slate-700 dark:text-slate-300 uppercase flex items-center gap-1"
                  >
                    <User className="size-3 text-slate-400" />
                    <span>Nama Lengkap Siswa</span>
                    <span className="text-rose-500">*</span>
                  </label>
                  <Input
                    id="student-name"
                    name="studentName"
                    placeholder="Contoh: Budi Santoso"
                    value={studentName}
                    onChange={(e) => setStudentName(e.target.value)}
                    className="text-sm bg-white dark:bg-slate-900"
                    autoComplete="name"
                    spellCheck="false"
                  />
                  {formAttempted && !isNameValid && (
                    <p className="text-xs text-rose-600 dark:text-rose-400">
                      Nama lengkap wajib diisi minimal 3 karakter.
                    </p>
                  )}
                </div>

                {/* Dropdown Kelas */}
                <div className="space-y-1.5">
                  <label
                    htmlFor="student-class"
                    className="text-xs font-semibold tracking-wider text-slate-700 dark:text-slate-300 uppercase flex items-center gap-1"
                  >
                    <GraduationCap className="size-3 text-slate-400" />
                    <span>Pilih Kelas Peserta</span>
                    <span className="text-rose-500">*</span>
                  </label>
                  <select
                    id="student-class"
                    name="studentClass"
                    value={studentClass}
                    onChange={(e) => setStudentClass(e.target.value)}
                    className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 shadow-xs focus:border-indigo-600 focus:outline-none focus:ring-1 focus:ring-indigo-600 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-100"
                  >
                    <option value="" disabled>
                      -- Pilih Kelas Peserta --
                    </option>
                    {classOptions.map((opt) => (
                      <option key={opt} value={opt}>
                        {opt}
                      </option>
                    ))}
                  </select>
                  {formAttempted && !isClassValid && (
                    <p className="text-xs text-rose-600 dark:text-rose-400">
                      Silakan pilih kelas peserta Anda.
                    </p>
                  )}
                </div>
              </div>
            </div>
          </CardContent>

          {/* Footer Tombol Status Dinamis 3-Tahap */}
          <CardFooter className="flex flex-col gap-2.5 border-t border-slate-100 pt-4 dark:border-slate-800">
            {startError && (
              <div
                role="alert"
                className="w-full flex items-start gap-2.5 rounded-lg border border-rose-200 bg-rose-50 p-3 text-xs text-rose-800 dark:border-rose-900/60 dark:bg-rose-950/40 dark:text-rose-200"
              >
                <AlertCircle className="size-4 shrink-0 mt-0.5" />
                <div className="flex-1 leading-relaxed">{startError}</div>
              </div>
            )}

            {statusEngine.status === "NOT_STARTED" ? (
              <Button
                type="button"
                disabled
                className="w-full bg-slate-200 text-slate-500 dark:bg-slate-800 dark:text-slate-400 cursor-not-allowed font-medium py-6"
              >
                <Hourglass className="mr-2 size-4 animate-spin text-slate-400" />
                <span className="font-mono tabular-nums">
                  Dimulai dalam: {statusEngine.countdownText}
                </span>
              </Button>
            ) : statusEngine.status === "IN_PROGRESS" ? (
              <div className="w-full space-y-2">
                <Button
                  type="button"
                  onClick={handleStartExam}
                  disabled={!isFormValid || isStarting}
                  className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-semibold py-6 text-base transition-all disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  {isStarting ? (
                    <>
                      <Loader2 className="mr-2 size-5 animate-spin" />
                      <span>Menyiapkan Sesi Ujian...</span>
                    </>
                  ) : (
                    <>
                      <ShieldCheck className="mr-2 size-5" />
                      <span>Mulai Kerjakan Ujian</span>
                      <ArrowRight className="ml-2 size-5" />
                    </>
                  )}
                </Button>
                {!isFormValid && (
                  <p className="text-center text-xs text-slate-500 dark:text-slate-400">
                    Lengkapi nama dan kelas di atas untuk mengaktifkan tombol mulai ujian.
                  </p>
                )}
              </div>
            ) : (
              <Button
                type="button"
                disabled
                className="w-full bg-rose-100 text-rose-700 dark:bg-rose-950/50 dark:text-rose-400 cursor-not-allowed font-medium py-6"
              >
                <AlertCircle className="mr-2 size-4" />
                <span>Sesi Ujian Telah Berakhir</span>
              </Button>
            )}
          </CardFooter>
        </Card>
      </div>
    </div>
  );
}

