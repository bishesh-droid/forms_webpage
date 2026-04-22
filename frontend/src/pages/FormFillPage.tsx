import { useState, useRef } from 'react'
import { useParams } from 'react-router-dom'
import { useQuery, useMutation } from '@tanstack/react-query'
import { CheckCircle2 } from 'lucide-react'
import { api } from '@/lib/api'
import { Button } from '@/components/ui/button'
import { QuestionField } from '@/components/respondent/QuestionField'
import type { Form, Question } from '@/types'

export default function FormFillPage() {
  const { slug } = useParams<{ slug: string }>()
  const [answers, setAnswers] = useState<Record<number, unknown>>({})
  const [errors, setErrors] = useState<Record<number, string>>({})
  const [submitted, setSubmitted] = useState(false)
  const [confirmMsg, setConfirmMsg] = useState('')
  const [currentPage, setCurrentPage] = useState(0)
  const submitRef = useRef(false)

  const { data: form, isLoading, error } = useQuery<Form>({
    queryKey: ['public-form', slug],
    queryFn: () => api.get(`/public/forms/${slug}`).then((r) => r.data),
    retry: false,
  })

  const submit = useMutation({
    mutationFn: (payload: { answers: Array<{ question_id: number; value_text?: string; value_json?: unknown }> }) =>
      api.post(`/public/forms/${slug}/submit`, payload),
    onSuccess: (resp) => {
      setSubmitted(true)
      setConfirmMsg(resp.data.message)
      submitRef.current = false
    },
    onError: () => { submitRef.current = false },
  })

  if (isLoading) return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full" />
    </div>
  )

  if (error || !form) return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center">
        <h2 className="text-xl font-semibold text-gray-700">Form not found</h2>
        <p className="text-muted-foreground mt-2">This form may not exist or is not published.</p>
      </div>
    </div>
  )

  if (submitted) return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
      <div className="bg-white rounded-lg border shadow-sm p-8 max-w-md w-full text-center">
        <CheckCircle2 className="h-16 w-16 text-green-500 mx-auto mb-4" />
        <h2 className="text-2xl font-bold mb-2">Response recorded</h2>
        <p className="text-muted-foreground">{confirmMsg}</p>
      </div>
    </div>
  )

  const questions = form.questions || []
  const settings = form.settings as unknown as Record<string, unknown>

  // Split questions into pages by page_break
  const pages: Question[][] = [[]]
  for (const q of questions) {
    if (q.type === 'page_break') { pages.push([]); continue }
    pages[pages.length - 1].push(q)
  }
  const pageQuestions = pages[currentPage] || []
  const totalPages = pages.length
  const showProgress = settings?.show_progress_bar !== false

  const validatePage = () => {
    const newErrors: Record<number, string> = {}
    for (const q of pageQuestions) {
      if (q.is_required) {
        const val = answers[q.id]
        if (val === undefined || val === null || val === '' || (Array.isArray(val) && val.length === 0)) {
          newErrors[q.id] = 'This field is required'
        }
      }
    }
    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleNext = () => {
    if (validatePage()) setCurrentPage((p) => p + 1)
  }

  const handleSubmit = () => {
    if (submitRef.current) return
    if (!validatePage()) return
    submitRef.current = true

    const payload = questions
      .filter((q) => !['section_header', 'page_break'].includes(q.type))
      .map((q) => {
        const val = answers[q.id]
        if (Array.isArray(val) || typeof val === 'object') {
          return { question_id: q.id, value_json: val }
        }
        return { question_id: q.id, value_text: val != null ? String(val) : undefined }
      })

    submit.mutate({ answers: payload })
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4">
      <div className="max-w-2xl mx-auto space-y-4">
        {/* Header card */}
        <div className="bg-white rounded-lg border shadow-sm overflow-hidden">
          <div className="h-3" style={{ backgroundColor: form.theme_color }} />
          <div className="p-6">
            <h1 className="text-2xl font-bold">{form.title}</h1>
            {form.description && <p className="text-muted-foreground mt-2">{form.description}</p>}
          </div>
        </div>

        {/* Progress bar */}
        {showProgress && totalPages > 1 && (
          <div className="bg-white rounded-lg border shadow-sm p-4">
            <div className="flex justify-between text-sm text-muted-foreground mb-2">
              <span>Page {currentPage + 1} of {totalPages}</span>
              <span>{Math.round(((currentPage + 1) / totalPages) * 100)}%</span>
            </div>
            <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
              <div
                className="h-full rounded-full transition-all"
                style={{ width: `${((currentPage + 1) / totalPages) * 100}%`, backgroundColor: form.theme_color }}
              />
            </div>
          </div>
        )}

        {/* Questions */}
        {pageQuestions.map((q) => (
          <div key={q.id} className="bg-white rounded-lg border shadow-sm p-6">
            <QuestionField
              question={q}
              value={answers[q.id] ?? null}
              onChange={(val) => setAnswers((prev) => ({ ...prev, [q.id]: val }))}
              error={errors[q.id]}
            />
          </div>
        ))}

        {/* Navigation */}
        <div className="flex justify-between">
          {currentPage > 0 && (
            <Button variant="outline" onClick={() => setCurrentPage((p) => p - 1)}>Back</Button>
          )}
          <div className="ml-auto">
            {currentPage < totalPages - 1 ? (
              <Button onClick={handleNext} style={{ backgroundColor: form.theme_color }}>Next</Button>
            ) : (
              <Button
                onClick={handleSubmit}
                disabled={submit.isPending}
                style={{ backgroundColor: form.theme_color }}
              >
                {submit.isPending ? 'Submitting...' : 'Submit'}
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
