import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { format } from 'date-fns'
import { Plus, FileText, MoreVertical, Eye, Edit, Copy, Trash2, BarChart2, LogOut, Globe, GlobeLock } from 'lucide-react'
import { useForms, useCreateForm, useDeleteForm, useDuplicateForm, usePublishForm } from '@/hooks/useForms'
import { useLogout } from '@/hooks/useAuth'
import { useAuthStore } from '@/stores/authStore'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardFooter, CardHeader } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription
} from '@/components/ui/dialog'
import { useToast } from '@/hooks/useToast'
import type { Form } from '@/types'

export default function DashboardPage() {
  const navigate = useNavigate()
  const { user } = useAuthStore()
  const { data: forms, isLoading } = useForms()
  const createForm = useCreateForm()
  const deleteForm = useDeleteForm()
  const duplicateForm = useDuplicateForm()
  const publishForm = usePublishForm()
  const logout = useLogout()
  const { toast } = useToast()
  const [deleteConfirm, setDeleteConfirm] = useState<Form | null>(null)

  const handleCreate = async () => {
    const form = await createForm.mutateAsync({})
    navigate(`/builder/${form.id}`)
  }

  const handleDelete = async () => {
    if (!deleteConfirm) return
    await deleteForm.mutateAsync(deleteConfirm.id)
    setDeleteConfirm(null)
    toast({ title: 'Form deleted', variant: 'default' })
  }

  const handleShare = (form: Form) => {
    const url = `${window.location.origin}/f/${form.uuid_slug}`
    navigator.clipboard.writeText(url)
    toast({ title: 'Link copied!', description: url, variant: 'success' as never })
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b shadow-sm">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <FileText className="h-7 w-7 text-primary" />
            <span className="text-xl font-bold text-gray-900">Forms Clone</span>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-sm text-muted-foreground hidden sm:block">{user?.name}</span>
            <Button variant="ghost" size="sm" onClick={() => logout.mutate()}>
              <LogOut className="h-4 w-4 mr-1" /> Sign out
            </Button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">My Forms</h1>
            <p className="text-muted-foreground text-sm mt-1">Create and manage your forms</p>
          </div>
          <Button onClick={handleCreate} disabled={createForm.isPending}>
            <Plus className="h-4 w-4 mr-2" />
            New Form
          </Button>
        </div>

        {isLoading && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {[1, 2, 3].map((i) => (
              <Card key={i} className="animate-pulse">
                <CardHeader><div className="h-5 bg-gray-200 rounded w-3/4" /></CardHeader>
                <CardContent><div className="h-4 bg-gray-100 rounded w-1/2" /></CardContent>
              </Card>
            ))}
          </div>
        )}

        {!isLoading && forms?.length === 0 && (
          <div className="text-center py-20">
            <FileText className="h-16 w-16 text-gray-300 mx-auto mb-4" />
            <h2 className="text-xl font-semibold text-gray-500 mb-2">No forms yet</h2>
            <p className="text-muted-foreground mb-6">Create your first form to get started</p>
            <Button onClick={handleCreate}>
              <Plus className="h-4 w-4 mr-2" /> Create Form
            </Button>
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {forms?.map((form) => (
            <Card key={form.id} className="hover:shadow-md transition-shadow group">
              <div className="h-2 rounded-t-lg" style={{ backgroundColor: form.theme_color }} />
              <CardHeader className="pb-2">
                <div className="flex items-start justify-between">
                  <h3 className="font-semibold text-gray-900 line-clamp-2 flex-1">{form.title}</h3>
                  <FormMenu
                    form={form}
                    onEdit={() => navigate(`/builder/${form.id}`)}
                    onView={() => navigate(`/forms/${form.id}/responses`)}
                    onShare={() => handleShare(form)}
                    onDuplicate={() => duplicateForm.mutate(form.id)}
                    onDelete={() => setDeleteConfirm(form)}
                    onPublish={() => publishForm.mutate(form.id)}
                  />
                </div>
                <div className="flex items-center gap-2 mt-1">
                  {form.is_published
                    ? <Badge variant="success"><Globe className="h-3 w-3 mr-1" />Published</Badge>
                    : <Badge variant="secondary"><GlobeLock className="h-3 w-3 mr-1" />Draft</Badge>
                  }
                </div>
              </CardHeader>
              <CardContent className="pt-0 pb-3">
                <div className="flex gap-4 text-xs text-muted-foreground">
                  <span>{form.question_count} questions</span>
                  <span>{form.response_count} responses</span>
                </div>
              </CardContent>
              <CardFooter className="pt-0 pb-3">
                <p className="text-xs text-muted-foreground">
                  Updated {format(new Date(form.updated_at), 'MMM d, yyyy')}
                </p>
              </CardFooter>
            </Card>
          ))}
        </div>
      </main>

      <Dialog open={!!deleteConfirm} onOpenChange={() => setDeleteConfirm(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete form</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete "{deleteConfirm?.title}"? This will also delete all responses. This cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <div className="flex justify-end gap-3 mt-4">
            <Button variant="outline" onClick={() => setDeleteConfirm(null)}>Cancel</Button>
            <Button variant="destructive" onClick={handleDelete} disabled={deleteForm.isPending}>
              Delete
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}

function FormMenu({ form, onEdit, onView, onShare, onDuplicate, onDelete, onPublish }: {
  form: Form
  onEdit: () => void
  onView: () => void
  onShare: () => void
  onDuplicate: () => void
  onDelete: () => void
  onPublish: () => void
}) {
  const [open, setOpen] = useState(false)

  return (
    <div className="relative">
      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setOpen(!open)}>
        <MoreVertical className="h-4 w-4" />
      </Button>
      {open && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
          <div className="absolute right-0 top-8 z-20 bg-white border rounded-md shadow-lg w-48 py-1">
            {[
              { icon: Edit, label: 'Edit', action: onEdit },
              { icon: Eye, label: 'View responses', action: onView },
              { icon: Globe, label: form.is_published ? 'Unpublish' : 'Publish', action: onPublish },
              { icon: Copy, label: 'Copy link', action: onShare },
              { icon: Copy, label: 'Duplicate', action: onDuplicate },
              { icon: Trash2, label: 'Delete', action: onDelete, danger: true },
            ].map(({ icon: Icon, label, action, danger }) => (
              <button
                key={label}
                className={`w-full flex items-center gap-2 px-4 py-2 text-sm hover:bg-gray-50 ${danger ? 'text-destructive' : 'text-gray-700'}`}
                onClick={() => { action(); setOpen(false) }}
              >
                <Icon className="h-4 w-4" /> {label}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  )
}
