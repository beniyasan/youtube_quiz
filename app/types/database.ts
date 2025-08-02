export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      users: {
        Row: {
          id: string
          email: string
          username: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          email: string
          username: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          email?: string
          username?: string
          created_at?: string
          updated_at?: string
        }
      }
      playlists: {
        Row: {
          id: string
          user_id: string
          name: string
          description: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          name: string
          description?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          name?: string
          description?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      youtube_videos: {
        Row: {
          id: string
          playlist_id: string
          youtube_url: string
          title: string
          thumbnail_url: string | null
          duration: number | null
          created_at: string
        }
        Insert: {
          id?: string
          playlist_id: string
          youtube_url: string
          title: string
          thumbnail_url?: string | null
          duration?: number | null
          created_at?: string
        }
        Update: {
          id?: string
          playlist_id?: string
          youtube_url?: string
          title?: string
          thumbnail_url?: string | null
          duration?: number | null
          created_at?: string
        }
      }
      quiz_rooms: {
        Row: {
          id: string
          host_id: string
          playlist_id: string
          room_code: string
          status: 'waiting' | 'playing' | 'finished'
          max_players: number
          created_at: string
          started_at: string | null
          finished_at: string | null
        }
        Insert: {
          id?: string
          host_id: string
          playlist_id: string
          room_code: string
          status?: 'waiting' | 'playing' | 'finished'
          max_players?: number
          created_at?: string
          started_at?: string | null
          finished_at?: string | null
        }
        Update: {
          id?: string
          host_id?: string
          playlist_id?: string
          room_code?: string
          status?: 'waiting' | 'playing' | 'finished'
          max_players?: number
          created_at?: string
          started_at?: string | null
          finished_at?: string | null
        }
      }
      quiz_participants: {
        Row: {
          id: string
          room_id: string
          user_id: string
          score: number
          joined_at: string
        }
        Insert: {
          id?: string
          room_id: string
          user_id: string
          score?: number
          joined_at?: string
        }
        Update: {
          id?: string
          room_id?: string
          user_id?: string
          score?: number
          joined_at?: string
        }
      }
      quiz_questions: {
        Row: {
          id: string
          room_id: string
          video_id: string
          question_text: string
          correct_answer: string
          options: Json
          time_limit: number
          created_at: string
        }
        Insert: {
          id?: string
          room_id: string
          video_id: string
          question_text: string
          correct_answer: string
          options: Json
          time_limit?: number
          created_at?: string
        }
        Update: {
          id?: string
          room_id?: string
          video_id?: string
          question_text?: string
          correct_answer?: string
          options?: Json
          time_limit?: number
          created_at?: string
        }
      }
      quiz_answers: {
        Row: {
          id: string
          question_id: string
          participant_id: string
          answer: string
          is_correct: boolean
          answered_at: string
        }
        Insert: {
          id?: string
          question_id: string
          participant_id: string
          answer: string
          is_correct: boolean
          answered_at?: string
        }
        Update: {
          id?: string
          question_id?: string
          participant_id?: string
          answer?: string
          is_correct?: boolean
          answered_at?: string
        }
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
    }
  }
}