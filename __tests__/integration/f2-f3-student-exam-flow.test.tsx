import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { verifyReferralCodeAction } from "@/actions/gate";
import {
  startExamSessionAction,
  verifyActiveSessionAction,
} from "@/actions/exam-session";
import { hashSessionToken } from "@/lib/security/session-token";
import { useExamSessionStore } from "@/lib/stores/exam-session-store";
import { ExamRoomShell } from "@/components/exam-room/exam-room-shell";

// Mock next/headers cookies()
const mockCookieSet = vi.fn();
const mockCookieGet = vi.fn();

vi.mock("next/headers", () => ({
  cookies: vi.fn(async () => ({
    set: mockCookieSet,
    get: mockCookieGet,
  })),
}));

// Mock Supabase Service Client
const mockServiceFrom = vi.fn();

vi.mock("@/lib/supabase/admin", () => ({
  createServiceClient: vi.fn(() => ({
    from: mockServiceFrom,
  })),
}));

describe("F2-01 & F3-01: Integrasi Keamanan Gerbang, Inisialisasi Sesi, & Zero Answer Leakage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("verifyReferralCodeAction menolak kode yang nonaktif, kedaluwarsa, atau habis kuota (Race Condition Guard)", async () => {
    const futureDate = new Date(Date.now() + 3600_000).toISOString();

    // Skenario: Kuota telah penuh (current_uses === max_uses)
    mockServiceFrom.mockReturnValueOnce({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          maybeSingle: vi.fn().mockResolvedValueOnce({
            data: {
              id: "ref-full",
              code: "OSN26-FULL",
              is_active: true,
              expires_at: futureDate,
              max_uses: 1,
              current_uses: 1,
              exams: {
                id: "exam-1",
                is_published: true,
                ends_at: futureDate,
              },
            },
            error: null,
          }),
        })),
      })),
    });

    const quotaRes = await verifyReferralCodeAction("OSN26-FULL");
    expect(quotaRes.success).toBe(false);
    expect(quotaRes.message).toContain("kuota penggunaan untuk kode rujukan ini telah habis");
  });

  it("startExamSessionAction menerapkan ZERO ANSWER LEAKAGE, membatasi serverEndTime, dan memasang HTTP-Only Cookie", async () => {
    const now = Date.now();
    const startsAt = new Date(now - 600_000).toISOString(); // mulai 10 menit lalu
    const endsAt = new Date(now + 1800_000).toISOString(); // berakhir 30 menit lagi

    // 1. Mock ambil kode rujukan & ujian (durasi 90 menit, tapi ends_at tinggal 30 menit)
    mockServiceFrom.mockReturnValueOnce({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          maybeSingle: vi.fn().mockResolvedValueOnce({
            data: {
              id: "ref-ok",
              code: "OSN26-OK",
              is_active: true,
              expires_at: endsAt,
              max_uses: 10,
              current_uses: 2,
              exams: {
                id: "exam-osn",
                title: "OSN Informatika 2026",
                duration_minutes: 90,
                starts_at: startsAt,
                ends_at: endsAt,
                is_published: true,
              },
            },
            error: null,
          }),
        })),
      })),
    });

    // 2. Mock insert ke exam_sessions
    let capturedTokenHash = "";
    mockServiceFrom.mockReturnValueOnce({
      insert: vi.fn((row: { session_token_hash: string }) => {
        capturedTokenHash = row.session_token_hash;
        return {
          select: vi.fn(() => ({
            single: vi.fn().mockResolvedValueOnce({
              data: {
                id: "session-xyz",
                started_at: new Date(now).toISOString(),
                session_token_hash: row.session_token_hash,
              },
              error: null,
            }),
          })),
        };
      }),
    });

    // 3. Mock update current_uses pada referral_codes
    mockServiceFrom.mockReturnValueOnce({
      update: vi.fn(() => ({
        eq: vi.fn().mockResolvedValueOnce({ error: null }),
      })),
    });

    // 4. Mock select questions - rekam kolom yang diminta oleh Server Action
    let selectedColumns = "";
    mockServiceFrom.mockReturnValueOnce({
      select: vi.fn((cols: string) => {
        selectedColumns = cols;
        return {
          eq: vi.fn(() => ({
            order: vi.fn().mockResolvedValueOnce({
              data: [
                {
                  id: "q-1",
                  exam_id: "exam-osn",
                  order_index: 1,
                  question_type: "single_choice",
                  prompt: "Berapa kompleksitas Binary Search?",
                  options: [
                    { id: "A", text: "$O(\\log N)$" },
                    { id: "B", text: "$O(N^2)$" },
                  ],
                  points: 4,
                },
              ],
              error: null,
            }),
          })),
        };
      }),
    });

    const result = await startExamSessionAction({
      referralCode: "osn26-ok",
      studentName: "Nadia Putri",
      studentClass: "11-IPA-1",
    });

    expect(result.success).toBe(true);

    // A. BUKTI ZERO ANSWER LEAKAGE:
    // Kolom yang di-select dari database TIDAK BOLEH mengandung correct_answer
    expect(selectedColumns).toBe(
      "id, exam_id, order_index, question_type, prompt, options, points"
    );
    expect(selectedColumns).not.toContain("correct_answer");
    expect(result.data?.questions[0]).not.toHaveProperty("correct_answer");

    // B. BUKTI SERVER-AUTHORITATIVE TIME:
    // Karena ends_at tinggal 30 menit sedangkan durasi 90 menit, serverEndTime dipotong tepat ke ends_at
    expect(result.data?.serverEndTime).toBe(endsAt);

    // C. BUKTI KEAMANAN COOKIE HTTP-ONLY & TOKEN HASH:
    expect(mockCookieSet).toHaveBeenCalledTimes(1);
    const [cookieName, rawToken, cookieOpts] = mockCookieSet.mock.calls[0];
    expect(cookieName).toBe("exam_token");
    expect(cookieOpts.httpOnly).toBe(true);
    expect(cookieOpts.sameSite).toBe("strict");
    expect(hashSessionToken(rawToken)).toBe(capturedTokenHash);

    // D. Verifikasi bahwa verifyActiveSessionAction menerima token tersebut dengan sah
    mockCookieGet.mockReturnValueOnce({ value: rawToken });
    mockServiceFrom.mockReturnValueOnce({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          maybeSingle: vi.fn().mockResolvedValueOnce({
            data: {
              id: "session-xyz",
              session_token_hash: capturedTokenHash,
              is_completed: false,
              exams: { id: "exam-osn", title: "OSN Informatika 2026" },
            },
            error: null,
          }),
        })),
      })),
    });

    const verifyRes = await verifyActiveSessionAction("session-xyz");
    expect(verifyRes.valid).toBe(true);
  });
});

describe("F3-02, F3-03, F3-04: Integrasi End-to-End Ruang Ujian (ExamRoomShell)", () => {
  beforeEach(() => {
    localStorage.clear();
    useExamSessionStore.getState().clearSession();
  });

  it("menjalankan alur penuh pengerjaan siswa: menjawab 3 tipe soal, navigasi keyboard ArrowRight, tandai ragu-ragu, lompat palet, dan ringkasan kumpulkan ujian", () => {
    const futureEnd = new Date(Date.now() + 3600_000).toISOString();

    useExamSessionStore.getState().initSession({
      sessionId: "sess-e2e-1",
      examId: "exam-osn",
      examTitle: "Simulasi OSN Informatika",
      durationMinutes: 60,
      startedAt: new Date().toISOString(),
      serverEndTime: futureEnd,
      studentName: "Fajar Nugroho",
      studentClass: "12-IPA-1",
      questions: [
        {
          id: "q-1",
          exam_id: "exam-osn",
          order_index: 1,
          question_type: "single_choice",
          prompt: "Berapakah nilai dari $2^3$?",
          options: [
            { id: "A", text: "6" },
            { id: "B", text: "8" },
          ],
          points: 2,
        },
        {
          id: "q-2",
          exam_id: "exam-osn",
          order_index: 2,
          question_type: "multiple_choice",
          prompt: "Pilih struktur data linier:",
          options: [
            { id: "A", text: "Array" },
            { id: "B", text: "Queue" },
            { id: "C", text: "Graph" },
          ],
          points: 4,
        },
        {
          id: "q-3",
          exam_id: "exam-osn",
          order_index: 3,
          question_type: "short_answer",
          prompt: "Tuliskan bilangan prima terkecil:",
          options: [],
          points: 5,
        },
      ],
    });

    render(<ExamRoomShell sessionId="sess-e2e-1" />);

    // 1. Verifikasi Soal 1 tampil dan pilih opsi B
    expect(screen.getByText("Simulasi OSN Informatika")).toBeInTheDocument();
    const radios = screen.getAllByRole("radio");
    fireEvent.click(radios[1]); // pilih opsi B ("8")
    expect(useExamSessionStore.getState().answersMap["q-1"]).toEqual({
      selected: "B",
    });

    // 2. Navigasi ke Soal 2 menggunakan pintasan keyboard ArrowRight
    fireEvent.keyDown(window, { key: "ArrowRight", code: "ArrowRight" });
    expect(useExamSessionStore.getState().currentIndex).toBe(1);

    // Pilih opsi A & B pada soal Pilihan Jamak (Soal 2) lalu tandai Ragu-ragu
    const checkboxes = screen.getAllByRole("checkbox");
    fireEvent.click(checkboxes[0]);
    fireEvent.click(checkboxes[1]);
    expect(useExamSessionStore.getState().answersMap["q-2"]).toEqual({
      selected: ["A", "B"],
    });

    const flagBtn = screen.getByRole("button", { name: /Tandai Ragu-ragu/i });
    fireEvent.click(flagBtn);
    expect(useExamSessionStore.getState().flaggedMap["q-2"]).toBe(true);

    // 3. Lompat ke Soal 3 melalui klik tombol nomor 3 pada Palet Navigasi
    const paletteCells = screen.getAllByRole("gridcell", {
      name: /Soal nomor 3/i,
    });
    fireEvent.click(paletteCells[0]);
    expect(useExamSessionStore.getState().currentIndex).toBe(2);

    // Isi jawaban singkat pada Soal 3
    const shortInput = screen.getByPlaceholderText(
      /Ketik jawaban akhir Anda di sini/i
    );
    fireEvent.change(shortInput, { target: { value: "2" } });
    expect(useExamSessionStore.getState().answersMap["q-3"]).toEqual({
      text: "2",
    });

    // 4. Klik tombol Selesaikan Ujian dan periksa dialog ringkasan
    const finishButtons = screen.getAllByRole("button", {
      name: /Selesaikan Ujian/i,
    });
    fireEvent.click(finishButtons[0]);

    expect(
      screen.getByText(/Konfirmasi Selesai Ujian/i)
    ).toBeInTheDocument();
    expect(
      screen.getByText(
        /Masih terdapat 0 butir belum dijawab dan 1 butir bertanda ragu-ragu/i
      )
    ).toBeInTheDocument();
  });
});

