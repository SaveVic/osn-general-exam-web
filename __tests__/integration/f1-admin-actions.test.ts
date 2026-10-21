import { describe, it, expect, vi, beforeEach } from "vitest";
import { loginAdmin, logoutAdmin } from "@/actions/auth";
import { createExamAction, togglePublishAction } from "@/actions/exams";
import { createQuestionAction, deleteQuestionAction } from "@/actions/questions";
import { uploadExamAssetAction } from "@/actions/storage";
import { createReferralCodeAction } from "@/actions/referral-codes";

// Mock next/navigation & next/cache
const mockRedirect = vi.fn();
const mockRevalidatePath = vi.fn();

vi.mock("next/navigation", () => ({
  redirect: (...args: unknown[]) => mockRedirect(...args),
}));

vi.mock("next/cache", () => ({
  revalidatePath: (...args: unknown[]) => mockRevalidatePath(...args),
}));

// Mock Supabase Server Client
const mockSignInWithPassword = vi.fn();
const mockSignOut = vi.fn();
const mockGetUser = vi.fn();
const mockFrom = vi.fn();
const mockStorageFrom = vi.fn();

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(async () => ({
    auth: {
      signInWithPassword: mockSignInWithPassword,
      signOut: mockSignOut,
      getUser: mockGetUser,
    },
    from: mockFrom,
    storage: {
      from: mockStorageFrom,
    },
  })),
}));

describe("F1-01: Integrasi Server Action Autentikasi Admin (actions/auth.ts)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("memetakan username 'admin' menjadi 'admin@exam.local' dan mengalihkan ke /admin/dasbor saat sukses", async () => {
    mockSignInWithPassword.mockResolvedValueOnce({ error: null });

    const formData = new FormData();
    formData.set("username", "admin");
    formData.set("password", "rahasia123");

    await loginAdmin(null, formData);

    expect(mockSignInWithPassword).toHaveBeenCalledWith({
      email: "admin@exam.local",
      password: "rahasia123",
    });
    expect(mockRedirect).toHaveBeenCalledWith("/admin/dasbor");
  });

  it("mengembalikan pesan Bahasa Indonesia saat kredensial salah atau terkena rate limit", async () => {
    mockSignInWithPassword.mockResolvedValueOnce({
      error: { message: "Invalid login credentials" },
    });

    const formData = new FormData();
    formData.set("username", "admin");
    formData.set("password", "salah");

    const res1 = await loginAdmin(null, formData);
    expect(res1.success).toBe(false);
    expect(res1.error).toBe("Nama pengguna atau kata sandi tidak valid.");

    mockSignInWithPassword.mockResolvedValueOnce({
      error: { message: "Request rate limit reached" },
    });
    const res2 = await loginAdmin(null, formData);
    expect(res2.error).toContain("Terlalu banyak percobaan masuk yang gagal");
  });

  it("logoutAdmin() memanggil signOut dan mengalihkan ke /admin/masuk", async () => {
    mockSignOut.mockResolvedValueOnce({});
    await logoutAdmin();
    expect(mockSignOut).toHaveBeenCalledTimes(1);
    expect(mockRedirect).toHaveBeenCalledWith("/admin/masuk");
  });
});

describe("F1-02 & F1-03: Integrasi Manajemen Ujian & Bank Soal (actions/exams.ts & questions.ts)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("createExamAction memvalidasi FormData, menyimpan ke tabel exams, dan melakukan redirect", async () => {
    const mockInsert = vi.fn().mockResolvedValueOnce({ error: null });
    mockFrom.mockReturnValueOnce({
      insert: mockInsert,
    });

    const formData = new FormData();
    formData.set("title", "Ujian Simulasi OSN 2026");
    formData.set("description", "Deskripsi ujian");
    formData.set("duration_minutes", "90");
    formData.set("starts_at", "2026-10-20T08:00:00.000Z");
    formData.set("ends_at", "2026-10-20T10:00:00.000Z");
    formData.set("class_options", JSON.stringify(["10-A", "11-A"]));
    formData.set("is_published", "true");

    await createExamAction(null, formData);

    expect(mockFrom).toHaveBeenCalledWith("exams");
    expect(mockInsert).toHaveBeenCalledWith(
      expect.objectContaining({
        title: "Ujian Simulasi OSN 2026",
        duration_minutes: 90,
        class_options: ["10-A", "11-A"],
        is_published: true,
      })
    );
    expect(mockRedirect).toHaveBeenCalledWith("/admin/dasbor");
  });

  it("togglePublishAction memperbarui status publikasi naskah ujian", async () => {
    const mockEq = vi.fn().mockResolvedValueOnce({ error: null });
    const mockUpdate = vi.fn(() => ({ eq: mockEq }));
    mockFrom.mockReturnValueOnce({
      update: mockUpdate,
    });

    await togglePublishAction("exam-123", false);
    expect(mockUpdate).toHaveBeenCalledWith({ is_published: true });
    expect(mockEq).toHaveBeenCalledWith("id", "exam-123");
    expect(mockRevalidatePath).toHaveBeenCalledWith("/admin/dasbor");
  });

  it("createQuestionAction menghitung order_index berikutnya otomatis dan menyimpan butir soal", async () => {
    // 1. Mock query max order_index (= 3 -> berikutnya 4)
    mockFrom.mockReturnValueOnce({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          order: vi.fn(() => ({
            limit: vi.fn().mockResolvedValueOnce({
              data: [{ order_index: 3 }],
            }),
          })),
        })),
      })),
    });

    // 2. Mock insert question
    const mockSingle = vi.fn().mockResolvedValueOnce({
      data: { id: "q-4", order_index: 4 },
      error: null,
    });
    const mockInsert = vi.fn(() => ({
      select: vi.fn(() => ({ single: mockSingle })),
    }));
    mockFrom.mockReturnValueOnce({
      insert: mockInsert,
    });

    const res = await createQuestionAction("exam-1", {
      question_type: "short_answer",
      prompt: "Berapa hasil $10 + 20$?",
      points: 5,
      options: [],
      correct_answer: { text: "30", numeric_tolerance: 0, case_sensitive: false },
    });

    expect(res.success).toBe(true);
    expect(mockInsert).toHaveBeenCalledWith(
      expect.objectContaining({
        exam_id: "exam-1",
        order_index: 4,
        question_type: "short_answer",
      })
    );
  });

  it("deleteQuestionAction menghapus soal dan menormalisasi ulang order_index 1..N", async () => {
    // 1. Mock delete().eq("id", questionId).eq("exam_id", examId)
    mockFrom.mockReturnValueOnce({
      delete: vi.fn(() => ({
        eq: vi.fn(() => ({
          eq: vi.fn().mockResolvedValueOnce({ error: null }),
        })),
      })),
    });

    // 2. Mock ambil sisa soal
    mockFrom.mockReturnValueOnce({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          order: vi.fn().mockResolvedValueOnce({
            data: [
              { id: "q-a", order_index: 1 },
              { id: "q-c", order_index: 3 }, // melompat karena q-b dihapus
            ],
          }),
        })),
      })),
    });

    // 3. Mock update normalisasi untuk q-c menjadi order_index = 2
    const mockUpdateEq = vi.fn().mockResolvedValueOnce({ error: null });
    const mockUpdate = vi.fn(() => ({ eq: mockUpdateEq }));
    mockFrom.mockReturnValueOnce({
      update: mockUpdate,
    });

    const res = await deleteQuestionAction("q-b", "exam-1");
    expect(res.success).toBe(true);
    expect(mockUpdate).toHaveBeenCalledWith({ order_index: 2 });
    expect(mockUpdateEq).toHaveBeenCalledWith("id", "q-c");
  });
});

describe("F1-04 & F1-05: Integrasi Unggah Diagram Storage & Kode Rujukan (actions/storage.ts & referral-codes.ts)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetUser.mockResolvedValue({ data: { user: { id: "admin-1" } } });
  });

  it("uploadExamAssetAction menolak tipe MIME tidak didukung dan ukuran berkas > 2 MB", async () => {
    // Uji tipe MIME ilegal (application/pdf)
    const pdfFile = new File(["isi pdf"], "dokumen.pdf", {
      type: "application/pdf",
    });
    const fd1 = new FormData();
    fd1.set("file", pdfFile);

    const resMime = await uploadExamAssetAction("exam-1", fd1);
    expect(resMime.success).toBe(false);
    expect(resMime.message).toContain("Format berkas tidak didukung");

    // Uji penolakan berkas SVG (keamanan XML / XSS)
    const svgFile = new File(["<svg></svg>"], "vektor.svg", {
      type: "image/svg+xml",
    });
    const fdSvg = new FormData();
    fdSvg.set("file", svgFile);

    const resSvg = await uploadExamAssetAction("exam-1", fdSvg);
    expect(resSvg.success).toBe(false);
    expect(resSvg.message).toContain("Format berkas tidak didukung");

    // Uji ukuran > 2 MB (2.5 MB)
    const bigBuffer = new Uint8Array(Math.floor(2.5 * 1024 * 1024));
    const bigFile = new File([bigBuffer], "diagram-besar.png", {
      type: "image/png",
    });
    const fd2 = new FormData();
    fd2.set("file", bigFile);

    const resSize = await uploadExamAssetAction("exam-1", fd2);
    expect(resSize.success).toBe(false);
    expect(resSize.message).toContain("melebihi batas maksimal 2 MB");
  });

  it("uploadExamAssetAction mengunggah gambar valid, menyanitasi nama berkas, dan mengembalikan URL publik", async () => {
    const mockUpload = vi.fn().mockResolvedValueOnce({ error: null });
    const mockGetPublicUrl = vi.fn().mockReturnValueOnce({
      data: {
        publicUrl:
          "https://project.supabase.co/storage/v1/object/public/exam-assets/exams/exam-1/grafik.webp",
      },
    });

    mockStorageFrom.mockReturnValue({
      upload: mockUpload,
      getPublicUrl: mockGetPublicUrl,
    });

    const validFile = new File(["binary-image"], "Grafik Fungsi Kuadrat!.webp", {
      type: "image/webp",
    });
    const fd = new FormData();
    fd.set("file", validFile);
    fd.set("alt_text", "Grafik Parabola");

    const res = await uploadExamAssetAction("exam-1", fd);
    expect(res.success).toBe(true);
    expect(res.altText).toBe("Grafik Parabola");
    expect(res.url).toContain("exam-assets/exams/exam-1/grafik.webp");
    expect(res.path).toMatch(/^exams\/exam-1\/\d+_grafik-fungsi-kuadrat-\.webp$/);
  });

  it("createReferralCodeAction menolak kode duplikat dan menyimpan kode unik baru", async () => {
    // Skenario 1: Kode sudah dipakai
    mockFrom.mockReturnValueOnce({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          maybeSingle: vi.fn().mockResolvedValueOnce({
            data: { id: "existing-ref" },
          }),
        })),
      })),
    });

    const dupRes = await createReferralCodeAction("exam-1", {
      code: "OSN26-DUP",
      is_unlimited: true,
      max_uses: null,
      expiration_type: "never",
      is_active: true,
    });
    expect(dupRes.success).toBe(false);
    expect(dupRes.message).toContain("sudah ada dalam sistem");

    // Skenario 2: Kode unik baru
    mockFrom.mockReturnValueOnce({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          maybeSingle: vi.fn().mockResolvedValueOnce({ data: null }),
        })),
      })),
    });

    mockFrom.mockReturnValueOnce({
      insert: vi.fn(() => ({
        select: vi.fn(() => ({
          single: vi.fn().mockResolvedValueOnce({
            data: { id: "new-ref-1", code: "OSN26-UNIK" },
            error: null,
          }),
        })),
      })),
    });

    const okRes = await createReferralCodeAction("exam-1", {
      code: "OSN26-UNIK",
      is_unlimited: false,
      max_uses: 30,
      expiration_type: "never",
      is_active: true,
    });
    expect(okRes.success).toBe(true);
    expect(okRes.data?.code).toBe("OSN26-UNIK");
  });
});

