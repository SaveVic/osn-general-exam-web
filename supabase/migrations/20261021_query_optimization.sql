-- =============================================================================
-- MIGRASI OPTIMASI KUERI: INDEKS MAJEMUK, STORED PROCEDURE (RPC), & VIEW AGREGAT
-- Tanggal: 21 Oktober 2026
-- =============================================================================

-- 1. INDEKS MAJEMUK (COMPOSITE INDEXES) UNTUK KUERI SUB-MILIDETIK

-- Mengoptimalkan sinkronisasi latar belakang dan pencarian jawaban terurut waktu
CREATE INDEX IF NOT EXISTS idx_session_answers_session_updated 
ON public.session_answers(session_id, last_updated_at DESC);

-- Mengoptimalkan filter butir soal berdasarkan tipe pada evaluasi manual (short_answer)
CREATE INDEX IF NOT EXISTS idx_questions_exam_type 
ON public.questions(exam_id, question_type);

-- Mengoptimalkan pencarian sesi yang telah selesai untuk laporan dan rekapitulasi nilai
CREATE INDEX IF NOT EXISTS idx_exam_sessions_exam_completed 
ON public.exam_sessions(exam_id, is_completed);

-- Mengoptimalkan verifikasi kode rujukan aktif di gerbang masuk
CREATE INDEX IF NOT EXISTS idx_referral_codes_active_lookup 
ON public.referral_codes(code, is_active);


-- 2. STORED PROCEDURE / RPC: recalculate_exam_scores_batch
-- Mengeliminasi N+1 loop kueri pada kalkulasi ulang nilai massal (501 kueri -> 1 eksekusi)
CREATE OR REPLACE FUNCTION public.recalculate_exam_scores_batch(target_exam_id UUID)
RETURNS TABLE (processed_sessions INTEGER) AS $$
DECLARE
    session_count INTEGER;
BEGIN
    -- Evaluasi & simpan awarded_score secara atomik untuk seluruh sesi yang telah selesai
    UPDATE public.session_answers sa
    SET 
        awarded_score = CASE 
            -- Pilihan Ganda (single_choice): cocokkan nilai atribut selected
            WHEN q.question_type = 'single_choice' THEN 
                CASE WHEN (sa.answer_value->>'selected') = (q.correct_answer->>'selected') 
                     THEN q.points ELSE 0 END
            -- Pilihan Jamak (multiple_choice): cocokkan persis kesetaraan array JSON
            WHEN q.question_type = 'multiple_choice' THEN 
                CASE WHEN (sa.answer_value->'selected') = (q.correct_answer->'selected') 
                     THEN q.points ELSE 0 END
            -- Isian Singkat (short_answer): pertahankan nilai manual yang sudah diberikan, atau default 0
            ELSE COALESCE(sa.awarded_score, 0)
        END,
        last_updated_at = now()
    FROM public.questions q, public.exam_sessions es
    WHERE sa.question_id = q.id 
      AND sa.session_id = es.id 
      AND es.exam_id = target_exam_id 
      AND es.is_completed = true;

    -- Akumulasi total_score langsung ke tabel exam_sessions
    WITH session_totals AS (
        SELECT sa.session_id, ROUND(COALESCE(SUM(sa.awarded_score), 0), 2) AS total
        FROM public.session_answers sa
        JOIN public.exam_sessions es ON es.id = sa.session_id
        WHERE es.exam_id = target_exam_id AND es.is_completed = true
        GROUP BY sa.session_id
    )
    UPDATE public.exam_sessions es
    SET total_score = st.total
    FROM session_totals st
    WHERE es.id = st.session_id;

    -- Hitung total sesi yang berhasil diproses
    SELECT COUNT(*) INTO session_count 
    FROM public.exam_sessions 
    WHERE exam_id = target_exam_id AND is_completed = true;

    RETURN QUERY SELECT session_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- 3. VIEW AGREGAT: v_exam_session_monitoring
-- Mengagregasi jumlah soal terjawab dan timestamp sinkronisasi langsung di tingkat basis data
CREATE OR REPLACE VIEW public.v_exam_session_monitoring AS
SELECT 
    es.id,
    es.exam_id,
    es.student_name,
    es.student_class,
    es.started_at,
    es.submitted_at,
    es.is_completed,
    es.total_score,
    COUNT(sa.id) FILTER (
        WHERE sa.answer_value IS NOT NULL 
          AND sa.answer_value != 'null'::jsonb 
          AND sa.answer_value != '""'::jsonb
    ) AS answered_count,
    MAX(sa.last_updated_at) AS last_synced_at
FROM public.exam_sessions es
LEFT JOIN public.session_answers sa ON sa.session_id = es.id
GROUP BY es.id;

