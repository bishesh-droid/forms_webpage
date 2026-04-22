import { useEffect, useRef, useCallback, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import {
  DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors,
  type DragEndEvent,
} from '@dnd-kit/core'
import {
  arrayMove, SortableContext, sortableKeyboardCoordinates, verticalListSortingStrategy,
  useSortable,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { ArrowLeft, Plus, Eye, EyeOff, Globe, GlobeLock, Save, GripVertical, Trash2, Copy } from 'lucide-react'
import { useForm } from '@/hooks/useForms'
import { useUpdateForm, usePublishForm } from '@/hooks/useForms'
import { useCreateQuestion, useUpdateQuestion, useDeleteQuestion, useReorderQuestions } from '@/hooks/useQuestions'
import { useBuilderStore } from '@/stores/builderStore'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
import { useToast } from '@/hooks/useToast'
import { QuestionEditor } from '@/components/builder/QuestionEditor'
import { FormPreview } from '@/components/builder/FormPreview'
import type { Question, QuestionType } from '@/types'
import { api } from '@/lib/api'

const QUESTION_TYPES: { type: QuestionType; label: string }[] = [
  { type: 'short_answer', label: 'Short Answer' },
  { type: 'long_answer', label: 'Long Answer' },
  { type: 'multiple_choice', label: 'Multiple Choice' },
  { type: 'checkboxes', label: 'Checkboxes' },
  { type: 'dropdown', label: 'Dropdown' },
  { type: 'linear_scale', label: 'Linear Scale' },
  { type: 'rating', label: 'Rating' },
  { type: 'number', label: 'Number' },
  { type: 'email', label: 'Email' },
  { type: 'phone', label: 'Phone' },
  { type: 'url', label: 'URL' },
  { type: 'date', label: 'Date' },
  { type: 'time', label: 'Time' },
  { type: 'section_header', label: 'Section Header' },
  { type: 'page_break', label: 'Page Break' },
]

export default function BuilderPage() {
  const { id } = useParams<{ id: string }>()
  const formId = parseInt(id!)
  const navigate = useNavigate()
  const { toast } = useToast()

  const { data: formData, isLoading } = useForm(formId)
  const updateForm = useUpdateForm()
  const publishForm = usePublishForm()
  const createQuestion = useCreateQuestion(formId)
  const updateQuestion = useUpdateQuestion(formId)
  const deleteQuestion = useDeleteQuestion(formId)
  const reorderQuestions = useReorderQuestions(formId)

  const { form, questions, selectedQuestionId, isDirty, isSaving, lastSaved, setForm, setQuestions, setSelectedQuestion, updateQuestion: updateLocalQuestion, setDirty, setSaving, setLastSaved } = useBuilderStore()

  const [showPreview, setShowPreview] = useState(false)
  const [localTitle, setLocalTitle] = useState('')
  const [localDesc, setLocalDesc] = useState('')
  const autosaveRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    if (formData) {
      setForm(formData)
      setQuestions(formData.questions || [])
      setLocalTitle(formData.title)
      setLocalDesc(formData.description)
    }
  }, [formData])

  const triggerAutosave = useCallback(() => {
    setDirty(true)
    if (autosaveRef.current) clearTimeout(autosaveRef.current)
    autosaveRef.current = setTimeout(async () => {
      setSaving(true)
      try {
        await updateForm.mutateAsync({ id: formId, data: { title: localTitle, description: localDesc } })
        setLastSaved(new Date())
      } finally {
        setSaving(false)
      }
    }, 3000)
  }, [formId, localTitle, localDesc])

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  )

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event
    if (!over || active.id === over.id) return
    const oldIndex = questions.findIndex((q) => q.id === active.id)
    const newIndex = questions.findIndex((q) => q.id === over.id)
    const newOrder = arrayMove(questions, oldIndex, newIndex)
    setQuestions(newOrder)
    await reorderQuestions.mutateAsync(newOrder.map((q) => q.id))
  }

  const handleAddQuestion = async (type: QuestionType) => {
    const q = await createQuestion.mutateAsync({
      type,
      label: '',
      is_required: false,
      options: type === 'multiple_choice' || type === 'checkboxes' || type === 'dropdown' ? ['Option 1'] : [],
    } as Partial<Question>)
    setQuestions([...questions, q])
    setSelectedQuestion(q.id)
  }

  if (isLoading) return <div className="min-h-screen flex items-center justify-center"><div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full" /></div>

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Toolbar */}
      <header className="bg-white border-b shadow-sm sticky top-0 z-30">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate('/dashboard')}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <input
            className="flex-1 text-lg font-semibold bg-transparent border-none outline-none focus:ring-0 max-w-sm"
            value={localTitle}
            onChange={(e) => { setLocalTitle(e.target.value); triggerAutosave() }}
            placeholder="Untitled Form"
          />
          <div className="ml-auto flex items-center gap-2">
            <span className="text-xs text-muted-foreground hidden sm:block">
              {isSaving ? 'Saving...' : lastSaved ? `Saved ${lastSaved.toLocaleTimeString()}` : isDirty ? 'Unsaved' : ''}
            </span>
            <Button variant="outline" size="sm" onClick={() => setShowPreview(!showPreview)}>
              {showPreview ? <><EyeOff className="h-4 w-4 mr-1" />Edit</> : <><Eye className="h-4 w-4 mr-1" />Preview</>}
            </Button>
            <Button
              size="sm"
              variant={form?.is_published ? 'outline' : 'default'}
              onClick={() => publishForm.mutate(formId)}
            >
              {form?.is_published
                ? <><GlobeLock className="h-4 w-4 mr-1" />Unpublish</>
                : <><Globe className="h-4 w-4 mr-1" />Publish</>
              }
            </Button>
            {form?.is_published && (
              <Button variant="ghost" size="sm" onClick={() => {
                navigator.clipboard.writeText(`${window.location.origin}/f/${form.uuid_slug}`)
                toast({ title: 'Link copied!' })
              }}>
                Copy link
              </Button>
            )}
          </div>
        </div>
      </header>

      <div className="flex flex-1 max-w-7xl mx-auto w-full px-4 py-6 gap-6">
        {/* Main editor */}
        <div className={`flex-1 min-w-0 ${showPreview ? 'hidden lg:block lg:w-1/2' : ''}`}>
          {/* Form header card */}
          <div className="bg-white rounded-lg border shadow-sm mb-4 overflow-hidden">
            <div className="h-3" style={{ backgroundColor: form?.theme_color || '#6366f1' }} />
            <div className="p-6 space-y-4">
              <input
                className="w-full text-2xl font-bold bg-transparent border-none outline-none focus:ring-0 border-b-2 border-transparent focus:border-primary pb-1"
                value={localTitle}
                onChange={(e) => { setLocalTitle(e.target.value); triggerAutosave() }}
                placeholder="Form Title"
              />
              <textarea
                className="w-full text-sm text-muted-foreground bg-transparent border-none outline-none focus:ring-0 resize-none border-b border-transparent focus:border-input"
                value={localDesc}
                onChange={(e) => { setLocalDesc(e.target.value); triggerAutosave() }}
                placeholder="Form description (optional)"
                rows={2}
              />
            </div>
          </div>

          {/* Questions */}
          <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
            <SortableContext items={questions.map((q) => q.id)} strategy={verticalListSortingStrategy}>
              <div className="space-y-3">
                {questions.map((q) => (
                  <SortableQuestion
                    key={q.id}
                    question={q}
                    isSelected={selectedQuestionId === q.id}
                    onSelect={() => setSelectedQuestion(q.id === selectedQuestionId ? null : q.id)}
                    onUpdate={async (data) => {
                      updateLocalQuestion(q.id, data)
                      await updateQuestion.mutateAsync({ id: q.id, data })
                    }}
                    onDelete={async () => {
                      await deleteQuestion.mutateAsync(q.id)
                      setQuestions(questions.filter((x) => x.id !== q.id))
                      if (selectedQuestionId === q.id) setSelectedQuestion(null)
                    }}
                    onDuplicate={async () => {
                      const newQ = await createQuestion.mutateAsync({
                        type: q.type as QuestionType,
                        label: `${q.label} (copy)`,
                        help_text: q.help_text,
                        is_required: q.is_required,
                        options: q.options,
                        validation: q.validation,
                        logic: q.logic,
                      } as Partial<Question>)
                      setQuestions([...questions, newQ])
                    }}
                  />
                ))}
              </div>
            </SortableContext>
          </DndContext>

          {/* Add question */}
          <div className="mt-4 bg-white rounded-lg border shadow-sm p-4">
            <p className="text-sm font-medium text-muted-foreground mb-3">Add question</p>
            <div className="flex flex-wrap gap-2">
              {QUESTION_TYPES.map(({ type, label }) => (
                <button
                  key={type}
                  onClick={() => handleAddQuestion(type)}
                  className="text-xs px-3 py-1.5 rounded-full border hover:bg-primary hover:text-white hover:border-primary transition-colors"
                >
                  {label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Preview pane */}
        {showPreview && (
          <div className="flex-1 min-w-0">
            <FormPreview
              title={localTitle}
              description={localDesc}
              questions={questions}
              themeColor={form?.theme_color || '#6366f1'}
            />
          </div>
        )}
      </div>
    </div>
  )
}

function SortableQuestion({ question, isSelected, onSelect, onUpdate, onDelete, onDuplicate }: {
  question: Question
  isSelected: boolean
  onSelect: () => void
  onUpdate: (data: Partial<Question>) => void
  onDelete: () => void
  onDuplicate: () => void
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: question.id })
  const style = { transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.5 : 1 }

  return (
    <div ref={setNodeRef} style={style} className={`bg-white rounded-lg border shadow-sm ${isSelected ? 'ring-2 ring-primary border-primary' : 'hover:border-gray-300'}`}>
      <div className="flex items-center gap-2 p-3 cursor-pointer" onClick={onSelect}>
        <button {...attributes} {...listeners} className="cursor-grab text-gray-400 hover:text-gray-600" onClick={(e) => e.stopPropagation()}>
          <GripVertical className="h-5 w-5" />
        </button>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium truncate">{question.label || <span className="text-muted-foreground italic">Untitled question</span>}</p>
          <p className="text-xs text-muted-foreground capitalize">{question.type.replace(/_/g, ' ')}</p>
        </div>
        <div className="flex items-center gap-1">
          {question.is_required && <Badge variant="secondary" className="text-xs">Required</Badge>}
          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={(e) => { e.stopPropagation(); onDuplicate() }}>
            <Copy className="h-3.5 w-3.5" />
          </Button>
          <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:text-destructive" onClick={(e) => { e.stopPropagation(); onDelete() }}>
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>
      {isSelected && (
        <div className="border-t p-4">
          <QuestionEditor question={question} onUpdate={onUpdate} />
        </div>
      )}
    </div>
  )
}
