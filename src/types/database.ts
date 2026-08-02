export type Database = {
  public: {
    Tables: {
      profiles: {
        Row: Profile
        Insert: Omit<Profile, 'created_at' | 'updated_at'> & Partial<{ created_at: string; updated_at: string }>
        Update: Partial<Profile>
      }
      universities: {
        Row: University
        Insert: Omit<University, 'created_at'> & Partial<{ created_at: string }>
        Update: Partial<University>
      }
      teacher_applications: {
        Row: TeacherApplication
        Insert: Omit<TeacherApplication, 'id' | 'created_at' | 'updated_at'> & Partial<{ id: string; created_at: string; updated_at: string }>
        Update: Partial<TeacherApplication>
      }
      quizzes: {
        Row: Quiz
        Insert: Omit<Quiz, 'id' | 'created_at'> & Partial<{ id: string; created_at: string }>
        Update: Partial<Quiz>
      }
      quiz_attempts: {
        Row: QuizAttempt
        Insert: Omit<QuizAttempt, 'id' | 'started_at' | 'completed_at'> & Partial<{ id: string; started_at: string; completed_at: string }>
        Update: Partial<QuizAttempt>
      }
      coding_questions: {
        Row: CodingQuestion
        Insert: Omit<CodingQuestion, 'id' | 'created_at'> & Partial<{ id: number; created_at: string }>
        Update: Partial<CodingQuestion>
      }
      coding_submissions: {
        Row: CodingSubmission
        Insert: Omit<CodingSubmission, 'id' | 'created_at'> & Partial<{ id: string; created_at: string }>
        Update: Partial<CodingSubmission>
      }
    }
  }
}

export type Profile = {
  id: string
  username: string
  full_name: string | null
  bio: string | null
  avatar_url: string | null
  is_banned: boolean
  sethji: boolean
  is_onboarded: boolean
  is_teacher: boolean
  teacher_id_card_url: string | null
  created_at: string
  updated_at: string
}

export type University = {
  id: string
  name: string
  domain: string
  created_at: string
}

export type TeacherApplication = {
  id: string
  user_id: string
  id_card_url: string
  status: 'pending' | 'approved' | 'rejected'
  rejection_notes: string
  created_at: string
  updated_at: string
}

export type Quiz = {
  id: string
  title: string
  description: string
  creator_id: string
  is_teacher_quiz: boolean
  is_coding_quiz: boolean
  coding_question_ids: number[]
  required_inputs: string[] // e.g. ["fullName", "course", "rollNumber"]
  start_time: string
  end_time: string
  duration_minutes: number
  created_at: string
}

export type QuizAttempt = {
  id: string
  quiz_id: string
  user_id: string
  answers: any // JSONB
  student_details: any // JSONB e.g. { fullName, rollNumber }
  score: number
  score_percentage: number
  is_disqualified: boolean
  warnings_count: number
  started_at: string
  completed_at: string
}

export type CodingQuestion = {
  id: number
  title: string
  description: string
  difficulty: 'easy' | 'medium' | 'hard'
  points: number
  category: 'python-basics' | 'python-advanced' | 'numpy' | 'pandas' | 'matplotlib-seaborn'
  starter_code: string
  verification_script: string
  dataset_name: string | null
  created_at: string
}

export type CodingSubmission = {
  id: string
  user_id: string | null
  question_id: number
  quiz_attempt_id: string | null
  code: string
  status: 'accepted' | 'wrong_answer' | 'runtime_error' | 'timeout'
  output: string | null
  passed_cases: number
  total_cases: number
  visualization_base64: string | null
  created_at: string
}
