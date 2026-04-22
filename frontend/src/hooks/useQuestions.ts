import { useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api'
import type { Question } from '@/types'

export function useCreateQuestion(formId: number) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: Partial<Question>) => api.post(`/forms/${formId}/questions`, data).then((r) => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['forms', formId] }),
  })
}

export function useUpdateQuestion(formId: number) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: Partial<Question> }) =>
      api.patch(`/questions/${id}`, data).then((r) => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['forms', formId] }),
  })
}

export function useDeleteQuestion(formId: number) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: number) => api.delete(`/questions/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['forms', formId] }),
  })
}

export function useReorderQuestions(formId: number) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (order: number[]) => api.post(`/forms/${formId}/questions/reorder`, { order }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['forms', formId] }),
  })
}
