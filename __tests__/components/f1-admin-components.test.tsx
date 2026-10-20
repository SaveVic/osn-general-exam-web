import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { AdminLoginForm } from "@/components/admin/admin-login-form";
import { ClassOptionsInput } from "@/components/admin/class-options-input";
import { ExamList } from "@/components/admin/exam-list";
import AdminLoginPage, { metadata as adminLoginMetadata } from "@/app/admin/masuk/page";
import HomePage, { metadata as homeMetadata } from "@/app/page";
import AdminDashboardPage, { metadata as adminDashboardMetadata } from "@/app/admin/dasbor/page";
import type { AdminExamItem } from "@/actions/exams";

const mockRedirect = vi.fn();
vi.mock("next/navigation", () => ({
  redirect: (url: string) => mockRedirect(url),
  useRouter: () => ({ push: vi.fn() }),
  useSearchParams: () => ({ get: () => null }),
}));

// Mock Server Action loginAdmin & getAdminUser
const mockGetAdminUser = vi.fn();
vi.mock("@/actions/auth", () => ({
  loginAdmin: vi.fn(async () => ({
    success: false,
    error: "Nama pengguna atau kata sandi tidak valid.",
  })),
  logoutAdmin: vi.fn(async () => {}),
  getAdminUser: () => mockGetAdminUser(),
}));

// Mock Server Actions exams
const mockGetAdminExams = vi.fn();
vi.mock("@/actions/exams", () => ({
  getAdminExams: () => mockGetAdminExams(),
  togglePublishAction: vi.fn(),
  deleteExamAction: vi.fn(),
}));

describe("F1-01: Komponen Formulir Masuk Admin & Halaman Portal Admin", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetAdminUser.mockResolvedValue(null);
    mockGetAdminExams.mockResolvedValue([]);
  });

  it("merender input Nama Pengguna, Kata Sandi, pesan galat di atas input, tombol Masuk dengan cursor-pointer, dan tombol toggle visibilitas sandi", () => {
    render(<AdminLoginForm initialMessage="Silakan masuk untuk mengelola ujian." />);

    const alertBox = screen.getByRole("alert");
    expect(alertBox).toHaveTextContent("Silakan masuk untuk mengelola ujian.");
    expect(alertBox).toHaveClass("border-rose-200", "bg-rose-50");

    const usernameInput = screen.getByLabelText(/Nama Pengguna/i);
    const passwordInput = screen.getByLabelText(/^Kata Sandi$/i);
    const submitBtn = screen.getByRole("button", { name: /^Masuk$/i });

    expect(usernameInput).toBeInTheDocument();
    expect(passwordInput).toHaveAttribute("type", "password");
    expect(submitBtn).toBeInTheDocument();
    expect(submitBtn).toHaveClass("cursor-pointer", "disabled:cursor-not-allowed");
    expect(
      screen.queryByRole("button", { name: /Tempel/i })
    ).not.toBeInTheDocument();

    // Pastikan pesan galat berada di atas input username
    expect(
      alertBox.compareDocumentPosition(usernameInput) &
        Node.DOCUMENT_POSITION_FOLLOWING
    ).toBeTruthy();

    // Uji toggle tampilkan/sembunyikan kata sandi
    const toggleBtn = screen.getByRole("button", {
      name: /Tampilkan kata sandi/i,
    });
    fireEvent.click(toggleBtn);
    expect(passwordInput).toHaveAttribute("type", "text");

    fireEvent.click(
      screen.getByRole("button", { name: /Sembunyikan kata sandi/i })
    );
    expect(passwordInput).toHaveAttribute("type", "password");
  });

  it("merender judul 'Portal Admin' tanpa deskripsi tambahan pada /admin/masuk", async () => {
    const jsx = await AdminLoginPage({
      searchParams: Promise.resolve({}),
    });
    render(jsx);

    expect(
      screen.getByRole("heading", { level: 1, name: "Portal Admin" })
    ).toBeInTheDocument();
    expect(
      screen.queryByText(/Kawasan terbatas untuk penyusunan/i)
    ).not.toBeInTheDocument();
    expect(
      screen.queryByText(/Silakan masukkan kredensial pengelola/i)
    ).not.toBeInTheDocument();
  });

  it("memverifikasi metadata title pada halaman '/', '/admin/masuk', dan '/admin/dasbor'", () => {
    expect(homeMetadata?.title).toBe("Portal Ujian");
    expect(adminLoginMetadata?.title).toBe("Portal Admin");
    expect(adminDashboardMetadata?.title).toBe("Dashboard");
  });

  it("merender judul 'Dashboard' pada halaman /admin/dasbor", async () => {
    mockGetAdminUser.mockResolvedValue({
      id: "admin-1",
      email: "admin@exam.local",
    });
    mockGetAdminExams.mockResolvedValue([]);

    const jsx = await AdminDashboardPage();
    render(jsx);

    expect(
      screen.getByRole("heading", { level: 1, name: "Dashboard" })
    ).toBeInTheDocument();
  });

  it("mengalihkan (redirect) ke /admin/dasbor ketika admin yang sudah masuk mengakses '/' atau '/admin/masuk'", async () => {
    mockGetAdminUser.mockResolvedValue({
      id: "admin-1",
      email: "admin@exam.local",
    });

    await HomePage();
    expect(mockRedirect).toHaveBeenCalledWith("/admin/dasbor");

    mockRedirect.mockClear();

    await AdminLoginPage({
      searchParams: Promise.resolve({}),
    });
    expect(mockRedirect).toHaveBeenCalledWith("/admin/dasbor");
  });
});

describe("F1-02: Komponen Dasbor & Input Opsi Kelas Dinamis", () => {
  it("merender tab kelompok paket soal pada ExamList dengan cursor-pointer saat hover", () => {
    const mockExams: AdminExamItem[] = [
      {
        id: "exam-1",
        title: "Ujian Matematika",
        description: "Deskripsi",
        duration_minutes: 90,
        starts_at: "2026-10-20T08:00:00Z",
        ends_at: "2026-10-20T12:00:00Z",
        class_options: ["10-A"],
        is_published: true,
        created_at: "2026-10-18T00:00:00Z",
        updated_at: "2026-10-18T00:00:00Z",
        question_count: 5,
        session_count: 2,
      },
    ];

    render(<ExamList exams={mockExams} />);

    const allTab = screen.getByRole("button", { name: /^Semua/i });
    const publishedTab = screen.getByRole("button", { name: /^Dipublikasikan/i });
    const draftTab = screen.getByRole("button", { name: /^Draf \(/i });

    expect(allTab).toHaveClass("cursor-pointer");
    expect(publishedTab).toHaveClass("cursor-pointer");
    expect(draftTab).toHaveClass("cursor-pointer");
  });

  it("menambahkan opsi kelas baru via tombol Tambah maupun Enter, mencegah duplikat, dan memperbarui hidden input JSON", () => {
    const { container } = render(
      <ClassOptionsInput initialClasses={["10-A"]} name="class_options" />
    );

    const hiddenInput = container.querySelector(
      'input[type="hidden"][name="class_options"]'
    ) as HTMLInputElement;
    expect(hiddenInput.value).toBe(JSON.stringify(["10-A"]));

    const textInput = screen.getByPlaceholderText(/Contoh: 10-IPA-1/i);
    const addButton = screen.getByRole("button", { name: /Tambah/i });

    // Tambah kelas baru via klik tombol
    fireEvent.change(textInput, { target: { value: "11-IPA-1" } });
    fireEvent.click(addButton);

    expect(screen.getByText("11-IPA-1")).toBeInTheDocument();
    expect(hiddenInput.value).toBe(JSON.stringify(["10-A", "11-IPA-1"]));

    // Tambah kelas via tombol Enter
    fireEvent.change(textInput, { target: { value: "12-MIPA-2" } });
    fireEvent.keyDown(textInput, { key: "Enter", code: "Enter" });
    expect(hiddenInput.value).toBe(
      JSON.stringify(["10-A", "11-IPA-1", "12-MIPA-2"])
    );

    // Cegah duplikasi kelas (case-insensitive)
    fireEvent.change(textInput, { target: { value: "10-a" } });
    fireEvent.click(addButton);
    expect(
      screen.getByText(/sudah ada di dalam daftar/i)
    ).toBeInTheDocument();

    // Hapus kelas 10-A
    const removeBtn = screen.getByRole("button", { name: /Hapus kelas 10-A/i });
    fireEvent.click(removeBtn);
    expect(hiddenInput.value).toBe(JSON.stringify(["11-IPA-1", "12-MIPA-2"]));
  });
});
