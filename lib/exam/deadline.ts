/**
 * Menghitung batas akhir waktu pengerjaan sesi ujian (serverEndTime)
 * Sesi berakhir pada min(startedAt + duration, examEndsAt)
 */
export function calculateSessionDeadline(
  startedAt: string,
  durationMinutes: number,
  examEndsAt?: string | null
): string {
  const startedMs = new Date(startedAt).getTime();
  const durationMs = durationMinutes * 60 * 1000;
  const nominalDeadline = startedMs + durationMs;

  if (!examEndsAt) {
    return new Date(nominalDeadline).toISOString();
  }

  const examEndMs = new Date(examEndsAt).getTime();
  if (isNaN(examEndMs)) {
    return new Date(nominalDeadline).toISOString();
  }

  const deadlineMs = Math.min(nominalDeadline, examEndMs);
  return new Date(deadlineMs).toISOString();
}

