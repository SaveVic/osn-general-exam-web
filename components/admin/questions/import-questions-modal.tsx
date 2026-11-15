'use client'

import React, { useRef, useState } from 'react'
import { importQuestionsAction } from '@/actions/questions'
import {
  EXAMPLE_IMPORT_QUESTIONS,
  MAX_IMPORT_FILE_SIZE_BYTES,
  MAX_IMPORT_QUESTIONS,
  parseAndValidateQuestionsJson,
  type ImportedQuestionItem,
} from '@/lib/validations/question'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  AlertCircle,
  CheckCircle2,
  Download,
  FileJson,
  Loader2,
  Upload,
} from 'lucide-react'
import { cn } from '@/lib/utils'

interface ImportQuestionsModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  examId: string
  nextOrderIndex: number
  onSuccess: () => void
}

function readJsonFileAsText(file: File): Promise<string> {
  if (typeof file.text === 'function') {
    return file.text()
  }
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () =>
      resolve(typeof reader.result === 'string' ? reader.result : '')
    reader.onerror = () => reject(new Error('Gagal membaca isi berkas JSON.'))
    reader.readAsText(file)
  })
}

function getTypeLabel(type: ImportedQuestionItem['question_type']): string {
  switch (type) {
    case 'single_choice':
      return 'Pilihan Ganda'
    case 'multiple_choice':
      return 'Pilihan Jamak'
    case 'short_answer':
      return 'Isian Singkat'
  }
}

export function ImportQuestionsModal({
  open,
  onOpenChange,
  examId,
  nextOrderIndex,
  onSuccess,
}: ImportQuestionsModalProps) {
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [fileName, setFileName] = useState<string | null>(null)
  const [parsedItems, setParsedItems] = useState<ImportedQuestionItem[] | null>(
    null,
  )
  const [validationErrors, setValidationErrors] = useState<string[]>([])
  const [serverError, setServerError] = useState<string | null>(null)
  const [isDragging, setIsDragging] = useState(false)
  const [isPending, setIsPending] = useState(false)

  const resetState = () => {
    setFileName(null)
    setParsedItems(null)
    setValidationErrors([])
    setServerError(null)
    setIsDragging(false)
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  const handleOpenChange = (nextOpen: boolean) => {
    if (!nextOpen && isPending) return
    if (!nextOpen) {
      resetState()
    }
    onOpenChange(nextOpen)
  }

  const processSelectedFile = async (file: File) => {
    setServerError(null)
    setValidationErrors([])
    setParsedItems(null)
    setFileName(file.name)

    const isJsonExtension = file.name.toLowerCase().endsWith('.json')
    const isJsonMime =
      file.type === 'application/json' || file.type === 'text/json'
    if (!isJsonExtension && !isJsonMime) {
      setValidationErrors(['Format berkas harus berupa file JSON (.json).'])
      return
    }

    if (file.size > MAX_IMPORT_FILE_SIZE_BYTES) {
      setValidationErrors(['Ukuran berkas melebihi batas maksimal 2 MB.'])
      return
    }

    try {
      const text = await readJsonFileAsText(file)
      let rawJson: unknown
      try {
        rawJson = JSON.parse(text)
      } catch {
        setValidationErrors([
          'Berkas tidak dapat di-parse sebagai JSON yang valid. Periksa tanda koma, kutip ganda, atau backslash LaTeX (`\\\\`).',
        ])
        return
      }

      const result = parseAndValidateQuestionsJson(rawJson)
      if (!result.success) {
        setValidationErrors(result.errors)
        return
      }

      setParsedItems(result.data)
    } catch {
      setValidationErrors(['Terjadi kesalahan saat membaca berkas JSON.'])
    }
  }

  const handleFileInputChange = async (
    e: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const file = e.target.files?.[0]
    if (file) {
      await processSelectedFile(file)
    }
  }

  const handleDrop = async (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    setIsDragging(false)
    if (isPending) return

    const file = e.dataTransfer.files?.[0]
    if (file) {
      await processSelectedFile(file)
    }
  }

  const handleDownloadExample = () => {
    const content = JSON.stringify(EXAMPLE_IMPORT_QUESTIONS, null, 2)
    const blob = new Blob([content], { type: 'application/json;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = 'contoh-import-soal.json'
    document.body.appendChild(link)
    link.click()
    link.remove()
    URL.revokeObjectURL(url)
  }

  const handleConfirmImport = async () => {
    if (!parsedItems || parsedItems.length === 0 || isPending) return

    setServerError(null)
    setIsPending(true)
    try {
      const result = await importQuestionsAction(examId, parsedItems)
      if (result.success) {
        resetState()
        onOpenChange(false)
        onSuccess()
      } else {
        setServerError(result.message || 'Gagal mengimpor butir soal.')
        if (result.errors && result.errors.length > 0) {
          setValidationErrors(result.errors)
        }
      }
    } catch {
      setServerError('Terjadi kesalahan sistem saat mengimpor soal.')
    } finally {
      setIsPending(false)
    }
  }

  const totalImportedPoints = parsedItems
    ? parsedItems.reduce((sum, item) => sum + (Number(item.points) || 0), 0)
    : 0

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className='max-h-[90vh] w-[calc(100vw-2rem)] max-w-2xl overflow-x-hidden overflow-y-auto'>
        <DialogHeader className='min-w-0'>
          <DialogTitle className='flex items-center gap-2 text-slate-900 dark:text-slate-50'>
            <FileJson className='size-5 shrink-0 text-indigo-600 dark:text-indigo-400' />
            <span>Import Soal dari JSON</span>
          </DialogTitle>
          <DialogDescription>
            Tambahkan beberapa soal sekaligus dari berkas <code>.json</code>.
            Soal baru otomatis diletakkan di urutan belakang mulai nomor{' '}
            <strong className='text-slate-900 dark:text-slate-100'>
              #{nextOrderIndex}
            </strong>{' '}
            (maksimal {MAX_IMPORT_QUESTIONS} soal, maks 2 MB).
          </DialogDescription>
        </DialogHeader>

        <div className='min-w-0 space-y-4'>
          {/* Panduan Singkat & Unduh Templat */}
          <div className='flex min-w-0 flex-wrap items-center justify-between gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-xs text-slate-600 dark:border-slate-800 dark:bg-slate-950/60 dark:text-slate-300'>
            <span className='min-w-0 wrap-break-word'>
              Lihat panduan struktur lengkap pada{' '}
              <code className='rounded bg-slate-200/70 px-1 py-0.5 text-[11px] break-all dark:bg-slate-800'>
                docs/question-import-json-guide.md
              </code>
              .
            </span>
            <Button
              type='button'
              variant='outline'
              size='sm'
              onClick={handleDownloadExample}
              disabled={isPending}
              className='h-7 gap-1.5 text-xs'
            >
              <Download className='size-3.5' />
              Unduh Contoh JSON
            </Button>
          </div>

          {/* Dropzone & Input File */}
          <div
            onDragOver={(e) => {
              e.preventDefault()
              setIsDragging(true)
            }}
            onDragLeave={(e) => {
              e.preventDefault()
              setIsDragging(false)
            }}
            onDrop={handleDrop}
            className={cn(
              'rounded-xl border-2 border-dashed p-5 text-center transition-colors',
              isDragging
                ? 'border-indigo-500 bg-indigo-50/70 dark:bg-indigo-950/30'
                : 'border-slate-300 bg-white dark:border-slate-700 dark:bg-slate-900/50',
            )}
          >
            <input
              ref={fileInputRef}
              id='import-questions-file-input'
              type='file'
              accept='.json,application/json'
              onChange={handleFileInputChange}
              disabled={isPending}
              className='sr-only'
            />
            <Upload className='mx-auto mb-2 size-7 text-slate-400' />
            <p className='text-sm font-medium wrap-break-word text-slate-800 dark:text-slate-200'>
              {fileName ? (
                <>
                  Berkas dipilih:{' '}
                  <span className='font-mono break-all text-indigo-600 dark:text-indigo-400'>
                    {fileName}
                  </span>
                </>
              ) : (
                'Seret & lepas file JSON di sini, atau pilih dari perangkat'
              )}
            </p>
            <p className='mt-1 text-xs text-slate-500 dark:text-slate-400'>
              Mendukung array JSON <code>[...]</code> untuk tipe{' '}
              <code>single_choice</code>, <code>multiple_choice</code>, dan{' '}
              <code>short_answer</code>.
            </p>
            <div className='mt-3'>
              <Button
                type='button'
                variant='outline'
                size='sm'
                disabled={isPending}
                onClick={() => fileInputRef.current?.click()}
              >
                {fileName ? 'Pilih Berkas Lain' : 'Pilih File JSON'}
              </Button>
            </div>
          </div>

          {/* Daftar Error Validasi */}
          {validationErrors.length > 0 && (
            <div className='min-w-0 rounded-lg border border-rose-200 bg-rose-50 p-3.5 text-xs text-rose-800 dark:border-rose-900/60 dark:bg-rose-950/30 dark:text-rose-300'>
              <div className='mb-1.5 flex items-center gap-2 font-semibold'>
                <AlertCircle className='size-4 shrink-0 text-rose-600 dark:text-rose-400' />
                <span>
                  Ditemukan {validationErrors.length} kesalahan format/validasi:
                </span>
              </div>
              <ul className='max-h-36 list-disc space-y-1 overflow-y-auto pl-5 wrap-break-word'>
                {validationErrors.map((err, index) => (
                  <li key={`${index}-${err}`}>{err}</li>
                ))}
              </ul>
            </div>
          )}

          {/* Error Server */}
          {serverError && (
            <div className='flex min-w-0 items-start gap-2 rounded-lg border border-rose-200 bg-rose-50 p-3 text-xs text-rose-800 dark:border-rose-900/60 dark:bg-rose-950/30 dark:text-rose-300'>
              <AlertCircle className='mt-0.5 size-4 shrink-0 text-rose-600 dark:text-rose-400' />
              <span className='min-w-0 wrap-break-word'>{serverError}</span>
            </div>
          )}

          {/* Pratinjau Hasil Parsing Valid */}
          {parsedItems && parsedItems.length > 0 && (
            <div className='min-w-0 space-y-3 rounded-xl border border-emerald-200 bg-emerald-50/50 p-4 dark:border-emerald-900/50 dark:bg-emerald-950/20'>
              <div className='flex min-w-0 flex-wrap items-center justify-between gap-2'>
                <div className='flex items-center gap-2 text-sm font-semibold text-emerald-800 dark:text-emerald-300'>
                  <CheckCircle2 className='size-4 shrink-0' />
                  <span>{parsedItems.length} butir soal siap diimpor</span>
                </div>
                <div className='flex flex-wrap items-center gap-2 text-xs'>
                  <Badge
                    variant='outline'
                    className='border-emerald-300 bg-white font-mono text-emerald-800 dark:border-emerald-800 dark:bg-slate-900 dark:text-emerald-300'
                  >
                    Nomor #{nextOrderIndex}–#
                    {nextOrderIndex + parsedItems.length - 1}
                  </Badge>
                  <Badge
                    variant='outline'
                    className='border-emerald-300 bg-white font-mono text-emerald-800 dark:border-emerald-800 dark:bg-slate-900 dark:text-emerald-300'
                  >
                    +{totalImportedPoints} Poin
                  </Badge>
                </div>
              </div>

              <div className='max-h-44 min-w-0 space-y-1.5 overflow-x-hidden overflow-y-auto pr-1'>
                {parsedItems.map((item, idx) => (
                  <div
                    key={idx}
                    className='flex min-w-0 items-center justify-between gap-3 rounded-lg border border-slate-200/80 bg-white px-3 py-2 text-xs dark:border-slate-800 dark:bg-slate-900'
                  >
                    <div className='flex min-w-0 flex-1 items-center gap-2 overflow-hidden'>
                      <span className='shrink-0 rounded bg-slate-900 px-1.5 py-0.5 font-mono text-[11px] font-semibold text-white dark:bg-slate-100 dark:text-slate-900'>
                        #{nextOrderIndex + idx}
                      </span>
                      <span className='min-w-0 flex-1 truncate text-slate-700 dark:text-slate-200'>
                        {item.prompt}
                      </span>
                    </div>
                    <div className='flex shrink-0 items-center gap-2 text-[11px] text-slate-500 dark:text-slate-400'>
                      <span>{getTypeLabel(item.question_type)}</span>
                      <span className='font-mono'>{item.points} Poin</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        <DialogFooter className='gap-2 sm:gap-0'>
          <Button
            type='button'
            variant='outline'
            onClick={() => handleOpenChange(false)}
            disabled={isPending}
          >
            Batal
          </Button>
          <Button
            type='button'
            onClick={handleConfirmImport}
            disabled={
              isPending ||
              !parsedItems ||
              parsedItems.length === 0 ||
              validationErrors.length > 0
            }
            className='bg-indigo-600 text-white hover:bg-indigo-700'
          >
            {isPending ? (
              <>
                <Loader2 className='mr-1.5 size-4 animate-spin' />
                Mengimpor...
              </>
            ) : (
              <>
                <Upload className='mr-1.5 size-4' />
                {parsedItems
                  ? `Import ${parsedItems.length} Soal`
                  : 'Import Soal'}
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
