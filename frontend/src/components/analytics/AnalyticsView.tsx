import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from 'recharts'
import type { Analytics, AnalyticsQuestion } from '@/types'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'

const COLORS = ['#6366f1', '#8b5cf6', '#a78bfa', '#c4b5fd', '#ddd6fe', '#ede9fe', '#10b981', '#f59e0b', '#ef4444', '#3b82f6']

interface Props { analytics: Analytics }

export function AnalyticsView({ analytics }: Props) {
  return (
    <div className="space-y-4">
      <div className="bg-white rounded-lg border shadow-sm p-4 flex items-center gap-4">
        <div>
          <p className="text-3xl font-bold">{analytics.total_responses}</p>
          <p className="text-sm text-muted-foreground">Total responses</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {analytics.questions.map((q) => (
          <QuestionChart key={q.question_id} question={q} />
        ))}
      </div>
    </div>
  )
}

function QuestionChart({ question: q }: { question: AnalyticsQuestion }) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium text-gray-700 line-clamp-2">{q.label || 'Untitled'}</CardTitle>
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="text-xs capitalize">{q.type.replace(/_/g, ' ')}</Badge>
          <span className="text-xs text-muted-foreground">{q.total_answers} answers</span>
        </div>
      </CardHeader>
      <CardContent>
        {q.chart === 'bar' && q.data.length > 0 && (
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={q.data as Array<{ label: string; count: number }>} margin={{ top: 5, right: 5, bottom: 20, left: 0 }}>
              <XAxis dataKey="label" tick={{ fontSize: 11 }} angle={-20} textAnchor="end" />
              <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
              <Tooltip />
              <Bar dataKey="count" fill="#6366f1" radius={[4, 4, 0, 0]}>
                {(q.data as Array<{ label: string; count: number }>).map((_, i) => (
                  <Cell key={i} fill={COLORS[i % COLORS.length]} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        )}

        {q.chart === 'text' && (
          <div className="space-y-1 max-h-48 overflow-y-auto">
            {(q.data as string[]).slice(0, 20).map((text, i) => (
              <p key={i} className="text-sm bg-gray-50 rounded px-2 py-1 truncate">"{text}"</p>
            ))}
            {(q.data as string[]).length > 20 && (
              <p className="text-xs text-muted-foreground">+{(q.data as string[]).length - 20} more</p>
            )}
          </div>
        )}

        {q.chart === 'histogram' && (
          <div className="space-y-2">
            <p className="text-sm">Average: <span className="font-semibold">{q.avg?.toFixed(2)}</span></p>
            <ResponsiveContainer width="100%" height={150}>
              <BarChart data={(q.data as number[]).map((v, i) => ({ value: v, idx: i }))}>
                <XAxis dataKey="value" tick={{ fontSize: 10 }} />
                <YAxis tick={{ fontSize: 10 }} />
                <Tooltip />
                <Bar dataKey="value" fill="#6366f1" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}

        {q.chart === 'none' && (
          <p className="text-sm text-muted-foreground italic">No chart available for this question type.</p>
        )}

        {q.data.length === 0 && q.chart !== 'none' && (
          <p className="text-sm text-muted-foreground italic">No data yet.</p>
        )}
      </CardContent>
    </Card>
  )
}
