import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api'
import type { Form } from '@/types'

export function useForms() {
  return useQuery<Form[]>({
    queryKey: ['forms'],
    queryFn: () => api.get('/forms').then((r) => r.data),
  })
}

export function useForm(id: number | undefined) {
  return useQuery<Form>({
    queryKey: ['forms', id],
    queryFn: () => api.get(`/forms/${id}`).then((r) => r.data),
    enabled: !!id,
  })
}

export function useCreateForm() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: Partial<Form>) => api.post('/forms', data).then((r) => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['forms'] }),
  })
}

export function useUpdateForm() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: Partial<Form> }) => api.patch(`/forms/${id}`, data).then((r) => r.data),
    onSuccess: (_, { id }) => {
      qc.invalidateQueries({ queryKey: ['forms'] })
      qc.invalidateQueries({ queryKey: ['forms', id] })
    },
  })
}

export function useDeleteForm() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: number) => api.delete(`/forms/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['forms'] }),
  })
}

export function useDuplicateForm() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: number) => api.post(`/forms/${id}/duplicate`).then((r) => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['forms'] }),
  })
}

export function usePublishForm() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: number) => api.post(`/forms/${id}/publish`).then((r) => r.data),
    onSuccess: (_, id) => {
      qc.invalidateQueries({ queryKey: ['forms'] })
      qc.invalidateQueries({ queryKey: ['forms', id] })
    },
  })
}
