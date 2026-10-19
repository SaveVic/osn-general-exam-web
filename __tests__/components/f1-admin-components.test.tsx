import React from "react";
import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { AdminLoginForm } from "@/components/admin/admin-login-form";
import { ClassOptionsInput } from "@/components/admin/class-options-input";

// Mock Server Action loginAdmin
vi.mock("@/actions/auth", () => ({
  loginAdmin: vi.fn(async () => ({
    success: false,
    error: "Nama pengguna atau kata sandi tidak valid.",
  })),
}));

describe("F1-01: Komponen Formulir Masuk Admin (AdminLoginForm)", () => {
  it("merender input Nama Pengguna, Kata Sandi, pesan awal, dan tombol toggle visibilitas sandi", () => {
    render(<AdminLoginForm initialMessage="Silakan masuk untuk mengelola ujian." />);

    expect(
      screen.getByText("Silakan masuk untuk mengelola ujian.")
    ).toBeInTheDocument();

    const usernameInput = screen.getByLabelText(/Nama Pengguna/i);
    const passwordInput = screen.getByLabelText(/^Kata Sandi$/i);
    const submitBtn = screen.getByRole("button", { name: /Masuk ke Dasbor/i });

    expect(usernameInput).toBeInTheDocument();
    expect(passwordInput).toHaveAttribute("type", "password");
    expect(submitBtn).toBeInTheDocument();

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
});

describe("F1-02: Komponen Input Opsi Kelas Dinamis (ClassOptionsInput)", () => {
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

