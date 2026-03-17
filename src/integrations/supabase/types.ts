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
    PostgrestVersion: "14.4"
  }
  public: {
    Tables: {
      blessing_likes: {
        Row: {
          blessing_id: string
          created_at: string
          id: string
          user_id: string
        }
        Insert: {
          blessing_id: string
          created_at?: string
          id?: string
          user_id: string
        }
        Update: {
          blessing_id?: string
          created_at?: string
          id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "blessing_likes_blessing_id_fkey"
            columns: ["blessing_id"]
            isOneToOne: false
            referencedRelation: "blessings"
            referencedColumns: ["id"]
          },
        ]
      }
      blessings: {
        Row: {
          content: string
          created_at: string
          family_id: string
          id: string
          tagged_member_id: string | null
          user_id: string
        }
        Insert: {
          content: string
          created_at?: string
          family_id: string
          id?: string
          tagged_member_id?: string | null
          user_id: string
        }
        Update: {
          content?: string
          created_at?: string
          family_id?: string
          id?: string
          tagged_member_id?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "blessings_family_id_fkey"
            columns: ["family_id"]
            isOneToOne: false
            referencedRelation: "families"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "blessings_tagged_member_id_fkey"
            columns: ["tagged_member_id"]
            isOneToOne: false
            referencedRelation: "family_members"
            referencedColumns: ["id"]
          },
        ]
      }
      families: {
        Row: {
          access_code: string
          created_at: string
          created_by: string | null
          id: string
          name: string
        }
        Insert: {
          access_code: string
          created_at?: string
          created_by?: string | null
          id?: string
          name: string
        }
        Update: {
          access_code?: string
          created_at?: string
          created_by?: string | null
          id?: string
          name?: string
        }
        Relationships: []
      }
      family_events: {
        Row: {
          created_at: string
          event_date: string
          family_id: string
          id: string
          title: string
          type: Database["public"]["Enums"]["event_type"]
        }
        Insert: {
          created_at?: string
          event_date: string
          family_id: string
          id?: string
          title: string
          type?: Database["public"]["Enums"]["event_type"]
        }
        Update: {
          created_at?: string
          event_date?: string
          family_id?: string
          id?: string
          title?: string
          type?: Database["public"]["Enums"]["event_type"]
        }
        Relationships: [
          {
            foreignKeyName: "family_events_family_id_fkey"
            columns: ["family_id"]
            isOneToOne: false
            referencedRelation: "families"
            referencedColumns: ["id"]
          },
        ]
      }
      family_members: {
        Row: {
          avatar_url: string | null
          created_at: string
          display_name: string
          family_id: string
          id: string
          is_admin: boolean
          role: Database["public"]["Enums"]["persona_role"]
          user_id: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          display_name: string
          family_id: string
          id?: string
          is_admin?: boolean
          role?: Database["public"]["Enums"]["persona_role"]
          user_id: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          display_name?: string
          family_id?: string
          id?: string
          is_admin?: boolean
          role?: Database["public"]["Enums"]["persona_role"]
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "family_members_family_id_fkey"
            columns: ["family_id"]
            isOneToOne: false
            referencedRelation: "families"
            referencedColumns: ["id"]
          },
        ]
      }
      game_scores: {
        Row: {
          created_at: string
          family_id: string
          game: string
          id: string
          score: number
          user_id: string
        }
        Insert: {
          created_at?: string
          family_id: string
          game?: string
          id?: string
          score: number
          user_id: string
        }
        Update: {
          created_at?: string
          family_id?: string
          game?: string
          id?: string
          score?: number
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "game_scores_family_id_fkey"
            columns: ["family_id"]
            isOneToOne: false
            referencedRelation: "families"
            referencedColumns: ["id"]
          },
        ]
      }
      ipl_matches: {
        Row: {
          created_at: string
          id: string
          match_date: string
          match_time: string
          status: string
          team_a: string
          team_b: string
          venue: string
          winner: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          match_date: string
          match_time?: string
          status?: string
          team_a: string
          team_b: string
          venue?: string
          winner?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          match_date?: string
          match_time?: string
          status?: string
          team_a?: string
          team_b?: string
          venue?: string
          winner?: string | null
        }
        Relationships: []
      }
      predictions: {
        Row: {
          created_at: string
          family_id: string | null
          id: string
          match_id: string
          points_earned: number
          predicted_winner: string
          user_id: string
        }
        Insert: {
          created_at?: string
          family_id?: string | null
          id?: string
          match_id: string
          points_earned?: number
          predicted_winner: string
          user_id: string
        }
        Update: {
          created_at?: string
          family_id?: string | null
          id?: string
          match_id?: string
          points_earned?: number
          predicted_winner?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "predictions_family_id_fkey"
            columns: ["family_id"]
            isOneToOne: false
            referencedRelation: "families"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          display_name: string
          family_id: string
          id: string
          is_admin: boolean
          role: Database["public"]["Enums"]["persona_role"]
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          display_name: string
          family_id: string
          id: string
          is_admin?: boolean
          role?: Database["public"]["Enums"]["persona_role"]
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          display_name?: string
          family_id?: string
          id?: string
          is_admin?: boolean
          role?: Database["public"]["Enums"]["persona_role"]
        }
        Relationships: [
          {
            foreignKeyName: "profiles_family_id_fkey"
            columns: ["family_id"]
            isOneToOne: false
            referencedRelation: "families"
            referencedColumns: ["id"]
          },
        ]
      }
      push_subscriptions: {
        Row: {
          auth: string
          created_at: string
          endpoint: string
          family_id: string
          id: string
          p256dh: string
          user_id: string
        }
        Insert: {
          auth: string
          created_at?: string
          endpoint: string
          family_id: string
          id?: string
          p256dh: string
          user_id: string
        }
        Update: {
          auth?: string
          created_at?: string
          endpoint?: string
          family_id?: string
          id?: string
          p256dh?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "push_subscriptions_family_id_fkey"
            columns: ["family_id"]
            isOneToOne: false
            referencedRelation: "families"
            referencedColumns: ["id"]
          },
        ]
      }
      style_comments: {
        Row: {
          content: string
          created_at: string
          id: string
          post_id: string
          user_id: string
        }
        Insert: {
          content: string
          created_at?: string
          id?: string
          post_id: string
          user_id: string
        }
        Update: {
          content?: string
          created_at?: string
          id?: string
          post_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "style_comments_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "style_posts"
            referencedColumns: ["id"]
          },
        ]
      }
      style_likes: {
        Row: {
          created_at: string
          id: string
          post_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          post_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          post_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "style_likes_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "style_posts"
            referencedColumns: ["id"]
          },
        ]
      }
      style_posts: {
        Row: {
          caption: string | null
          created_at: string
          family_id: string
          id: string
          image_url: string
          user_id: string
        }
        Insert: {
          caption?: string | null
          created_at?: string
          family_id: string
          id?: string
          image_url: string
          user_id: string
        }
        Update: {
          caption?: string | null
          created_at?: string
          family_id?: string
          id?: string
          image_url?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "style_posts_family_id_fkey"
            columns: ["family_id"]
            isOneToOne: false
            referencedRelation: "families"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      get_user_family_id: { Args: never; Returns: string }
      user_is_family_member: { Args: { fid: string }; Returns: boolean }
    }
    Enums: {
      event_type: "birthday" | "anniversary" | "travel"
      persona_role: "kid" | "man" | "woman" | "elder"
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
    Enums: {
      event_type: ["birthday", "anniversary", "travel"],
      persona_role: ["kid", "man", "woman", "elder"],
    },
  },
} as const
