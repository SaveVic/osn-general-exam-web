import React from "react";
import { describe, it, expect } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { MarkdownRenderer } from "@/components/ui/markdown-renderer";
import { ImageLightbox } from "@/components/ui/image-lightbox";

describe("F1-03, F3-02, F3-04: Perender Markdown, Formula KaTeX, & Lightbox Gambar", () => {
  it("menampilkan pesan fallback ketika konten kosong", () => {
    render(<MarkdownRenderer content="   " />);
    expect(
      screen.getByText("(Belum ada konten untuk ditampilkan)")
    ).toBeInTheDocument();
  });

  it("merender formula matematika LaTeX inline dan display melalui KaTeX serta tabel GFM", () => {
    const markdown = `
Perhatikan persamaan energi relativistik berikut: $E = mc^2$.

$$
\\sum_{i=1}^{n} i = \\frac{n(n+1)}{2}
$$

| Masukan | Keluaran |
| :--- | :--- |
| 5 | 15 |
`;

    const { container } = render(<MarkdownRenderer content={markdown} />);

    // Pastikan elemen .katex berhasil dirender oleh rehype-katex
    const katexElements = container.querySelectorAll(".katex");
    expect(katexElements.length).toBeGreaterThanOrEqual(2);

    // Pastikan tabel GFM dirender
    expect(screen.getByRole("table")).toBeInTheDocument();
    expect(screen.getByText("Masukan")).toBeInTheDocument();
  });

  it("menyanitasi tag HTML berbahaya (Stored XSS) seperti script dan event handler", () => {
    const maliciousMarkdown = `
Halo peserta! <script>window.hacked = true;</script>
<iframe src="https://evil.com"></iframe>

[Tautan Jahat](javascript:alert('xss'))

Teks biasa tetap aman.
`;

    const { container } = render(<MarkdownRenderer content={maliciousMarkdown} />);

    // Script dan iframe harus dibuang oleh sanitasi
    expect(container.querySelector("script")).toBeNull();
    expect(container.querySelector("iframe")).toBeNull();

    // Link dengan protokol javascript: href-nya wajib dibersihkan/dihapus oleh rehype-sanitize
    const linkElement = container.querySelector("a");
    if (linkElement) {
      expect(linkElement.getAttribute("href")).toBeNull();
    }

    // Teks aman tetap dapat dibaca
    expect(screen.getByText(/Teks biasa tetap aman/i)).toBeInTheDocument();
  });

  it("membungkus sintaks gambar Markdown ![alt](url) secara otomatis dengan ImageLightbox", () => {
    const mdWithImage =
      "Perhatikan grafik berikut:\n\n![Grafik Kecepatan terhadap Waktu](https://example.com/grafik-vt.png)";

    render(<MarkdownRenderer content={mdWithImage} />);

    const trigger = screen.getByRole("button", {
      name: /Perbesar diagram: Grafik Kecepatan terhadap Waktu/i,
    });
    expect(trigger).toBeInTheDocument();
    expect(
      screen.getByText("Grafik Kecepatan terhadap Waktu")
    ).toBeInTheDocument();
  });

  it("ImageLightbox membuka modal portal layar penuh, mengunci scroll body, mendukung Zoom In/Out/Reset/Double-Click, dan ditutup dengan Escape", () => {
    render(
      <ImageLightbox
        src="https://example.com/diagram-rangkaian.webp"
        alt="Diagram Rangkaian Listrik"
      />
    );

    const trigger = screen.getByRole("button", {
      name: /Perbesar diagram: Diagram Rangkaian Listrik/i,
    });

    // Klik thumbnail untuk membuka modal lightbox
    fireEvent.click(trigger);

    const dialog = screen.getByRole("dialog", {
      name: /Pratinjau perbesar: Diagram Rangkaian Listrik/i,
    });
    expect(dialog).toBeInTheDocument();
    expect(document.body.style.overflow).toBe("hidden");
    expect(screen.getByText("100%")).toBeInTheDocument();

    // Uji Zoom In (+25% -> 125%)
    const zoomInBtn = screen.getByRole("button", { name: /Perbesar gambar/i });
    fireEvent.click(zoomInBtn);
    expect(screen.getByText("125%")).toBeInTheDocument();

    // Uji Zoom Out (-25% -> 100%)
    const zoomOutBtn = screen.getByRole("button", { name: /Perkecil gambar/i });
    fireEvent.click(zoomOutBtn);
    expect(screen.getByText("100%")).toBeInTheDocument();

    // Uji Double-Click pada gambar di dalam modal (toggle 100% <-> 200%)
    const modalImage = screen.getByTitle(
      /Klik ganda untuk memperbesar\/memperkecil/i
    );
    fireEvent.doubleClick(modalImage);
    expect(screen.getByText("200%")).toBeInTheDocument();

    // Uji tombol Reset Zoom (-> 100%)
    const resetBtn = screen.getByRole("button", {
      name: /Reset ukuran zoom/i,
    });
    fireEvent.click(resetBtn);
    expect(screen.getByText("100%")).toBeInTheDocument();

    // Uji penutupan menggunakan tombol Escape pada keyboard
    fireEvent.keyDown(window, { key: "Escape", code: "Escape" });
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(document.body.style.overflow).toBe("");
  });
});

