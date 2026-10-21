-- Migrasi: Penambahan kolom show_score pada tabel exams
-- Menentukan apakah skor ujian ditampilkan ke peserta setelah selesai pengerjaan

ALTER TABLE public.exams 
ADD COLUMN IF NOT EXISTS show_score BOOLEAN NOT NULL DEFAULT false;

COMMENT ON COLUMN public.exams.show_score IS 'Apakah skor total dan rincian benar/salah ditampilkan ke peserta setelah ujian selesai';

