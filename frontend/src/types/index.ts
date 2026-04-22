export interface User {
  id: number
  email: string
  name: string
}

export interface FormSettings {
  accept_responses: boolean
  one_response_per_user: boolean
  require_login: boolean
  show_progress_bar: boolean
  shuffle_questions: boolean
  response_limit: number | null
  open_at: string | null
  close_at: string | null
  confirmation_message: string
}

export interface Form {
  id: number
  uuid_slug: string
  title: string
  description: string
  theme_color: string
  cover_image: string | null
  is_published: boolean
  is_archived: boolean
  settings: FormSettings
  created_at: string
  updated_at: string
  question_count: number
  response_count: number
  questions?: Question[]
}

export type QuestionType =
  | 'short_answer' | 'long_answer' | 'multiple_choice' | 'checkboxes'
  | 'dropdown' | 'linear_scale' | 'multiple_choice_grid' | 'checkbox_grid'
  | 'date' | 'time' | 'datetime' | 'file_upload' | 'number' | 'email'
  | 'phone' | 'url' | 'rating' | 'section_header' | 'page_break'

export interface Question {
  id: number
  form_id: number
  order_index: number
  type: QuestionType
  label: string
  help_text: string
  is_required: boolean
  options: unknown[]
  validation: Record<string, unknown>
  logic: Record<string, unknown>
}

export interface Answer {
  id: number
  question_id: number
  value_text: string | null
  value_json: unknown | null
  file_path: string | null
}

export interface FormResponse {
  id: number
  form_id: number
  respondent_id: number | null
  submitted_at: string
  ip: string | null
  user_agent: string | null
  answers: Answer[]
}

export interface PaginatedResponses {
  items: FormResponse[]
  total: number
  page: number
  limit: number
  pages: number
}

export interface AnalyticsQuestion {
  question_id: number
  label: string
  type: string
  chart: 'bar' | 'text' | 'histogram' | 'none'
  data: unknown[]
  total_answers: number
  avg?: number
}

export interface Analytics {
  total_responses: number
  questions: AnalyticsQuestion[]
}
