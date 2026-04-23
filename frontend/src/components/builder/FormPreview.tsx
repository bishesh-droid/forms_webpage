import type { Question } from '@/types'
import { QuestionField } from '@/components/respondent/QuestionField'

interface Props {
  title: string
  description: string
  questions: Question[]
  themeColor: string
}

export function FormPreview({ title, description, questions, themeColor }: Props) {
  return (
    <div className="space-y-4 pointer-events-none select-none">
      <div className="bg-white rounded-lg border shadow-sm overflow-hidden">
        <div className="h-3" style={{ backgroundColor: themeColor }} />
        <div className="p-6">
          <h1 className="text-2xl font-bold">{title || 'Untitled Form'}</h1>
          {description && <p className="text-muted-foreground mt-2">{description}</p>}
        </div>
      </div>
      {questions.map((q) => (
        <div key={q.id} className="bg-white rounded-lg border shadow-sm p-6">
          <QuestionField question={q} value={null} onChange={() => {}} error={undefined} />
        </div>
      ))}
    </div>
  )
}
