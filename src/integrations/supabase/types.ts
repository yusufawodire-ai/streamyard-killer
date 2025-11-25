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
      brand_assets: {
        Row: {
          asset_type: string
          brand_id: string
          created_at: string | null
          duration_seconds: number | null
          file_name: string
          file_size_bytes: number | null
          file_url: string
          id: string
          mime_type: string | null
          updated_at: string | null
        }
        Insert: {
          asset_type: string
          brand_id: string
          created_at?: string | null
          duration_seconds?: number | null
          file_name: string
          file_size_bytes?: number | null
          file_url: string
          id?: string
          mime_type?: string | null
          updated_at?: string | null
        }
        Update: {
          asset_type?: string
          brand_id?: string
          created_at?: string | null
          duration_seconds?: number | null
          file_name?: string
          file_size_bytes?: number | null
          file_url?: string
          id?: string
          mime_type?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      distribution_logs: {
        Row: {
          created_at: string | null
          error_message: string | null
          id: string
          platform: string
          platform_post_id: string | null
          post_url: string | null
          published_at: string | null
          session_id: string
          status: string
        }
        Insert: {
          created_at?: string | null
          error_message?: string | null
          id?: string
          platform: string
          platform_post_id?: string | null
          post_url?: string | null
          published_at?: string | null
          session_id: string
          status?: string
        }
        Update: {
          created_at?: string | null
          error_message?: string | null
          id?: string
          platform?: string
          platform_post_id?: string | null
          post_url?: string | null
          published_at?: string | null
          session_id?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "distribution_logs_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      session_brand_variants: {
        Row: {
          base_session_id: string
          brand_id: string
          created_at: string | null
          final_video_url: string | null
          id: string
          intro_url: string | null
          outro_url: string | null
          updated_at: string | null
          variant_name: string | null
        }
        Insert: {
          base_session_id: string
          brand_id: string
          created_at?: string | null
          final_video_url?: string | null
          id?: string
          intro_url?: string | null
          outro_url?: string | null
          updated_at?: string | null
          variant_name?: string | null
        }
        Update: {
          base_session_id?: string
          brand_id?: string
          created_at?: string | null
          final_video_url?: string | null
          id?: string
          intro_url?: string | null
          outro_url?: string | null
          updated_at?: string | null
          variant_name?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "session_brand_variants_base_session_id_fkey"
            columns: ["base_session_id"]
            isOneToOne: false
            referencedRelation: "sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      sessions: {
        Row: {
          brand_id: string
          created_at: string | null
          description: string | null
          duration_seconds: number | null
          error_message: string | null
          final_video_url: string | null
          id: string
          is_public: boolean | null
          raw_video_url: string | null
          recorded_at: string | null
          recording_metadata: Json | null
          share_expires_at: string | null
          share_token: string | null
          status: string
          title: string
          transcript_url: string | null
          updated_at: string | null
          view_count: number | null
        }
        Insert: {
          brand_id: string
          created_at?: string | null
          description?: string | null
          duration_seconds?: number | null
          error_message?: string | null
          final_video_url?: string | null
          id?: string
          is_public?: boolean | null
          raw_video_url?: string | null
          recorded_at?: string | null
          recording_metadata?: Json | null
          share_expires_at?: string | null
          share_token?: string | null
          status?: string
          title: string
          transcript_url?: string | null
          updated_at?: string | null
          view_count?: number | null
        }
        Update: {
          brand_id?: string
          created_at?: string | null
          description?: string | null
          duration_seconds?: number | null
          error_message?: string | null
          final_video_url?: string | null
          id?: string
          is_public?: boolean | null
          raw_video_url?: string | null
          recorded_at?: string | null
          recording_metadata?: Json | null
          share_expires_at?: string | null
          share_token?: string | null
          status?: string
          title?: string
          transcript_url?: string | null
          updated_at?: string | null
          view_count?: number | null
        }
        Relationships: []
      }
      transcripts: {
        Row: {
          completed_at: string | null
          created_at: string | null
          error_message: string | null
          full_text: string | null
          id: string
          language: string | null
          provider: string | null
          provider_job_id: string | null
          session_id: string
          srt_content: string | null
          status: string
          vtt_content: string | null
          word_count: number | null
        }
        Insert: {
          completed_at?: string | null
          created_at?: string | null
          error_message?: string | null
          full_text?: string | null
          id?: string
          language?: string | null
          provider?: string | null
          provider_job_id?: string | null
          session_id: string
          srt_content?: string | null
          status?: string
          vtt_content?: string | null
          word_count?: number | null
        }
        Update: {
          completed_at?: string | null
          created_at?: string | null
          error_message?: string | null
          full_text?: string | null
          id?: string
          language?: string | null
          provider?: string | null
          provider_job_id?: string | null
          session_id?: string
          srt_content?: string | null
          status?: string
          vtt_content?: string | null
          word_count?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "transcripts_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "sessions"
            referencedColumns: ["id"]
          },
        ]
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
