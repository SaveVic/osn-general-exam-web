-- =============================================================================
-- MIGRASI STANDARDISASI ZONA WAKTU: ASIA/JAKARTA (WIB / UTC+7)
-- Tanggal: 22 Oktober 2026
-- Deskripsi: Mengonfigurasi parameter timezone PostgreSQL Supabase agar seluruh
--            operasi TIMESTAMPTZ dan fungsi now() menggunakan zona waktu +07:00 (WIB).
-- =============================================================================

-- 1. PENGATURAN TIMEZONE LEVEL BASIS DATA & PERAN (ROLES)
-- Mengubah default timezone database 'postgres' dan peran-peran utama Supabase
ALTER DATABASE postgres SET timezone TO 'Asia/Jakarta';
ALTER ROLE postgres SET timezone TO 'Asia/Jakarta';
ALTER ROLE authenticated SET timezone TO 'Asia/Jakarta';
ALTER ROLE anon SET timezone TO 'Asia/Jakarta';
ALTER ROLE service_role SET timezone TO 'Asia/Jakarta';

-- 2. VERIFIKASI PENGATURAN TIMEZONE PADA SESI AKTIF
-- Menyetel timezone untuk sesi migrasi saat ini
SET timezone TO 'Asia/Jakarta';

-- Kueri di bawah dapat dijalankan di SQL Editor untuk memverifikasi:
-- SHOW timezone;          --> Harus mengembalikan 'Asia/Jakarta'
-- SELECT now();           --> Harus mengembalikan timestamp dengan offset +07

-- 3. KUERI DIAGNOSTIK DATA RIWAYAT (OPSIONAL)
-- Periksa apakah ada record naskah ujian yang nilainya bergeser:
-- SELECT id, title, starts_at, ends_at, created_at FROM public.exams ORDER BY created_at DESC LIMIT 10;
-- SELECT id, student_name, started_at, submitted_at FROM public.exam_sessions ORDER BY created_at DESC LIMIT 10;

