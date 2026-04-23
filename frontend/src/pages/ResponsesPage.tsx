import { useState } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { format } from 'date-fns'
import { ArrowLeft, Download, Trash2, BarChart2, Table, RefreshCw } from 'lucide-react'
import { api } from '@/lib/api'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { useToast } from '@/hooks/useToast'
import type { PaginatedResponses, Analytics, Form } from '@/types'
import { AnalyticsView } from '@/components/analytics/AnalyticsView'

export default function ResponsesPage() {
  const { id } = useParams<{ id: string }>()
  const formId = parseInt(id!)
  const navigate = useNavigate()
  const qc = useQueryClient()
  const { toast } = useToast()
  const [page, setPage] = useState(1)
  const [tab, setTab] = useState<'table' | 'analytics'>('table')

  const { data: form } = useQuery<Form>({
    queryKey: ['forms', formId],
    queryFn: () => api.get(`/forms/${formId}`).then((r) => r.data),
  })

  const { data, isLoading, refetch } = useQuery<PaginatedResponses>({
    queryKey: ['responses', formId, page],
    queryFn: () => api.get(`/forms/${formId}/responses?page=${page}&limit=20`).then((r) => r.data),
  })

  const { data: analytics } = useQuery<Analytics>({
    queryKey: ['analytics', formId],
    queryFn: () => api.get(`/forms/${formId}/analytics`).then((r) => r.data),
    enabled: tab === 'analytics',
  })

  const deleteResp = useMutation({
    mutationFn: (rid: number) => api.delete(`/responses/${rid}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['responses', formId] })
      toast({ title: 'Response deleted' })
    },
  })

  const handleExport = async (fmt: 'csv' | 'json' | 'xlsx') => {
    const resp = await api.get(`/forms/${formId}/export?format=${fmt}`, { responseType: 'blob' })
    const url = URL.createObjectURL(resp.data)
    const a = document.createElement('a')
    a.href = url
    a.download = `responses_${formId}.${fmt}`
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b shadow-sm">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate('/dashboard')}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="flex-1">
            <h1 className="font-semibold text-lg">{form?.title || 'Responses'}</h1>
            <p className="text-xs text-muted-foreground">{data?.total ?? 0} total responses</p>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => refetch()}>
              <RefreshCw className="h-4 w-4 mr-1" /> Refresh
            </Button>
            <div className="flex items-center gap-1">
              {(['csv', 'json', 'xlsx'] as const).map((fmt) => (
                <Button key={fmt} variant="outline" size="sm" onClick={() => handleExport(fmt)}>
                  <Download className="h-3.5 w-3.5 mr-1" /> {fmt.toUpperCase()}
                </Button>
              ))}
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-6">
        {/* Tabs */}
        <div className="flex gap-2 mb-6">
          <Button
            variant={tab === 'table' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setTab('table')}
          >
            <Table className="h-4 w-4 mr-1" /> Responses
          </Button>
          <Button
            variant={tab === 'analytics' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setTab('analytics')}
          >
            <BarChart2 className="h-4 w-4 mr-1" /> Summary
          </Button>
        </div>

        {tab === 'analytics' && analytics && <AnalyticsView analytics={analytics} />}

        {tab === 'table' && (
          <>
            {isLoading && <div className="text-center py-10 text-muted-foreground">Loading...</div>}
            {!isLoading && data?.items.length === 0 && (
              <div className="text-center py-16">
                <p className="text-xl font-semibold text-gray-400">No responses yet</p>
                {form?.is_published && (
                  <p className="text-sm text-muted-foreground mt-2">
                    Share your form: <span className="font-mono text-primary">{window.location.origin}/f/{form.uuid_slug}</span>
                  </p>
                )}
              </div>
            )}

            <div className="space-y-3">
              {data?.items.map((resp, idx) => (
                <Card key={resp.id}>
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-sm font-medium">
                        Response #{(page - 1) * 20 + idx + 1}
                        <span className="ml-2 text-muted-foreground font-normal text-xs">
                          {format(new Date(resp.submitted_at), 'MMM d, yyyy HH:mm')}
                        </span>
                      </CardTitle>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 text-destructive hover:text-destructive"
                        onClick={() => deleteResp.mutate(resp.id)}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      {resp.answers.map((ans) => {
                        const q = form?.questions?.find((q) => q.id === ans.question_id)
                        const displayVal = ans.value_json != null
                          ? JSON.stringify(ans.value_json)
                          : ans.value_text || '—'
                        return (
                          <div key={ans.id} className="grid grid-cols-3 gap-2 text-sm">
                            <span className="text-muted-foreground truncate">{q?.label || `Q${ans.question_id}`}</span>
                            <span className="col-span-2 font-medium">{displayVal}</span>
                          </div>
                        )
                      })}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            {data && data.pages > 1 && (
              <div className="flex justify-center gap-2 mt-6">
                <Button variant="outline" size="sm" disabled={page === 1} onClick={() => setPage(p => p - 1)}>Previous</Button>
                <span className="flex items-center text-sm text-muted-foreground px-3">
                  Page {page} of {data.pages}
                </span>
                <Button variant="outline" size="sm" disabled={page === data.pages} onClick={() => setPage(p => p + 1)}>Next</Button>
              </div>
            )}
          </>
        )}
      </main>
    </div>
  )
}
