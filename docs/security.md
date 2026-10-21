# Standar Keamanan Aplikasi (AppSec) & Pencegahan Eksploitasi
## Platform Ujian Teknis Terpadu (*OSN & General Technical Exam Web*)

Dokumen ini mendokumentasikan postur keamanan, mitigasi kerentanan, dan kebijakan pengerasan sistem (*security hardening*) yang diterapkan pada platform `osn-general-exam-web`.

---

## 1. Ikhtisar Model Ancaman (*Threat Modeling*)

Dalam penyelenggaraan ujian seleksi teknis dan olimpiade berbasis web, sistem menghadapi beberapa ancaman utama:

| Vektor Serangan | Risiko & Potensi Dampak | Lapisan Mitigasi yang Diterapkan |
| :--- | :--- | :--- |
| **Stored Cross-Site Scripting (XSS)** | Penyerang atau pembuat soal menyusupkan script JavaScript pada stimulus soal untuk mencuri session cookie siswa atau memanipulasi tampilan jawaban. | Integrasi `rehype-sanitize` dengan skema atribut terbatas pada [`components/ui/markdown-renderer.tsx`](file:///d:/MyProject/osn-general-exam-web/components/ui/markdown-renderer.tsx). |
| **SVG XML/Script Injection** | Berkas gambar vektor SVG disusupi kode berbahaya (`<svg onload="alert(1)">`) saat diunggah sebagai diagram soal. | Menghapus `image/svg+xml` dari tipe MIME yang diizinkan pada [`actions/storage.ts`](file:///d:/MyProject/osn-general-exam-web/actions/storage.ts). Hanya mengizinkan format raster aman (PNG, JPEG, WebP). |
| **Pembobolan Akun via Public Signup** | Penyerang mendaftar mandiri via endpoint publik Supabase Auth dan memperoleh akses membaca bank soal melalui hak `authenticated`. | Mematikan opsi *"Allow new users to sign up"* pada dasbor Supabase Auth. Pembuatan akun pengawas dilakukan secara tertutup. |
| **Clickjacking / UI Redressing** | Halaman ujian dimuat di dalam iframe situs phishing pihak ketiga untuk memanipulasi klik peserta. | Injeksi header keamanan `X-Frame-Options: DENY` dan `Content-Security-Policy` di [`next.config.ts`](file:///d:/MyProject/osn-general-exam-web/next.config.ts). |
| **Session Hijacking & Token Replay** | Token sesi siswa yang tersimpan di cookie dicuri melalui inspeksi jaringan atau log server. | Token sesi disimpan dalam cookie `exam_token` dengan enkripsi searah **SHA-256** (`session_token_hash`) di basis data. |
| **Kebocoran Kredensial Lingkungan** | Kunci rahasia Service Role atau konfigurasi internal bocor ke klien melalui endpoint API publik. | Validasi skema Zod pada [`lib/env.ts`](file:///d:/MyProject/osn-general-exam-web/lib/env.ts) memastikan Service Role Key hanya dapat diakses di lingkungan server Node.js. |

---

## 2. Sanitasi Konten Markdown & Formula Matematika KaTeX

### A. Urutan Pipeline Rehype yang Benar
Pustaka Markdown (`react-markdown`) menggunakan rantai plugin AST (Abstract Syntax Tree). Urutan eksekusi sangat krusial:
```text
Markdown Text
  ├── remark-math (Mengurai sintaks $ dan $$ menjadi node math)
  ├── remark-gfm (Mengurai tabel dan formatting GitHub Flavored Markdown)
  ├── rehype-sanitize (Membersihkan seluruh tag, atribut, dan event handler berbahaya)
  ├── rehype-katex (Merender node matematika menjadi HTML/MathML KaTeX yang aman)
  └── rehype-highlight (Menyorot sintaks blok kode bahasa pemrograman)
```

> [!IMPORTANT]
> `rehype-sanitize` **WAJIB** dieksekusi *sebelum* `rehype-katex`. Jika diletakkan setelahnya, parser sanitasi akan menghapus tag MathML dan kelas internal KaTeX karena dianggap elemen HTML tidak standar.

### B. Skema Atribut yang Diizinkan (*Sanitize Whitelist*)
[`components/ui/markdown-renderer.tsx`](file:///d:/MyProject/osn-general-exam-web/components/ui/markdown-renderer.tsx) mendefinisikan `sanitizeSchema` yang diperluas dari `defaultSchema`:
* Mengizinkan tag standar: `p`, `strong`, `em`, `code`, `pre`, `table`, `thead`, `tbody`, `tr`, `th`, `td`, `img`, `ul`, `ol`, `li`.
* Mengizinkan atribut kelas matematika: `className: ['math', 'math-inline', 'math-display']` pada `div` dan `span`.
* Mengizinkan atribut kelas pewarnaan kode: `className: [/^language-./, 'hljs']` pada `code`.
* **Memblokir mutlak:** Seluruh tag `<script>`, `<iframe>`, `<object>`, `<embed>`, atribut event (`onerror`, `onload`, `onclick`), serta tautan dengan protokol berisiko (`javascript:`, `data:`).

---

## 3. Pembatasan Unggahan Berkas Gambar Diagram

Pada [`actions/storage.ts`](file:///d:/MyProject/osn-general-exam-web/actions/storage.ts):
```typescript
const ALLOWED_MIME_TYPES = [
  "image/png",
  "image/jpeg",
  "image/jpg",
  "image/webp",
];
const MAX_FILE_SIZE_BYTES = 2 * 1024 * 1024; // 2 Megabyte
```
1. Berkas SVG berbasis XML **dilarang** karena struktur XML membuka peluang serangan *XML External Entity (XXE)* dan eksekusi skrip inline.
2. Nama berkas asli diacak menggunakan generator UUID dan timestamp untuk mencegah serangan penimpaan berkas (*file path traversal*).
3. Batas ukuran berkas 2 MB mencegah pemborosan kuota penyimpanan Supabase Storage (1 GB free tier).

---

## 4. Penegakan HTTP Security Headers (OWASP Standards)

Konfigurasi [`next.config.ts`](file:///d:/MyProject/osn-general-exam-web/next.config.ts) menyuntikkan header keamanan berstandar industri pada setiap permintaan HTTP:

```typescript
async headers() {
  return [
    {
      source: "/(.*)",
      headers: [
        {
          key: "X-Frame-Options",
          value: "DENY",
        },
        {
          key: "X-Content-Type-Options",
          value: "nosniff",
        },
        {
          key: "Referrer-Policy",
          value: "strict-origin-when-cross-origin",
        },
        {
          key: "Strict-Transport-Security",
          value: "max-age=63072000; includeSubDomains; preload",
        },
        {
          key: "Permissions-Policy",
          value: "camera=(), microphone=(), geolocation=()",
        },
      ],
    },
  ];
}
```

* **X-Frame-Options: DENY:** Mencegah aplikasi dibungkus dalam `<iframe>` di situs manapun, mengeliminasi serangan Clickjacking.
* **X-Content-Type-Options: nosniff:** Memaksa peramban mematuhi `Content-Type` yang dideklarasikan, mencegah eksploitasi penyusupan script via berkas non-script.
* **Strict-Transport-Security (HSTS):** Memaksa koneksi peramban selalu melalui protokol terenkripsi HTTPS selama minimal 2 tahun.
* **Referrer-Policy:** Menjamin URL lengkap dan query parameter sensitif tidak dikirimkan ke domain pihak ketiga saat memuat tautan eksternal.
* **Permissions-Policy:** Menonaktifkan akses sensor perangkat keras peramban (kamera, mikrofon, geolokasi) yang tidak dibutuhkan oleh platform ujian.

---

## 5. Keamanan Sesi Peserta & Otentikasi

### A. Hashing Kriptografi Token Sesi Siswa
1. Saat siswa menekan "Mulai Kerjakan Ujian", server membangkitkan string acak berkualitas kriptografis menggunakan generator lokal (`crypto.randomUUID()`).
2. String acak ini disetel pada cookie peramban dengan atribut `path=/` dan `SameSite=Lax`.
3. Server **tidak pernah** menyimpan string mentah ini ke dalam kolom basis data. Server menghitung hash SHA-256 melalui [`hashSessionToken`](file:///d:/MyProject/osn-general-exam-web/lib/security/session-token.ts) dan menyimpannya pada kolom `session_token_hash`.
4. Jika database Supabase bocor, penyerang tidak dapat mereplikasi sesi pengerjaan siswa tanpa mengetahui token mentah yang tersimpan di cookie.

### B. Isolasi Hak Akses Administrator vs Siswa
* **Pengawas:** Memiliki kredensial email/password di Supabase GoTrue Auth. Mendapatkan token JWT resmi untuk melakukan operasi CRUD pada naskah soal, kode rujukan, dan laporan nilai.
* **Siswa:** Berstatus pengguna anonim tanpa akun Supabase. Akses masuk diatur murni melalui kode rujukan unik dan divalidasi melalui Server Actions yang menggunakan klien *Service Role* terkontrol di sisi server.

---

## 6. Penanganan Kesalahan & Pencegahan Kebocoran Informasi

1. **Fail-Fast Environment Validation ([`lib/env.ts`](file:///d:/MyProject/osn-general-exam-web/lib/env.ts)):**
   Memvalidasi format URL dan panjang karakter seluruh variabel lingkungan saat aplikasi menyala. Menghentikan proses dengan pesan diagnostik jelas di log internal, tanpa menampilkan kredensial ke layar publik.
2. **Endpoint Kesehatan Aman ([`app/api/health/route.ts`](file:///d:/MyProject/osn-general-exam-web/app/api/health/route.ts)):**
   Hanya menyajikan status kesehatan umum (`ok` / `degraded`), timestamp UTC, dan latensi kueri dalam milidetik. Tidak pernah memaparkan *stack trace* database atau nama environment variable.
3. **Error Boundary Visual ([`app/error.tsx`](file:///d:/MyProject/osn-general-exam-web/app/error.tsx)):**
   Menampilkan antarmuka ramah pengguna dengan tombol muat ulang jika terjadi galat runtime, tanpa menampilkan galat teknis mentah (*raw exception*) ke peramban siswa.

