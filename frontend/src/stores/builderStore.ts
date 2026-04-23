import { create } from 'zustand'
import type { Form, Question } from '@/types'

interface BuilderState {
  form: Form | null
  questions: Question[]
  selectedQuestionId: number | null
  isDirty: boolean
  isSaving: boolean
  lastSaved: Date | null
  setForm: (form: Form) => void
  setQuestions: (questions: Question[]) => void
  setSelectedQuestion: (id: number | null) => void
  updateQuestion: (id: number, data: Partial<Question>) => void
  setDirty: (dirty: boolean) => void
  setSaving: (saving: boolean) => void
  setLastSaved: (date: Date) => void
}

export const useBuilderStore = create<BuilderState>((set) => ({
  form: null,
  questions: [],
  selectedQuestionId: null,
  isDirty: false,
  isSaving: false,
  lastSaved: null,
  setForm: (form) => set({ form }),
  setQuestions: (questions) => set({ questions }),
  setSelectedQuestion: (id) => set({ selectedQuestionId: id }),
  updateQuestion: (id, data) =>
    set((state) => ({
      questions: state.questions.map((q) => (q.id === id ? { ...q, ...data } : q)),
      isDirty: true,
    })),
  setDirty: (isDirty) => set({ isDirty }),
  setSaving: (isSaving) => set({ isSaving }),
  setLastSaved: (lastSaved) => set({ lastSaved, isDirty: false }),
}))
