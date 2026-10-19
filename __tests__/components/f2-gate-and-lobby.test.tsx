import React from "react";
import { describe, it, expect, beforeEach, vi } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { ReferralGateCard } from "@/components/gate/referral-gate-card";
import { ExamLobbyCard } from "@/components/gate/exam-lobby-card";
import { useExamGateStore } from "@/lib/stores/exam-gate-store";
import { verifyReferralCodeAction } from "@/actions/gate";
import { startExamSessionAction } from "@/actions/exam-session";

// Mock next/navigation
const mockPush = vi.fn();
let mockRefQueryParam: string | null = null;

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: mockPush,
  }),
  useSearchParams: () => ({
    get: (key: string) => (key === "ref" ? mockRefQueryParam : null),
  }),
}));

// Mock Server Actions
vi.mock("@/actions/gate", () => ({
  verifyReferralCodeAction: vi.fn(),
}));

vi.mock("@/actions/exam-session", () => ({
  startExamSessionAction: vi.fn(),
}));

describe("F2-01: Komponen Gerbang Kode Rujukan (ReferralGateCard)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockRefQueryParam = null;
    useExamGateStore.getState().resetGate();
  });

  it("mengubah ketikan kode menjadi huruf kapital otomatis dan memanggil verifyReferralCodeAction", async () => {
    vi.mocked(verifyReferralCodeAction).mockResolvedValueOnce({
      success: false,
      message: "Kode rujukan tidak ditemukan. Silakan periksa kembali kode Anda.",
    });

    render(<ReferralGateCard />);

    const input = screen.getByLabelText(/Kode Rujukan Ujian/i);
    const submitBtn = screen.getByRole("button", { name: /Periksa Kode/i });

    expect(submitBtn).toBeDisabled();

    fireEvent.change(input, { target: { value: "osn26-x89" } });
    expect(input).toHaveValue("OSN26-X89");
    expect(submitBtn).not.toBeDisabled();

    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(verifyReferralCodeAction).toHaveBeenCalledWith("OSN26-X89");
      expect(
        screen.getByRole("alert")
      ).toHaveTextContent(
        "Kode rujukan tidak ditemukan. Silakan periksa kembali kode Anda."
      );
    });
  });

  it("mendeteksi parameter URL ?ref=KODE secara otomatis dan langsung memverifikasi kode", async () => {
    mockRefQueryParam = "mat2026-auto";

    vi.mocked(verifyReferralCodeAction).mockResolvedValueOnce({
      success: true,
      data: {
        referralCode: "MAT2026-AUTO",
        referralCodeId: "ref-auto-1",
        serverTime: "2026-10-20T08:00:00.000Z",
        exam: {
          id: "exam-1",
          title: "Ujian Matematika",
          description: null,
          duration_minutes: 60,
          starts_at: "2026-10-20T08:00:00.000Z",
          ends_at: "2026-10-20T09:00:00.000Z",
          class_options: ["10-A"],
        },
      },
    });

    render(<ReferralGateCard />);

    await waitFor(() => {
      expect(verifyReferralCodeAction).toHaveBeenCalledWith("MAT2026-AUTO");
      expect(useExamGateStore.getState().verifiedData?.referralCode).toBe(
        "MAT2026-AUTO"
      );
    });
  });
});

describe("F2-02: Komponen Lobi Pra-Ujian & Mesin Tombol 3-Tahap (ExamLobbyCard)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useExamGateStore.getState().resetGate();
  });

  it("menampilkan tombol NONAKTIF dengan hitung mundur ketika status ujian NOT_STARTED", () => {
    render(
      <ExamLobbyCard
        verifiedData={{
          referralCode: "OSN26-WAIT",
          referralCodeId: "ref-1",
          serverTime: "2026-10-20T07:50:00.000Z",
          exam: {
            id: "exam-1",
            title: "Simulasi OSN Fisika",
            description: "Bacalah petunjuk dengan saksama.",
            duration_minutes: 90,
            starts_at: "2026-10-20T08:00:00.000Z",
            ends_at: "2026-10-20T09:30:00.000Z",
            class_options: ["11-IPA-1", "11-IPA-2"],
          },
        }}
      />
    );

    expect(screen.getByText("Simulasi OSN Fisika")).toBeInTheDocument();
    const waitButton = screen.getByRole("button", {
      name: /Dimulai dalam:/i,
    });
    expect(waitButton).toBeDisabled();
  });

  it("mengaktifkan tombol 'Mulai Kerjakan Ujian' saat IN_PROGRESS hanya jika Nama (>= 3 huruf) dan Kelas terisi, lalu menginisialisasi sesi", async () => {
    vi.mocked(startExamSessionAction).mockResolvedValueOnce({
      success: true,
      data: {
        sessionId: "sess-active-99",
        examId: "exam-1",
        examTitle: "Simulasi OSN Fisika",
        durationMinutes: 90,
        startedAt: "2026-10-20T08:05:00.000Z",
        serverEndTime: "2026-10-20T09:30:00.000Z",
        studentName: "Budi Hartono",
        studentClass: "11-IPA-1",
        questions: [],
      },
    });

    render(
      <ExamLobbyCard
        verifiedData={{
          referralCode: "OSN26-LIVE",
          referralCodeId: "ref-2",
          serverTime: "2026-10-20T08:05:00.000Z",
          exam: {
            id: "exam-1",
            title: "Simulasi OSN Fisika",
            description: "Petunjuk pengerjaan.",
            duration_minutes: 90,
            starts_at: "2026-10-20T08:00:00.000Z",
            ends_at: "2026-10-20T09:30:00.000Z",
            class_options: ["11-IPA-1", "11-IPA-2"],
          },
        }}
      />
    );

    const startBtn = screen.getByRole("button", {
      name: /Mulai Kerjakan Ujian/i,
    });
    // Awalnya nonaktif karena nama & kelas belum diisi
    expect(startBtn).toBeDisabled();

    const nameInput = screen.getByLabelText(/Nama Lengkap Siswa/i);
    const classSelect = screen.getByLabelText(/Pilih Kelas Peserta/i);

    fireEvent.change(nameInput, { target: { value: "Budi Hartono" } });
    expect(startBtn).toBeDisabled(); // Kelas belum dipilih

    fireEvent.change(classSelect, { target: { value: "11-IPA-1" } });
    expect(startBtn).not.toBeDisabled(); // Sekarang aktif!

    fireEvent.click(startBtn);

    await waitFor(() => {
      expect(startExamSessionAction).toHaveBeenCalledWith({
        referralCode: "OSN26-LIVE",
        studentName: "Budi Hartono",
        studentClass: "11-IPA-1",
      });
      expect(mockPush).toHaveBeenCalledWith("/ujian/sess-active-99");
    });
  });

  it("menampilkan tombol NONAKTIF 'Sesi Ujian Telah Berakhir' ketika waktu server melewati ends_at", () => {
    render(
      <ExamLobbyCard
        verifiedData={{
          referralCode: "OSN26-END",
          referralCodeId: "ref-3",
          serverTime: "2026-10-20T10:00:00.000Z",
          exam: {
            id: "exam-1",
            title: "Simulasi OSN Fisika",
            description: null,
            duration_minutes: 90,
            starts_at: "2026-10-20T08:00:00.000Z",
            ends_at: "2026-10-20T09:30:00.000Z",
            class_options: ["11-IPA-1"],
          },
        }}
      />
    );

    const endedBtn = screen.getByRole("button", {
      name: /Sesi Ujian Telah Berakhir/i,
    });
    expect(endedBtn).toBeDisabled();
  });
});

