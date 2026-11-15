# Panduan Format JSON Import Soal
## Platform Ujian Teknis Terpadu (*OSN & General Technical Exam Web*)

Dokumen ini menjelaskan struktur, aturan validasi, dan contoh berkas JSON yang digunakan pada fitur **Import Soal** di halaman **Bank Soal Admin** (`/admin/ujian/[id]/soal`).

---

## 1. Gambaran Umum & Aturan Penomoran

* **Lokasi Menu:** Buka dasbor admin $\rightarrow$ pilih paket ujian $\rightarrow$ buka tab/halaman **Bank Soal** $\rightarrow$ klik tombol **Import Soal**.
* **Mode Penempatan (*Append*):** Seluruh soal yang berhasil diimpor **selalu ditambahkan di nomor urut paling belakang** setelah soal terakhir yang sudah ada (`max(order_index) + 1`, atau mulai dari `#1` jika bank soal masih kosong). Jika file JSON menyertakan properti `order_index`, nilai tersebut akan **diabaikan** secara otomatis untuk menjaga urutan tetap konsisten dan bebas bentrok.
* **Validasi Menyeluruh (*All-or-Nothing*):** Seluruh butir soal dalam berkas divalidasi terlebih dahulu sebelum dikirim ke basis data. Jika ada 1 butir soal yang tidak valid, tidak ada soal yang akan disimpan hingga berkas diperbaiki.
* **Batasan Teknis:**
  * Ekstensi berkas wajib `.json` (encoding **UTF-8**).
  * Ukuran berkas maksimal **2 MB**.
  * Jumlah soal per impor minimal **1 butir** dan maksimal **200 butir soal**.

---

## 2. Struktur Root JSON

Standar utama yang disarankan adalah **Array JSON** di level root yang berisi daftar objek butir soal:

```json
[
  {
    "question_type": "single_choice",
    "prompt": "...",
    "points": 2,
    "options": [...],
    "correct_answer": { "selected": "A" }
  },
  {
    "question_type": "short_answer",
    "prompt": "...",
    "points": 5,
    "options": [],
    "correct_answer": { "text": "42" }
  }
]
```

> [!NOTE]
> Parser juga menerima format objek pembungkus `{ "questions": [ ... ] }` apabila Anda mengekspor data dari sistem lain yang membungkus array di bawah properti `questions`.

---

## 3. Referensi Properti Butir Soal

Setiap objek soal di dalam array memiliki properti berikut:

| Properti | Tipe Data | Wajib? | Default | Keterangan |
| :--- | :--- | :---: | :---: | :--- |
| `question_type` | `string` | Ya | — | Salah satu dari `"single_choice"`, `"multiple_choice"`, atau `"short_answer"`. |
| `prompt` | `string` | Ya | — | Isi/stimulus soal minimal 3 karakter. Mendukung Markdown, LaTeX KaTeX (`$...$`, `$$...$$`), blok kode, dan gambar URL. |
| `points` | `number` | Tidak | `1` | Bobot nilai soal (`>= 0`). Mendukung angka desimal (misal `2.5`). |
| `options` | `Array<{ id: string, text: string }>` | Ya (untuk PG & Jamak) | `[]` | Daftar opsi jawaban untuk `single_choice` dan `multiple_choice` (2–10 opsi, `id` wajib unik). Untuk `short_answer`, boleh dikosongkan (`[]`) atau dihilangkan. |
| `correct_answer` | `object` | Ya | — | Struktur objek kunci jawaban bergantung pada `question_type` (lihat bagian 4). |

---

## 4. Spesifikasi Per Tipe Soal

### A. Pilihan Ganda Tunggal (`single_choice`)

Siswa memilih tepat satu jawaban benar dari daftar opsi.

* `options`: Minimal **2** dan maksimal **10** opsi. Setiap objek opsi memiliki `"id"` (misal `"A"`, `"B"`, `"C"`, `"D"`) dan `"text"`. Setiap `"id"` tidak boleh kosong dan **harus unik** dalam satu soal.
* `correct_answer`: Objek dengan properti `"selected"` berupa string yang nilainya **harus ada** di dalam `options[].id`.

```json
{
  "question_type": "single_choice",
  "prompt": "Berapakah kompleksitas waktu algoritma *Binary Search* pada array terurut berukuran $n$?",
  "points": 2,
  "options": [
    { "id": "A", "text": "$O(1)$" },
    { "id": "B", "text": "$O(\\log n)$" },
    { "id": "C", "text": "$O(n)$" },
    { "id": "D", "text": "$O(n \\log n)$" }
  ],
  "correct_answer": {
    "selected": "B"
  }
}
```

---

### B. Pilihan Jamak (`multiple_choice`)

Siswa dapat memilih lebih dari satu jawaban benar.

* `options`: Minimal **2** dan maksimal **10** opsi dengan `"id"` unik dan `"text"` tidak kosong.
* `correct_answer`: Objek dengan properti `"selected"` berupa array string non-kosong (`min 1`). Setiap ID di dalamnya **harus ada** di dalam `options[].id`.

```json
{
  "question_type": "multiple_choice",
  "prompt": "Manakah pernyataan berikut yang **benar** mengenai struktur data *Stack*?",
  "points": 3,
  "options": [
    { "id": "A", "text": "Mengikuti prinsip LIFO (*Last-In, First-Out*)" },
    { "id": "B", "text": "Mengikuti prinsip FIFO (*First-In, First-Out*)" },
    { "id": "C", "text": "Operasi `push` dan `pop` dapat berjalan dalam $O(1)$" },
    { "id": "D", "text": "Selalu menggunakan alokasi *heap* secara acak" }
  ],
  "correct_answer": {
    "selected": ["A", "C"]
  }
}
```

---

### C. Isian Singkat (`short_answer`)

Siswa mengetikkan jawaban singkat berupa teks atau angka.

* `options`: Isi `[]` (atau dapat dikosongkan/tidak ditulis).
* `correct_answer`:
  * `text` (`string`, wajib): Kunci jawaban utama (tidak boleh kosong).
  * `numeric_tolerance` (`number`, opsional, default `0`): Toleransi selisih absolut untuk jawaban numerik (misal `0.01` artinya `3.13` s.d. `3.15` dianggap benar untuk kunci `3.14`).
  * `case_sensitive` (`boolean`, opsional, default `false`): Jika `false`, perbandingan teks mengabaikan huruf besar/kecil.

```json
{
  "question_type": "short_answer",
  "prompt": "Hitung nilai dari $\\sum_{k=1}^{10} k$.",
  "points": 5,
  "options": [],
  "correct_answer": {
    "text": "55",
    "numeric_tolerance": 0,
    "case_sensitive": false
  }
}
```

---

## 5. Tips Penulisan Markdown, LaTeX KaTeX, & Baris Baru di JSON

1. **Escaping Backslash (`\\`) untuk LaTeX:**
   Di dalam string JSON, karakter `\` memiliki arti khusus (*escape character*). Oleh karena itu, setiap perintah LaTeX seperti `\frac`, `\log`, `\sum`, atau `\alpha` **harus ditulis menggunakan dua backslash**:
   * **Salah:** `"$\frac{1}{2}$"` *(menyebabkan galat parsing JSON)*
   * **Benar:** `"$\\frac{1}{2}$"`

2. **Baris Baru & Blok Kode:**
   Gunakan `\n` untuk baris baru di dalam string `prompt`. Contoh blok kode C++ di dalam JSON:
   ```json
   "prompt": "Perhatikan potongan kode berikut:\n\n```cpp\nint x = 5;\ncout << x * 2;\n```\n\nBerapakah keluaran program di atas?"
   ```

3. **Menyertakan Gambar:**
   Jika Anda telah mengunggah gambar ke penyimpanan ujian (*exam assets*) atau CDN HTTPS tepercaya, sisipkan sintaks gambar Markdown langsung pada `prompt`:
   ```json
   "prompt": "Perhatikan graf pada gambar berikut:\n\n![Graf Soal](https://project-id.supabase.co/storage/v1/object/public/exam-assets/graf.png)"
   ```

---

## 6. Contoh File JSON Lengkap Siap Pakai

Anda juga dapat mengunduh contoh ini secara langsung melalui tombol **Unduh Contoh JSON** di dalam modal *Import Soal*.

```json
[
  {
    "question_type": "single_choice",
    "prompt": "Berapakah hasil dari $\\frac{12}{3} + 2^3$?",
    "points": 2,
    "options": [
      { "id": "A", "text": "10" },
      { "id": "B", "text": "12" },
      { "id": "C", "text": "14" },
      { "id": "D", "text": "16" }
    ],
    "correct_answer": {
      "selected": "B"
    }
  },
  {
    "question_type": "multiple_choice",
    "prompt": "Manakah di antara bilangan berikut yang merupakan **bilangan prima**?",
    "points": 3,
    "options": [
      { "id": "A", "text": "2" },
      { "id": "B", "text": "9" },
      { "id": "C", "text": "13" },
      { "id": "D", "text": "15" }
    ],
    "correct_answer": {
      "selected": ["A", "C"]
    }
  },
  {
    "question_type": "short_answer",
    "prompt": "Hitunglah nilai $x$ jika diketahui $3x - 7 = 14$.",
    "points": 5,
    "options": [],
    "correct_answer": {
      "text": "7",
      "numeric_tolerance": 0,
      "case_sensitive": false
    }
  }
]
```

---

## 7. Pemecahan Masalah (*Troubleshooting*)

| Pesan Galat | Penyebab Umum | Solusi |
| :--- | :--- | :--- |
| `Berkas tidak dapat di-parse sebagai JSON yang valid` | Koma berlebih di akhir array (*trailing comma*), kutip tunggal `'...'`, atau backslash LaTeX tunggal `\frac`. | Pastikan menggunakan kutip ganda `"..."`, hapus koma pada item terakhir, dan ganti `\` LaTeX menjadi `\\`. |
| `Struktur root JSON tidak valid` | Root file berupa objek soal tunggal `{...}` tanpa dibungkus array `[...]`. | Bungkus objek-objek soal di dalam kurung siku `[ { ... } ]`. |
| `Label opsi "A" duplikat; setiap id opsi harus unik` | Terdapat dua opsi dengan `id` sama dalam satu soal. | Pastikan setiap opsi memakai `id` berbeda, misal `A`, `B`, `C`, `D`. |
| `Kunci jawaban harus merupakan salah satu dari opsi yang tersedia` | Nilai `correct_answer.selected` tidak ditemukan pada `options[].id` (misal kunci `"E"` padahal opsi hanya `"A"`–`"D"`, atau beda huruf besar/kecil). | Samakan persis nilai `selected` dengan `id` pada `options`. |
| `Jumlah soal melebihi batas maksimal 200 soal per impor` | Satu berkas berisi lebih dari 200 butir soal. | Pecah berkas JSON menjadi 2 atau beberapa file terpisah lalu impor berurutan (semua akan otomatis disambung di nomor belakang). |
