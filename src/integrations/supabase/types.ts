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
      game_increment_log: {
        Row: {
          created_at: string
          id: string
          session_hash: string
        }
        Insert: {
          created_at?: string
          id?: string
          session_hash: string
        }
        Update: {
          created_at?: string
          id?: string
          session_hash?: string
        }
        Relationships: []
      }
      game_stats: {
        Row: {
          games_played: number
          id: string
          updated_at: string
        }
        Insert: {
          games_played?: number
          id?: string
          updated_at?: string
        }
        Update: {
          games_played?: number
          id?: string
          updated_at?: string
        }
        Relationships: []
      }
      leaderboard: {
        Row: {
          bugs_killed: number | null
          created_at: string
          game_duration_seconds: number | null
          id: string
          name: string
          score: number
        }
        Insert: {
          bugs_killed?: number | null
          created_at?: string
          game_duration_seconds?: number | null
          id?: string
          name: string
          score: number
        }
        Update: {
          bugs_killed?: number | null
          created_at?: string
          game_duration_seconds?: number | null
          id?: string
          name?: string
          score?: number
        }
        Relationships: []
      }
      leaderboard_3d: {
        Row: {
          bugs_killed: number | null
          created_at: string
          game_duration_seconds: number | null
          id: string
          name: string
          score: number
        }
        Insert: {
          bugs_killed?: number | null
          created_at?: string
          game_duration_seconds?: number | null
          id?: string
          name: string
          score: number
        }
        Update: {
          bugs_killed?: number | null
          created_at?: string
          game_duration_seconds?: number | null
          id?: string
          name?: string
          score?: number
        }
        Relationships: []
      }
      reward_config: {
        Row: {
          base_market_cap: number
          base_reward_amount: number
          claim_cooldown_hours: number
          id: string
          max_reward_amount: number
          max_reward_usd: number
          max_score_cap: number
          min_reward_amount: number
          points_per_token: number
          updated_at: string
        }
        Insert: {
          base_market_cap?: number
          base_reward_amount?: number
          claim_cooldown_hours?: number
          id?: string
          max_reward_amount?: number
          max_reward_usd?: number
          max_score_cap?: number
          min_reward_amount?: number
          points_per_token?: number
          updated_at?: string
        }
        Update: {
          base_market_cap?: number
          base_reward_amount?: number
          claim_cooldown_hours?: number
          id?: string
          max_reward_amount?: number
          max_reward_usd?: number
          max_score_cap?: number
          min_reward_amount?: number
          points_per_token?: number
          updated_at?: string
        }
        Relationships: []
      }
      token_rewards: {
        Row: {
          claimed_at: string
          game_session_id: string | null
          id: string
          ip_address: string | null
          market_cap_at_claim: number
          score: number
          status: string
          tokens_earned: number
          tx_signature: string | null
          wallet_address: string
        }
        Insert: {
          claimed_at?: string
          game_session_id?: string | null
          id?: string
          ip_address?: string | null
          market_cap_at_claim: number
          score: number
          status?: string
          tokens_earned: number
          tx_signature?: string | null
          wallet_address: string
        }
        Update: {
          claimed_at?: string
          game_session_id?: string | null
          id?: string
          ip_address?: string | null
          market_cap_at_claim?: number
          score?: number
          status?: string
          tokens_earned?: number
          tx_signature?: string | null
          wallet_address?: string
        }
        Relationships: [
          {
            foreignKeyName: "token_rewards_game_session_id_fkey"
            columns: ["game_session_id"]
            isOneToOne: false
            referencedRelation: "leaderboard_3d"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      calculate_token_reward:
        | { Args: { p_market_cap: number; p_score: number }; Returns: number }
        | {
            Args: {
              p_market_cap: number
              p_price_usd?: number
              p_score: number
            }
            Returns: number
          }
      check_claim_eligibility: {
        Args: { p_ip_address: string; p_wallet_address: string }
        Returns: Json
      }
      claim_reward:
        | {
            Args: {
              p_game_session_id?: string
              p_market_cap: number
              p_score: number
              p_wallet_address: string
            }
            Returns: Json
          }
        | {
            Args: {
              p_game_session_id?: string
              p_market_cap: number
              p_price_usd?: number
              p_score: number
              p_wallet_address: string
            }
            Returns: Json
          }
      cleanup_old_increment_logs: { Args: never; Returns: undefined }
      increment_games_played:
        | { Args: never; Returns: number }
        | { Args: { p_session_hash?: string }; Returns: number }
      submit_score: {
        Args: {
          p_bugs_killed: number
          p_game_duration: number
          p_name: string
          p_score: number
        }
        Returns: boolean
      }
      submit_score_3d: {
        Args: {
          p_bugs_killed: number
          p_game_duration: number
          p_name: string
          p_score: number
        }
        Returns: boolean
      }
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
