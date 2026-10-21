import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import {
  getActiveSessionFromCookieAction,
  startExamSessionAction,
  type ActiveSessionResumeData,
} from "@/actions/exam-session";
import { verifyReferralCodeAction } from "@/actions/gate";
import { GateContainer } from "@/components/gate/gate-container";
import { ActiveSessionResumeCard } from "@/components/gate/active-session-resume-card";

// Mock next/navigation
const mockPush = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: mockPush,
  }),
  useSearchParams: () => ({
    get: () => null,
  }),
}));

// Mock next/headers
const mockCookieGet = vi.fn();
const mockCookieSet = vi.fn();
vi.mock("next/headers", () => ({
  cookies: vi.fn(async () => ({
    get: mockCookieGet,
    set: mockCookieSet,
  })),
}));

// Mock Supabase service client
const mockServiceFrom = vi.fn();
vi.mock("@/lib/supabase/admin", () => ({
  createServiceClient: vi.fn(() => ({
    from: mockServiceFrom,
  })),
}));

describe("Fitur Pemulihan Sesi Browser (Browser Session Resumption)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockCookieGet.mockReset();
    mockCookieSet.mockReset();
    mockServiceFrom.mockReset();
  });

  describe("Server Action: getActiveSessionFromCookieAction", () => {
    it("mengembalikan null jika cookie exam_token tidak ditemukan", async () => {
      mockCookieGet.mockReturnValue(undefined);

      const res = await getActiveSessionFromCookieAction();
      expect(res).toBeNull();
    });

    it("mengembalikan null jika sesi sudah diselesaikan (is_completed = true)", async () => {
      mockCookieGet.mockReturnValue({ value: "test-token-123" });

      mockServiceFrom.mockImplementation((table: string) => {
        if (table === "exam_sessions") {
          return {
            select: vi.fn(() => ({
              eq: vi.fn(() => ({
                eq: vi.fn(() => ({
                  maybeSingle: vi.fn(async () => ({
                    data: null, // query filter is_completed = false
                    error: null,
                  })),
                })),
              })),
            })),
          };
        }
        return {};
      });

      const res = await getActiveSessionFromCookieAction();
      expect(res).toBeNull();
    });

    it("mengembalikan null jika alokasi durasi waktu ujian telah habis", async () => {
      mockCookieGet.mockReturnValue({ value: "expired-token" });

      const pastStartedAt = new Date(Date.now() - 120 * 60 * 1000).toISOString(); // 2 jam lalu
      const examEndsAt = new Date(Date.now() + 60 * 60 * 1000).toISOString();

      mockServiceFrom.mockImplementation((table: string) => {
        if (table === "exam_sessions") {
          return {
            select: vi.fn(() => ({
              eq: vi.fn(() => ({
                eq: vi.fn(() => ({
                  maybeSingle: vi.fn(async () => ({
                    data: {
                      id: "sess-expired",
                      exam_id: "exam-1",
                      student_name: "Budi Santoso",
                      student_class: "12-IPA-1",
                      started_at: pastStartedAt,
                      is_completed: false,
                      exams: {
                        id: "exam-1",
                        title: "Simulasi OSN Fisika",
                        duration_minutes: 60, // hanya 60 menit durasi
                        ends_at: examEndsAt,
                        is_published: true,
                      },
                    },
                    error: null,
                  })),
                })),
              })),
            })),
          };
        }
        return {};
      });

      const res = await getActiveSessionFromCookieAction();
      expect(res).toBeNull();
    });

    it("mengembalikan data sesi aktif jika token valid, sesi belum selesai, dan waktu masih berjalan", async () => {
      mockCookieGet.mockReturnValue({ value: "valid-live-token" });

      const recentStartedAt = new Date(Date.now() - 15 * 60 * 1000).toISOString(); // 15 menit lalu
      const examEndsAt = new Date(Date.now() + 120 * 60 * 1000).toISOString();

      mockServiceFrom.mockImplementation((table: string) => {
        if (table === "exam_sessions") {
          return {
            select: vi.fn(() => ({
              eq: vi.fn(() => ({
                eq: vi.fn(() => ({
                  maybeSingle: vi.fn(async () => ({
                    data: {
                      id: "sess-live-99",
                      exam_id: "exam-live",
                      student_name: "Siti Rahma",
                      student_class: "11-IPA-2",
                      started_at: recentStartedAt,
                      is_completed: false,
                      exams: {
                        id: "exam-live",
                        title: "Olimpiade Komputer Nasional",
                        duration_minutes: 90,
                        ends_at: examEndsAt,
                        is_published: true,
                      },
                    },
                    error: null,
                  })),
                })),
              })),
            })),
          };
        }
        return {};
      });

      const res = await getActiveSessionFromCookieAction();
      expect(res).not.toBeNull();
      expect(res?.sessionId).toBe("sess-live-99");
      expect(res?.studentName).toBe("Siti Rahma");
      expect(res?.examTitle).toBe("Olimpiade Komputer Nasional");
      expect(res?.durationMinutes).toBe(90);
    });
  });

  describe("Server Action: verifyReferralCodeAction dengan Sesi Aktif", () => {
    it("mengecualikan kuota max_uses dan mengembalikan resumableSessionId saat pemanggil memiliki sesi aktif", async () => {
      const activeToken = "my-active-token";
      mockCookieGet.mockReturnValue({ value: activeToken });

      const now = new Date();
      const examEndsAt = new Date(now.getTime() + 60 * 60 * 1000).toISOString();
      const startedAt = new Date(now.getTime() - 10 * 60 * 1000).toISOString();

      mockServiceFrom.mockImplementation((table: string) => {
        if (table === "referral_codes") {
          return {
            select: vi.fn(() => ({
              eq: vi.fn(() => ({
                maybeSingle: vi.fn(async () => ({
                  data: {
                    id: "ref-1",
                    code: "OSN26-LIMIT",
                    is_active: true,
                    expires_at: examEndsAt,
                    current_uses: 1, // kuota sudah terpakai
                    max_uses: 1, // batas maksimal 1
                    exam_id: "exam-100",
                    exams: {
                      id: "exam-100",
                      title: "Ujian Terbatas",
                      description: "Deskripsi",
                      duration_minutes: 90,
                      starts_at: new Date(now.getTime() - 30 * 60 * 1000).toISOString(),
                      ends_at: examEndsAt,
                      is_published: true,
                      class_options: ["10-A"],
                    },
                  },
                  error: null,
                })),
              })),
            })),
          };
        }
        if (table === "exam_sessions") {
          return {
            select: vi.fn(() => ({
              eq: vi.fn(() => ({
                eq: vi.fn(() => ({
                  eq: vi.fn(() => ({
                    maybeSingle: vi.fn(async () => ({
                      data: {
                        id: "sess-resumable-888",
                        is_completed: false,
                        exam_id: "exam-100",
                        started_at: startedAt,
                      },
                      error: null,
                    })),
                  })),
                })),
              })),
            })),
          };
        }
        return {};
      });

      const res = await verifyReferralCodeAction("OSN26-LIMIT");
      expect(res.success).toBe(true);
      expect(res.data?.resumableSessionId).toBe("sess-resumable-888");
    });

    it("menolak kode jika kuota habis dan peserta TIDAK memiliki cookie sesi aktif", async () => {
      mockCookieGet.mockReturnValue(undefined); // Tanpa cookie

      const now = new Date();
      const examEndsAt = new Date(now.getTime() + 60 * 60 * 1000).toISOString();

      mockServiceFrom.mockImplementation((table: string) => {
        if (table === "referral_codes") {
          return {
            select: vi.fn(() => ({
              eq: vi.fn(() => ({
                maybeSingle: vi.fn(async () => ({
                  data: {
                    id: "ref-1",
                    code: "OSN26-LIMIT",
                    is_active: true,
                    expires_at: examEndsAt,
                    current_uses: 1,
                    max_uses: 1,
                    exam_id: "exam-100",
                    exams: {
                      id: "exam-100",
                      title: "Ujian Terbatas",
                      duration_minutes: 90,
                      starts_at: new Date(now.getTime() - 30 * 60 * 1000).toISOString(),
                      ends_at: examEndsAt,
                      is_published: true,
                      class_options: ["10-A"],
                    },
                  },
                  error: null,
                })),
              })),
            })),
          };
        }
        return {};
      });

      const res = await verifyReferralCodeAction("OSN26-LIMIT");
      expect(res.success).toBe(false);
      expect(res.message).toMatch(/Batas kuota penggunaan untuk kode rujukan ini telah habis/i);
    });
  });

  describe("Server Action: startExamSessionAction Idempotency", () => {
    it("mengembalikan sesi yang sudah ada jika pemanggil telah memiliki sesi aktif untuk ujian terkait", async () => {
      mockCookieGet.mockReturnValue({ value: "existing-cookie-token" });

      const now = new Date();
      const examEndsAt = new Date(now.getTime() + 60 * 60 * 1000).toISOString();
      const startedAt = new Date(now.getTime() - 10 * 60 * 1000).toISOString();

      let insertCalled = false;
      let currentUsesUpdated = false;

      mockServiceFrom.mockImplementation((table: string) => {
        if (table === "referral_codes") {
          return {
            select: vi.fn(() => ({
              eq: vi.fn(() => ({
                maybeSingle: vi.fn(async () => ({
                  data: {
                    id: "ref-1",
                    code: "OSN26-VALID",
                    is_active: true,
                    expires_at: examEndsAt,
                    current_uses: 1,
                    max_uses: 5,
                    exam_id: "exam-dup",
                    exams: {
                      id: "exam-dup",
                      title: "Ujian Matematika",
                      duration_minutes: 90,
                      starts_at: new Date(now.getTime() - 30 * 60 * 1000).toISOString(),
                      ends_at: examEndsAt,
                      is_published: true,
                    },
                  },
                  error: null,
                })),
              })),
            })),
            update: vi.fn(() => {
              currentUsesUpdated = true;
              return { eq: vi.fn(async () => ({ error: null })) };
            }),
          };
        }
        if (table === "exam_sessions") {
          return {
            select: vi.fn(() => ({
              eq: vi.fn(() => ({
                eq: vi.fn(() => ({
                  eq: vi.fn(() => ({
                    maybeSingle: vi.fn(async () => ({
                      data: {
                        id: "sess-existing-id",
                        exam_id: "exam-dup",
                        student_name: "Ahmad Dahlan",
                        student_class: "12-IPA-3",
                        started_at: startedAt,
                        is_completed: false,
                      },
                      error: null,
                    })),
                  })),
                })),
              })),
            })),
            insert: vi.fn(() => {
              insertCalled = true;
              return { select: vi.fn(() => ({ single: vi.fn() })) };
            }),
          };
        }
        if (table === "questions") {
          return {
            select: vi.fn(() => ({
              eq: vi.fn(() => ({
                order: vi.fn(async () => ({
                  data: [{ id: "q-1", exam_id: "exam-dup", order_index: 1, question_type: "single_choice", prompt: "1+1=?", options: [], points: 10 }],
                  error: null,
                })),
              })),
            })),
          };
        }
        return {};
      });

      const res = await startExamSessionAction({
        referralCode: "OSN26-VALID",
        studentName: "Ahmad Dahlan",
        studentClass: "12-IPA-3",
      });

      expect(res.success).toBe(true);
      expect(res.data?.sessionId).toBe("sess-existing-id");
      expect(insertCalled).toBe(false); // Tidak ada penambahan sesi baru
      expect(currentUsesUpdated).toBe(false); // Kuota tidak ditambah lagi
    });

    it("membuat sesi baru jika cookie tidak ada, walaupun identitas nama dan kelas sama (konsekuensi cookie hilang)", async () => {
      mockCookieGet.mockReturnValue(undefined); // Cookie hilang!

      const now = new Date();
      const examEndsAt = new Date(now.getTime() + 60 * 60 * 1000).toISOString();

      let insertPayload: unknown = null;
      let currentUsesUpdated = false;

      mockServiceFrom.mockImplementation((table: string) => {
        if (table === "referral_codes") {
          return {
            select: vi.fn(() => ({
              eq: vi.fn(() => ({
                maybeSingle: vi.fn(async () => ({
                  data: {
                    id: "ref-1",
                    code: "OSN26-VALID",
                    is_active: true,
                    expires_at: examEndsAt,
                    current_uses: 1,
                    max_uses: 10,
                    exam_id: "exam-dup",
                    exams: {
                      id: "exam-dup",
                      title: "Ujian Matematika",
                      duration_minutes: 90,
                      starts_at: new Date(now.getTime() - 30 * 60 * 1000).toISOString(),
                      ends_at: examEndsAt,
                      is_published: true,
                    },
                  },
                  error: null,
                })),
              })),
            })),
            update: vi.fn(() => {
              currentUsesUpdated = true;
              return { eq: vi.fn(async () => ({ error: null })) };
            }),
          };
        }
        if (table === "exam_sessions") {
          return {
            insert: vi.fn((payload) => {
              insertPayload = payload;
              return {
                select: vi.fn(() => ({
                  single: vi.fn(async () => ({
                    data: {
                      id: "sess-brand-new",
                      exam_id: "exam-dup",
                      student_name: "Ahmad Dahlan",
                      student_class: "12-IPA-3",
                      started_at: now.toISOString(),
                      is_completed: false,
                    },
                    error: null,
                  })),
                })),
              };
            }),
          };
        }
        if (table === "questions") {
          return {
            select: vi.fn(() => ({
              eq: vi.fn(() => ({
                order: vi.fn(async () => ({
                  data: [],
                  error: null,
                })),
              })),
            })),
          };
        }
        return {};
      });

      const res = await startExamSessionAction({
        referralCode: "OSN26-VALID",
        studentName: "Ahmad Dahlan",
        studentClass: "12-IPA-3",
      });

      expect(res.success).toBe(true);
      expect(res.data?.sessionId).toBe("sess-brand-new");
      expect(insertPayload).not.toBeNull(); // Benar-benar membuat baris sesi baru
      expect(currentUsesUpdated).toBe(true); // Kuota penggunaan bertambah
    });
  });

  describe("UI Components: GateContainer & ActiveSessionResumeCard", () => {
    const mockActiveSession: ActiveSessionResumeData = {
      sessionId: "sess-ui-123",
      examId: "exam-ui",
      examTitle: "Simulasi OSN Informatika 2026",
      studentName: "Rizky Ramadhan",
      studentClass: "12-IPA-4",
      startedAt: new Date().toISOString(),
      serverEndTime: new Date(Date.now() + 45 * 60 * 1000).toISOString(),
      durationMinutes: 90,
    };

    it("merender kartu ActiveSessionResumeCard saat activeSession disediakan di GateContainer", () => {
      render(<GateContainer activeSession={mockActiveSession} />);

      expect(
        screen.getByRole("heading", { level: 1, name: /Sesi Ujian Aktif Ditemukan/i })
      ).toBeInTheDocument();
      expect(screen.getByText("Simulasi OSN Informatika 2026")).toBeInTheDocument();
      expect(screen.getByText("Rizky Ramadhan")).toBeInTheDocument();
      expect(screen.getByText("12-IPA-4")).toBeInTheDocument();
      expect(
        screen.getByRole("button", { name: /Lanjutkan Pengerjaan Ujian/i })
      ).toBeInTheDocument();
    });

    it("mengarahkan peramban ke /ujian/[sessionId] saat tombol Lanjutkan Pengerjaan Ujian diklik", () => {
      render(
        <ActiveSessionResumeCard
          session={mockActiveSession}
          onSwitchToCodeInput={vi.fn()}
        />
      );

      const resumeBtn = screen.getByRole("button", { name: /Lanjutkan Pengerjaan Ujian/i });
      fireEvent.click(resumeBtn);

      expect(mockPush).toHaveBeenCalledWith("/ujian/sess-ui-123");
    });

    it("beralih ke input kode ReferralGateCard saat tombol Gunakan Kode Rujukan Lain diklik", () => {
      render(<GateContainer activeSession={mockActiveSession} />);

      const switchBtn = screen.getByRole("button", { name: /Gunakan Kode Rujukan Lain/i });
      fireEvent.click(switchBtn);

      // Kartu aktif hilang dan muncul judul Portal Ujian dengan input kode
      expect(
        screen.getByRole("heading", { level: 1, name: "Portal Ujian" })
      ).toBeInTheDocument();
      expect(screen.getByLabelText(/Kode Rujukan Ujian/i)).toBeInTheDocument();
    });
  });
});

