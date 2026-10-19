'use client'

import React, { useState, useTransition } from 'react'
import type { ManualEvaluationSubmission } from '@/actions/manual-evaluation'
import { updateManualScoreAction } from '@/actions/manual-evaluation'
import { parseShortAnswerConfig } from '@/lib/exam/scoring'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import {
  CheckCircle2,
  AlertCircle,
  Loader2,
  KeyRound,
  MessageSquare,
  User,
  GraduationCap,
  Save,
} from 'lucide-react'

interface EvaluationItemCardProps {
  submission: ManualEvaluationSubmission
  onScoreSaved?: (
    sessionId: string,
    questionId: string,
    newScore: number,
    newTotalScore: number,
  ) => void
}

export function EvaluationItemCard({
  submission,
  onScoreSaved,
}: EvaluationItemCardProps) {
  const [scoreInput, setScoreInput] = useState<string>(
    submission.awardedScore !== null ? String(submission.awardedScore) : '',
  )
  const [isPending, startTransition] = useTransition()
  const [feedback, setFeedback] = useState<{
    type: 'success' | 'error'
    text: string
  } | null>(null)

  const rubric = parseShortAnswerConfig(submission.correctAnswer)
  const maxPoints = submission.questionPoints

  const handleSaveScore = () => {
    const numericScore = parseFloat(scoreInput)

    if (isNaN(numericScore)) {
      setFeedback({
        type: 'error',
        text: 'Masukkan angka nilai yang valid.',
      })
      return
    }

    if (numericScore < 0) {
      setFeedback({
        type: 'error',
        text: 'Nilai tidak boleh bernilai negatif.',
      })
      return
    }

    if (numericScore > maxPoints) {
      setFeedback({
        type: 'error',
        text: `Nilai maksimal untuk butir soal ini adalah ${maxPoints} poin.`,
      })
      return
    }

    setFeedback(null)
    startTransition(async () => {
      try {
        const res = await updateManualScoreAction({
          sessionId: submission.sessionId,
          questionId: submission.questionId,
          score: numericScore,
        })

        if (res.success && res.awardedScore !== undefined) {
          setFeedback({
            type: 'success',
            text: res.message,
          })
          onScoreSaved?.(
            submission.sessionId,
            submission.questionId,
            res.awardedScore,
            res.sessionTotalScore ?? 0,
          )
          setTimeout(() => {
            setFeedback(null)
          }, 3000)
        } else {
          setFeedback({
            type: 'error',
            text: res.message || 'Gagal menyimpan nilai.',
          })
        }
      } catch (err) {
        setFeedback({
          type: 'error',
          text:
            err instanceof Error ? err.message : 'Terjadi kesalahan internal.',
        })
      }
    })
  }

  const hasAnswered =
    submission.studentAnswerText !== null &&
    submission.studentAnswerText.trim().length > 0

  return (
    <div
      data-testid={`evaluation-card-${submission.sessionId}-${submission.questionId}`}
      className='rounded-xl border border-slate-200 bg-white p-5 shadow-xs transition-shadow hover:shadow-sm dark:border-slate-800 dark:bg-slate-900'
    >
      {/* Header: Siswa & Status */}
      <div className='flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-4 dark:border-slate-800'>
        <div className='flex items-center gap-3'>
          <div className='flex size-9 items-center justify-center rounded-lg bg-indigo-50 text-indigo-600 dark:bg-indigo-950/60 dark:text-indigo-400'>
            <User className='size-4' />
          </div>
          <div>
            <h3 className='text-sm font-semibold text-slate-900 dark:text-slate-100'>
              {submission.studentName}
            </h3>
            <div className='flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400'>
              <span className='flex items-center gap-1'>
                <GraduationCap className='size-3.5' />
                {submission.studentClass}
              </span>
              <span>•</span>
              <span>
                {submission.isCompleted ? (
                  <span className='text-emerald-600 dark:text-emerald-400'>
                    Selesai
                  </span>
                ) : (
                  <span className='text-amber-600 dark:text-amber-400'>
                    Sedang Mengerjakan
                  </span>
                )}
              </span>
            </div>
          </div>
        </div>

        <div className='flex items-center gap-2'>
          <Badge variant='outline' className='text-xs'>
            Soal #{submission.questionOrderIndex}
          </Badge>
          <Badge variant='secondary' className='text-xs font-semibold'>
            Maks: {maxPoints} Poin
          </Badge>
          {submission.sessionTotalScore !== null && (
            <Badge className='bg-indigo-600 text-white hover:bg-indigo-600 dark:bg-indigo-500'>
              Total Sesi: {submission.sessionTotalScore}
            </Badge>
          )}
        </div>
      </div>

      {/* Konten Soal */}
      <div className='mt-4 space-y-3'>
        <div>
          <span className='text-xs font-medium tracking-wide text-slate-500 uppercase dark:text-slate-400'>
            Stimulus / Naskah Soal:
          </span>
          <p className='mt-1 text-sm text-slate-800 dark:text-slate-200'>
            {submission.questionPrompt}
          </p>
        </div>

        {/* Kotak Kunci Referensi / Rubrik */}
        <div className='rounded-lg border border-emerald-200/70 bg-emerald-50/50 p-3 text-xs dark:border-emerald-900/50 dark:bg-emerald-950/20'>
          <div className='flex items-center gap-1.5 font-semibold text-emerald-800 dark:text-emerald-300'>
            <KeyRound className='size-3.5' />
            <span>Kunci / Rubrik Referensi Penilaian:</span>
          </div>
          <p className='mt-1 font-mono text-sm font-medium text-emerald-900 dark:text-emerald-100'>
            {rubric?.text || '-'}
          </p>
          {(rubric?.numeric_tolerance && rubric.numeric_tolerance > 0) ||
          rubric?.case_sensitive ? (
            <div className='mt-1 flex flex-wrap gap-2 text-[11px] text-emerald-700 dark:text-emerald-300'>
              {rubric?.numeric_tolerance && rubric.numeric_tolerance > 0 ? (
                <span>Toleransi Numerik: ±{rubric.numeric_tolerance}</span>
              ) : null}
              {rubric?.case_sensitive ? (
                <span>• Huruf Besar/Kecil Peka (Case Sensitive)</span>
              ) : null}
            </div>
          ) : null}
        </div>

        {/* Kotak Jawaban Siswa */}
        <div className='rounded-lg border border-slate-200 bg-slate-50/60 p-3.5 dark:border-slate-800 dark:bg-slate-950/40'>
          <div className='flex items-center gap-1.5 text-xs font-semibold text-slate-700 dark:text-slate-300'>
            <MessageSquare className='size-3.5 text-indigo-600 dark:text-indigo-400' />
            <span>Jawaban Peserta:</span>
          </div>
          {hasAnswered ? (
            <p className='mt-1.5 whitespace-pre-wrap font-mono text-sm text-slate-900 dark:text-slate-100'>
              {submission.studentAnswerText}
            </p>
          ) : (
            <p className='mt-1.5 text-xs italic text-slate-400 dark:text-slate-500'>
              Peserta tidak mengisi lembar jawaban ini (kosong).
            </p>
          )}
        </div>
      </div>

      {/* Form Input Nilai & Tombol Simpan */}
      <div className='mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 pt-4 dark:border-slate-800'>
        <div className='flex items-center gap-2.5'>
          <label
            htmlFor={`input-score-${submission.sessionId}-${submission.questionId}`}
            className='text-xs font-semibold text-slate-700 dark:text-slate-300'
          >
            Nilai Perolehan:
          </label>
          <div className='flex items-center gap-1.5'>
            <Input
              id={`input-score-${submission.sessionId}-${submission.questionId}`}
              type='number'
              min='0'
              max={maxPoints}
              step='0.5'
              value={scoreInput}
              disabled={isPending}
              onChange={(e) => setScoreInput(e.target.value)}
              className='h-8 w-24 text-center font-semibold text-slate-900 dark:text-slate-100'
              placeholder='0.0'
              aria-label={`Nilai untuk ${submission.studentName}`}
            />
            <span className='text-xs text-slate-500 dark:text-slate-400'>
              / {maxPoints}
            </span>
          </div>
        </div>

        <div className='flex items-center gap-3'>
          {feedback && (
            <div
              className={`flex items-center gap-1.5 text-xs font-medium ${
                feedback.type === 'success'
                  ? 'text-emerald-600 dark:text-emerald-400'
                  : 'text-rose-600 dark:text-rose-400'
              }`}
            >
              {feedback.type === 'success' ? (
                <CheckCircle2 className='size-3.5' />
              ) : (
                <AlertCircle className='size-3.5' />
              )}
              <span>{feedback.text}</span>
            </div>
          )}

          <Button
            size='sm'
            disabled={isPending}
            onClick={handleSaveScore}
            className='h-8 gap-1.5 bg-indigo-600 text-xs font-medium text-white hover:bg-indigo-700 dark:bg-indigo-500 dark:hover:bg-indigo-600'
          >
            {isPending ? (
              <>
                <Loader2 className='size-3.5 animate-spin' />
                <span>Menyimpan...</span>
              </>
            ) : (
              <>
                <Save className='size-3.5' />
                <span>Simpan Nilai</span>
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  )
}
