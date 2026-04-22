import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { api } from '@/lib/api'
import { useAuthStore } from '@/stores/authStore'

export function useMe() {
  return useQuery({
    queryKey: ['me'],
    queryFn: () => api.get('/auth/me').then((r) => r.data),
    retry: false,
  })
}

export function useLogin() {
  const { setAuth } = useAuthStore()
  const navigate = useNavigate()
  return useMutation({
    mutationFn: (creds: { email: string; password: string }) => api.post('/auth/login', creds),
    onSuccess: async (resp) => {
      const { access_token, refresh_token } = resp.data
      const me = await api.get('/auth/me', { headers: { Authorization: `Bearer ${access_token}` } })
      setAuth(me.data, access_token, refresh_token)
      navigate('/dashboard')
    },
  })
}

export function useRegister() {
  const navigate = useNavigate()
  return useMutation({
    mutationFn: (data: { email: string; password: string; name: string }) => api.post('/auth/register', data),
    onSuccess: () => navigate('/login'),
  })
}

export function useLogout() {
  const { clearAuth } = useAuthStore()
  const qc = useQueryClient()
  const navigate = useNavigate()
  return useMutation({
    mutationFn: () => api.post('/auth/logout'),
    onSettled: () => {
      clearAuth()
      qc.clear()
      navigate('/login')
    },
  })
}
