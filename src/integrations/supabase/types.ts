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
      adr_data: {
        Row: {
          adr_percent_used: number
          adr_pips: number
          created_at: string
          fetched_at: string
          id: string
          pair: string
          status: string
          today_high: number
          today_low: number
          today_range_pips: number
        }
        Insert: {
          adr_percent_used?: number
          adr_pips?: number
          created_at?: string
          fetched_at?: string
          id?: string
          pair: string
          status?: string
          today_high?: number
          today_low?: number
          today_range_pips?: number
        }
        Update: {
          adr_percent_used?: number
          adr_pips?: number
          created_at?: string
          fetched_at?: string
          id?: string
          pair?: string
          status?: string
          today_high?: number
          today_low?: number
          today_range_pips?: number
        }
        Relationships: []
      }
      alert_log: {
        Row: {
          alert_type: string
          created_at: string
          id: string
          message: string
          metadata: Json | null
          pair: string | null
          sent_at: string
        }
        Insert: {
          alert_type: string
          created_at?: string
          id?: string
          message: string
          metadata?: Json | null
          pair?: string | null
          sent_at?: string
        }
        Update: {
          alert_type?: string
          created_at?: string
          id?: string
          message?: string
          metadata?: Json | null
          pair?: string | null
          sent_at?: string
        }
        Relationships: []
      }
      alert_settings: {
        Row: {
          confluence_alert: boolean
          created_at: string
          ema_shift_alert: boolean
          id: string
          min_confluence_grade: string
          mt5_trade_alert: boolean
          risk_breach_alert: boolean
          session_reminder_alert: boolean
          telegram_chat_id: string | null
          updated_at: string
        }
        Insert: {
          confluence_alert?: boolean
          created_at?: string
          ema_shift_alert?: boolean
          id?: string
          min_confluence_grade?: string
          mt5_trade_alert?: boolean
          risk_breach_alert?: boolean
          session_reminder_alert?: boolean
          telegram_chat_id?: string | null
          updated_at?: string
        }
        Update: {
          confluence_alert?: boolean
          created_at?: string
          ema_shift_alert?: boolean
          id?: string
          min_confluence_grade?: string
          mt5_trade_alert?: boolean
          risk_breach_alert?: boolean
          session_reminder_alert?: boolean
          telegram_chat_id?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      confluence_scores: {
        Row: {
          active_session: string | null
          base_currency: string | null
          calculated_at: string
          created_at: string
          direction: string
          ema_score: number
          grade: string
          id: string
          pair: string
          quote_currency: string | null
          session_active: boolean
          strength_diff: number
        }
        Insert: {
          active_session?: string | null
          base_currency?: string | null
          calculated_at?: string
          created_at?: string
          direction?: string
          ema_score?: number
          grade?: string
          id?: string
          pair: string
          quote_currency?: string | null
          session_active?: boolean
          strength_diff?: number
        }
        Update: {
          active_session?: string | null
          base_currency?: string | null
          calculated_at?: string
          created_at?: string
          direction?: string
          ema_score?: number
          grade?: string
          id?: string
          pair?: string
          quote_currency?: string | null
          session_active?: boolean
          strength_diff?: number
        }
        Relationships: []
      }
      currency_strength: {
        Row: {
          category: string
          created_at: string
          currency: string
          id: string
          recorded_at: string
          strength: number
          timeframe: string
        }
        Insert: {
          category: string
          created_at?: string
          currency: string
          id?: string
          recorded_at: string
          strength: number
          timeframe: string
        }
        Update: {
          category?: string
          created_at?: string
          currency?: string
          id?: string
          recorded_at?: string
          strength?: number
          timeframe?: string
        }
        Relationships: []
      }
      ema_alignments: {
        Row: {
          alignment_type: string
          created_at: string
          current_price: number
          direction: string
          ema_15: number
          ema_200: number
          ema_9: number
          id: string
          is_aligned: boolean
          pair: string
          scan_batch_id: string
          scanned_at: string
          timeframe: string
        }
        Insert: {
          alignment_type?: string
          created_at?: string
          current_price: number
          direction: string
          ema_15: number
          ema_200: number
          ema_9: number
          id?: string
          is_aligned?: boolean
          pair: string
          scan_batch_id: string
          scanned_at?: string
          timeframe: string
        }
        Update: {
          alignment_type?: string
          created_at?: string
          current_price?: number
          direction?: string
          ema_15?: number
          ema_200?: number
          ema_9?: number
          id?: string
          is_aligned?: boolean
          pair?: string
          scan_batch_id?: string
          scanned_at?: string
          timeframe?: string
        }
        Relationships: []
      }
      ema_scan_notifications: {
        Row: {
          alignment_score: number
          created_at: string
          direction: string
          id: string
          is_read: boolean
          message: string
          pair: string
          scan_batch_id: string
        }
        Insert: {
          alignment_score?: number
          created_at?: string
          direction: string
          id?: string
          is_read?: boolean
          message: string
          pair: string
          scan_batch_id: string
        }
        Update: {
          alignment_score?: number
          created_at?: string
          direction?: string
          id?: string
          is_read?: boolean
          message?: string
          pair?: string
          scan_batch_id?: string
        }
        Relationships: []
      }
      mt5_account_info: {
        Row: {
          account_id: string
          balance: number
          broker: string | null
          created_at: string
          currency: string | null
          equity: number
          free_margin: number
          id: string
          leverage: number
          margin: number
          server: string | null
          synced_at: string
        }
        Insert: {
          account_id: string
          balance?: number
          broker?: string | null
          created_at?: string
          currency?: string | null
          equity?: number
          free_margin?: number
          id?: string
          leverage?: number
          margin?: number
          server?: string | null
          synced_at?: string
        }
        Update: {
          account_id?: string
          balance?: number
          broker?: string | null
          created_at?: string
          currency?: string | null
          equity?: number
          free_margin?: number
          id?: string
          leverage?: number
          margin?: number
          server?: string | null
          synced_at?: string
        }
        Relationships: []
      }
      mt5_trades: {
        Row: {
          close_time: string | null
          commission: number | null
          created_at: string
          direction: string
          entry_price: number
          exit_price: number | null
          id: string
          imported_to_journal: boolean
          is_open: boolean
          lot_size: number
          open_time: string | null
          pair: string
          pips: number | null
          pnl: number | null
          sl: number | null
          swap: number | null
          ticket: string
          tp: number | null
        }
        Insert: {
          close_time?: string | null
          commission?: number | null
          created_at?: string
          direction: string
          entry_price?: number
          exit_price?: number | null
          id?: string
          imported_to_journal?: boolean
          is_open?: boolean
          lot_size?: number
          open_time?: string | null
          pair: string
          pips?: number | null
          pnl?: number | null
          sl?: number | null
          swap?: number | null
          ticket: string
          tp?: number | null
        }
        Update: {
          close_time?: string | null
          commission?: number | null
          created_at?: string
          direction?: string
          entry_price?: number
          exit_price?: number | null
          id?: string
          imported_to_journal?: boolean
          is_open?: boolean
          lot_size?: number
          open_time?: string | null
          pair?: string
          pips?: number | null
          pnl?: number | null
          sl?: number | null
          swap?: number | null
          ticket?: string
          tp?: number | null
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
