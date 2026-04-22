import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Star } from 'lucide-react'
import type { Question } from '@/types'

interface Props {
  question: Question
  value: unknown
  onChange: (value: unknown) => void
  error?: string
}

export function QuestionField({ question, value, onChange, error }: Props) {
  const opts = (question.options as string[]) || []
  const validation = question.validation as Record<string, unknown>

  const labelEl = (
    <div className="mb-3">
      <p className="font-medium text-gray-900">
        {question.label || <span className="italic text-muted-foreground">Untitled question</span>}
        {question.is_required && <span className="text-destructive ml-1">*</span>}
      </p>
      {question.help_text && <p className="text-sm text-muted-foreground mt-0.5">{question.help_text}</p>}
    </div>
  )

  if (question.type === 'section_header') {
    return (
      <div className="border-l-4 pl-4" style={{ borderColor: '#6366f1' }}>
        <h2 className="text-lg font-semibold">{question.label}</h2>
        {question.help_text && <p className="text-sm text-muted-foreground">{question.help_text}</p>}
      </div>
    )
  }

  if (question.type === 'page_break') {
    return <div className="border-t-2 border-dashed border-gray-200 py-2 text-center text-xs text-muted-foreground">— Page Break —</div>
  }

  return (
    <div>
      {labelEl}
      {renderInput(question, opts, validation, value, onChange)}
      {error && <p className="text-xs text-destructive mt-1">{error}</p>}
    </div>
  )
}

function renderInput(
  question: Question,
  opts: string[],
  validation: Record<string, unknown>,
  value: unknown,
  onChange: (v: unknown) => void
) {
  switch (question.type) {
    case 'short_answer':
    case 'email':
    case 'phone':
    case 'url':
      return (
        <Input
          type={question.type === 'email' ? 'email' : question.type === 'url' ? 'url' : 'text'}
          value={(value as string) || ''}
          onChange={(e) => onChange(e.target.value)}
          placeholder={question.type === 'email' ? 'email@example.com' : question.type === 'url' ? 'https://' : 'Your answer'}
        />
      )
    case 'long_answer':
      return (
        <Textarea
          value={(value as string) || ''}
          onChange={(e) => onChange(e.target.value)}
          placeholder="Your answer"
          rows={4}
          maxLength={validation.max_length as number}
        />
      )
    case 'number':
      return (
        <Input
          type="number"
          value={(value as string) || ''}
          onChange={(e) => onChange(e.target.value)}
          min={validation.min as number}
          max={validation.max as number}
          placeholder="0"
        />
      )
    case 'multiple_choice':
      return (
        <div className="space-y-2">
          {opts.map((opt) => (
            <label key={opt} className="flex items-center gap-3 cursor-pointer">
              <input
                type="radio"
                name={`q-${question.id}`}
                value={opt}
                checked={value === opt}
                onChange={() => onChange(opt)}
                className="h-4 w-4 text-primary"
              />
              <span className="text-sm">{opt}</span>
            </label>
          ))}
        </div>
      )
    case 'checkboxes':
      return (
        <div className="space-y-2">
          {opts.map((opt) => (
            <label key={opt} className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                value={opt}
                checked={((value as string[]) || []).includes(opt)}
                onChange={(e) => {
                  const arr = (value as string[]) || []
                  onChange(e.target.checked ? [...arr, opt] : arr.filter((v) => v !== opt))
                }}
                className="h-4 w-4 rounded text-primary"
              />
              <span className="text-sm">{opt}</span>
            </label>
          ))}
        </div>
      )
    case 'dropdown':
      return (
        <select
          value={(value as string) || ''}
          onChange={(e) => onChange(e.target.value)}
          className="w-full h-10 rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
        >
          <option value="">Select an option</option>
          {opts.map((opt) => <option key={opt} value={opt}>{opt}</option>)}
        </select>
      )
    case 'linear_scale': {
      const scaleMin = (validation.min as number) ?? 1
      const scaleMax = (validation.max as number) ?? 5
      const range = Array.from({ length: scaleMax - scaleMin + 1 }, (_, i) => scaleMin + i)
      return (
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            {!!validation.min_label && <span className="text-xs text-muted-foreground">{String(validation.min_label)}</span>}
            <div className="flex gap-2 flex-1 justify-between">
              {range.map((n) => (
                <label key={n} className="flex flex-col items-center gap-1 cursor-pointer">
                  <input
                    type="radio"
                    name={`scale-${question.id}`}
                    value={n}
                    checked={value === n}
                    onChange={() => onChange(n)}
                    className="h-4 w-4 text-primary"
                  />
                  <span className="text-xs">{n}</span>
                </label>
              ))}
            </div>
            {!!validation.max_label && <span className="text-xs text-muted-foreground">{String(validation.max_label)}</span>}
          </div>
        </div>
      )
    }
    case 'rating': {
      const max = (validation.max as number) ?? 5
      return (
        <div className="flex gap-1">
          {Array.from({ length: max }, (_, i) => i + 1).map((n) => (
            <button
              key={n}
              type="button"
              onClick={() => onChange(n)}
              className="focus:outline-none"
            >
              <Star
                className={`h-8 w-8 transition-colors ${(value as number) >= n ? 'fill-yellow-400 text-yellow-400' : 'text-gray-300'}`}
              />
            </button>
          ))}
        </div>
      )
    }
    case 'date':
      return <Input type="date" value={(value as string) || ''} onChange={(e) => onChange(e.target.value)} />
    case 'time':
      return <Input type="time" value={(value as string) || ''} onChange={(e) => onChange(e.target.value)} />
    case 'datetime':
      return <Input type="datetime-local" value={(value as string) || ''} onChange={(e) => onChange(e.target.value)} />
    default:
      return <Input value={(value as string) || ''} onChange={(e) => onChange(e.target.value)} />
  }
}
