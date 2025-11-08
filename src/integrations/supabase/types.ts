export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "13.0.5"
  }
  public: {
    Tables: {
      body_weight_tracking: {
        Row: {
          created_at: string
          date: string
          id: string
          user_id: string
          weight: number
        }
        Insert: {
          created_at?: string
          date: string
          id?: string
          user_id: string
          weight: number
        }
        Update: {
          created_at?: string
          date?: string
          id?: string
          user_id?: string
          weight?: number
        }
        Relationships: []
      }
      exercise_sets: {
        Row: {
          completed_at: string | null
          created_at: string
          exercise_id: string
          id: string
          reps: number
          rest_time: number | null
          set_number: number
          weight: number
        }
        Insert: {
          completed_at?: string | null
          created_at?: string
          exercise_id: string
          id?: string
          reps: number
          rest_time?: number | null
          set_number: number
          weight: number
        }
        Update: {
          completed_at?: string | null
          created_at?: string
          exercise_id?: string
          id?: string
          reps?: number
          rest_time?: number | null
          set_number?: number
          weight?: number
        }
        Relationships: [
          {
            foreignKeyName: "exercise_sets_exercise_id_fkey"
            columns: ["exercise_id"]
            isOneToOne: false
            referencedRelation: "session_exercises"
            referencedColumns: ["id"]
          },
        ]
      }
      session_exercises: {
        Row: {
          created_at: string
          exercise_name: string
          id: string
          session_id: string
        }
        Insert: {
          created_at?: string
          exercise_name: string
          id?: string
          session_id: string
        }
        Update: {
          created_at?: string
          exercise_name?: string
          id?: string
          session_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "session_exercises_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "workout_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      user_profiles: {
        Row: {
          age: number | null
          created_at: string
          full_name: string | null
          goal: string | null
          height: number | null
          id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          age?: number | null
          created_at?: string
          full_name?: string | null
          goal?: string | null
          height?: number | null
          id?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          age?: number | null
          created_at?: string
          full_name?: string | null
          goal?: string | null
          height?: number | null
          id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      workout_checkins: {
        Row: {
          created_at: string
          date: string
          id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          date: string
          id?: string
          user_id: string
        }
        Update: {
          created_at?: string
          date?: string
          id?: string
          user_id?: string
        }
        Relationships: []
      }
      workout_sessions: {
        Row: {
          created_at: string
          date: string
          id: string
          muscle_group: string | null
          name: string
          user_id: string
        }
        Insert: {
          created_at?: string
          date: string
          id?: string
          muscle_group?: string | null
          name: string
          user_id: string
        }
        Update: {
          created_at?: string
          date?: string
          id?: string
          muscle_group?: string | null
          name?: string
          user_id?: string
        }
        Relationships: []
      }
      workouts: {
        Row: {
          created_at: string
          exercise: string
          id: string
          notes: string | null
          reps: number
          sets: number
          user_id: string
          weight: number
        }
        Insert: {
          created_at?: string
          exercise: string
          id?: string
          notes?: string | null
          reps: number
          sets: number
          user_id: string
          weight: number
        }
        Update: {
          created_at?: string
          exercise?: string
          id?: string
          notes?: string | null
          reps?: number
          sets?: number
          user_id?: string
          weight?: number
        }
        Relationships: []
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
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {},
  },
} as const
