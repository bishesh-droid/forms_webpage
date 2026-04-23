import { useState } from 'react'
import { Plus, X } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Button } from '@/components/ui/button'
import type { Question } from '@/types'

interface Props {
  question: Question
  onUpdate: (data: Partial<Question>) => void
}

export function QuestionEditor({ question, onUpdate }: Props) {
  const options = (question.options as string[]) || []
  const validation = question.validation as Record<string, unknown>

  const updateOption = (idx: number, value: string) => {
    const newOpts = [...options]
    newOpts[idx] = value
    onUpdate({ options: newOpts })
  }

  const addOption = () => onUpdate({ options: [...options, `Option ${options.length + 1}`] })
  const removeOption = (idx: number) => onUpdate({ options: options.filter((_, i) => i !== idx) })

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label>Question label</Label>
        <Input
          value={question.label}
          onChange={(e) => onUpdate({ label: e.target.value })}
          placeholder="Enter your question..."
        />
      </div>

      <div className="space-y-2">
        <Label>Help text <span className="text-muted-foreground text-xs">(optional)</span></Label>
        <Input
          value={question.help_text}
          onChange={(e) => onUpdate({ help_text: e.target.value })}
          placeholder="Add description or instructions..."
        />
      </div>

      {/* Options for choice-based questions */}
      {['multiple_choice', 'checkboxes', 'dropdown'].includes(question.type) && (
        <div className="space-y-2">
          <Label>Options</Label>
          {options.map((opt, idx) => (
            <div key={idx} className="flex items-center gap-2">
              <div className="flex-shrink-0 w-4 h-4 rounded-full border-2 border-gray-300" />
              <Input
                value={opt}
                onChange={(e) => updateOption(idx, e.target.value)}
                placeholder={`Option ${idx + 1}`}
                className="flex-1"
              />
              <Button variant="ghost" size="icon" className="h-7 w-7 flex-shrink-0" onClick={() => removeOption(idx)}>
                <X className="h-3.5 w-3.5" />
              </Button>
            </div>
          ))}
          <Button variant="ghost" size="sm" onClick={addOption}>
            <Plus className="h-4 w-4 mr-1" /> Add option
          </Button>
        </div>
      )}

      {/* Linear scale config */}
      {question.type === 'linear_scale' && (
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1">
            <Label className="text-xs">Min value</Label>
            <Input type="number" defaultValue={(validation.min as number) ?? 1}
              onChange={(e) => onUpdate({ validation: { ...validation, min: +e.target.value } })} />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Max value</Label>
            <Input type="number" defaultValue={(validation.max as number) ?? 5}
              onChange={(e) => onUpdate({ validation: { ...validation, max: +e.target.value } })} />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Min label</Label>
            <Input defaultValue={validation.min_label as string ?? ''}
              onChange={(e) => onUpdate({ validation: { ...validation, min_label: e.target.value } })} />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Max label</Label>
            <Input defaultValue={validation.max_label as string ?? ''}
              onChange={(e) => onUpdate({ validation: { ...validation, max_label: e.target.value } })} />
          </div>
        </div>
      )}

      {/* Rating config */}
      {question.type === 'rating' && (
        <div className="space-y-1">
          <Label className="text-xs">Max stars</Label>
          <Input type="number" min={3} max={10}
            defaultValue={(validation.max as number) ?? 5}
            onChange={(e) => onUpdate({ validation: { ...validation, max: +e.target.value } })} />
        </div>
      )}

      {/* Number validation */}
      {question.type === 'number' && (
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1">
            <Label className="text-xs">Min</Label>
            <Input type="number" onChange={(e) => onUpdate({ validation: { ...validation, min: +e.target.value } })} />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Max</Label>
            <Input type="number" onChange={(e) => onUpdate({ validation: { ...validation, max: +e.target.value } })} />
          </div>
        </div>
      )}

      {/* Required toggle */}
      {!['section_header', 'page_break'].includes(question.type) && (
        <div className="flex items-center justify-between pt-2 border-t">
          <Label htmlFor={`req-${question.id}`} className="cursor-pointer">Required</Label>
          <Switch
            id={`req-${question.id}`}
            checked={question.is_required}
            onCheckedChange={(v) => onUpdate({ is_required: v })}
          />
        </div>
      )}
    </div>
  )
}
