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
      account_settings: {
        Row: {
          allowed_sessions: string[]
          created_at: string
          currency: string
          current_balance: number
          daily_loss_limit: number
          id: string
          max_drawdown_percent: number
          max_losing_trades: number
          max_lot_size: number
          max_risk_percent: number
          max_trades_per_day: number
          max_winning_trades: number
          min_confidence: number
          min_rrr: number
          min_smc_tags: number
          starting_balance: number
          updated_at: string
          user_id: string | null
        }
        Insert: {
          allowed_sessions?: string[]
          created_at?: string
          currency?: string
          current_balance?: number
          daily_loss_limit?: number
          id?: string
          max_drawdown_percent?: number
          max_losing_trades?: number
          max_lot_size?: number
          max_risk_percent?: number
          max_trades_per_day?: number
          max_winning_trades?: number
          min_confidence?: number
          min_rrr?: number
          min_smc_tags?: number
          starting_balance?: number
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          allowed_sessions?: string[]
          created_at?: string
          currency?: string
          current_balance?: number
          daily_loss_limit?: number
          id?: string
          max_drawdown_percent?: number
          max_losing_trades?: number
          max_lot_size?: number
          max_risk_percent?: number
          max_trades_per_day?: number
          max_winning_trades?: number
          min_confidence?: number
          min_rrr?: number
          min_smc_tags?: number
          starting_balance?: number
          updated_at?: string
          user_id?: string | null
        }
        Relationships: []
      }
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
      ai_scan_results: {
        Row: {
          created_at: string
          id: string
          pair: string
          result: number
          scan_batch_id: string
          scanned_at: string
          strength_label: string
          timeframe: string
        }
        Insert: {
          created_at?: string
          id?: string
          pair: string
          result?: number
          scan_batch_id: string
          scanned_at?: string
          strength_label?: string
          timeframe: string
        }
        Update: {
          created_at?: string
          id?: string
          pair?: string
          result?: number
          scan_batch_id?: string
          scanned_at?: string
          strength_label?: string
          timeframe?: string
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
          feature_adr: boolean
          feature_currency_scanner: boolean
          feature_ema_scanner: boolean
          feature_ny_breaks: boolean
          feature_price_spike: boolean
          feature_supply_demand: boolean
          feature_volume_spike: boolean
          habit_reminder_alert: boolean
          id: string
          min_confluence_grade: string
          mind_journal_chat_id: string | null
          mt5_trade_alert: boolean
          namaz_reminder_alert: boolean
          news_alert: boolean
          price_spike_alert: boolean
          risk_breach_alert: boolean
          session_reminder_alert: boolean
          telegram_chat_id: string | null
          updated_at: string
          volume_spike_alert: boolean
        }
        Insert: {
          confluence_alert?: boolean
          created_at?: string
          ema_shift_alert?: boolean
          feature_adr?: boolean
          feature_currency_scanner?: boolean
          feature_ema_scanner?: boolean
          feature_ny_breaks?: boolean
          feature_price_spike?: boolean
          feature_supply_demand?: boolean
          feature_volume_spike?: boolean
          habit_reminder_alert?: boolean
          id?: string
          min_confluence_grade?: string
          mind_journal_chat_id?: string | null
          mt5_trade_alert?: boolean
          namaz_reminder_alert?: boolean
          news_alert?: boolean
          price_spike_alert?: boolean
          risk_breach_alert?: boolean
          session_reminder_alert?: boolean
          telegram_chat_id?: string | null
          updated_at?: string
          volume_spike_alert?: boolean
        }
        Update: {
          confluence_alert?: boolean
          created_at?: string
          ema_shift_alert?: boolean
          feature_adr?: boolean
          feature_currency_scanner?: boolean
          feature_ema_scanner?: boolean
          feature_ny_breaks?: boolean
          feature_price_spike?: boolean
          feature_supply_demand?: boolean
          feature_volume_spike?: boolean
          habit_reminder_alert?: boolean
          id?: string
          min_confluence_grade?: string
          mind_journal_chat_id?: string | null
          mt5_trade_alert?: boolean
          namaz_reminder_alert?: boolean
          news_alert?: boolean
          price_spike_alert?: boolean
          risk_breach_alert?: boolean
          session_reminder_alert?: boolean
          telegram_chat_id?: string | null
          updated_at?: string
          volume_spike_alert?: boolean
        }
        Relationships: []
      }
      api_key_pool: {
        Row: {
          api_key: string
          calls_today: number
          created_at: string
          daily_limit: number
          id: string
          is_active: boolean
          label: string
          last_error_at: string | null
          last_used_at: string | null
          priority: number
          provider: string
        }
        Insert: {
          api_key: string
          calls_today?: number
          created_at?: string
          daily_limit?: number
          id?: string
          is_active?: boolean
          label?: string
          last_error_at?: string | null
          last_used_at?: string | null
          priority?: number
          provider?: string
        }
        Update: {
          api_key?: string
          calls_today?: number
          created_at?: string
          daily_limit?: number
          id?: string
          is_active?: boolean
          label?: string
          last_error_at?: string | null
          last_used_at?: string | null
          priority?: number
          provider?: string
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
      daily_focus: {
        Row: {
          created_at: string
          date: string
          id: string
          node_id: string
          rank: number
          reason: string
          source: string
          start_hour: number | null
          time_slot: string
          user_id: string
        }
        Insert: {
          created_at?: string
          date: string
          id?: string
          node_id: string
          rank?: number
          reason?: string
          source?: string
          start_hour?: number | null
          time_slot?: string
          user_id: string
        }
        Update: {
          created_at?: string
          date?: string
          id?: string
          node_id?: string
          rank?: number
          reason?: string
          source?: string
          start_hour?: number | null
          time_slot?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "daily_focus_node_id_fkey"
            columns: ["node_id"]
            isOneToOne: false
            referencedRelation: "life_nodes"
            referencedColumns: ["id"]
          },
        ]
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
      fundamental_biases: {
        Row: {
          actual: string
          bias: string
          currency: string
          event_date: string
          event_title: string
          forecast: string
          id: string
          impact: string
          previous: string
          updated_at: string
        }
        Insert: {
          actual?: string
          bias?: string
          currency: string
          event_date?: string
          event_title?: string
          forecast?: string
          id?: string
          impact?: string
          previous?: string
          updated_at?: string
        }
        Update: {
          actual?: string
          bias?: string
          currency?: string
          event_date?: string
          event_title?: string
          forecast?: string
          id?: string
          impact?: string
          previous?: string
          updated_at?: string
        }
        Relationships: []
      }
      habit_logs: {
        Row: {
          completed_at: string
          date: string
          habit_id: string
          id: string
          notes: string
          proof_url: string | null
          source: string
          user_id: string
        }
        Insert: {
          completed_at?: string
          date: string
          habit_id: string
          id?: string
          notes?: string
          proof_url?: string | null
          source?: string
          user_id: string
        }
        Update: {
          completed_at?: string
          date?: string
          habit_id?: string
          id?: string
          notes?: string
          proof_url?: string | null
          source?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "habit_logs_habit_id_fkey"
            columns: ["habit_id"]
            isOneToOne: false
            referencedRelation: "habits"
            referencedColumns: ["id"]
          },
        ]
      }
      habit_reminders: {
        Row: {
          date: string
          habit_id: string
          id: string
          responded: boolean
          sent_at: string
        }
        Insert: {
          date: string
          habit_id: string
          id?: string
          responded?: boolean
          sent_at?: string
        }
        Update: {
          date?: string
          habit_id?: string
          id?: string
          responded?: boolean
          sent_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "habit_reminders_habit_id_fkey"
            columns: ["habit_id"]
            isOneToOne: false
            referencedRelation: "habits"
            referencedColumns: ["id"]
          },
        ]
      }
      habits: {
        Row: {
          active: boolean
          category: string
          created_at: string
          current_streak: number
          description: string
          id: string
          longest_streak: number
          mission_id: string | null
          name: string
          sort_order: number
          submission_time: string
          timezone: string
          total_completions: number
          user_id: string
          vacation_end: string | null
          vacation_start: string | null
        }
        Insert: {
          active?: boolean
          category?: string
          created_at?: string
          current_streak?: number
          description?: string
          id?: string
          longest_streak?: number
          mission_id?: string | null
          name: string
          sort_order?: number
          submission_time?: string
          timezone?: string
          total_completions?: number
          user_id: string
          vacation_end?: string | null
          vacation_start?: string | null
        }
        Update: {
          active?: boolean
          category?: string
          created_at?: string
          current_streak?: number
          description?: string
          id?: string
          longest_streak?: number
          mission_id?: string | null
          name?: string
          sort_order?: number
          submission_time?: string
          timezone?: string
          total_completions?: number
          user_id?: string
          vacation_end?: string | null
          vacation_start?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "habits_mission_id_fkey"
            columns: ["mission_id"]
            isOneToOne: false
            referencedRelation: "life_nodes"
            referencedColumns: ["id"]
          },
        ]
      }
      life_node_logs: {
        Row: {
          created_at: string
          date: string
          done: boolean
          id: string
          node_id: string
          reflection: string
          user_id: string
          value_added: number
        }
        Insert: {
          created_at?: string
          date: string
          done?: boolean
          id?: string
          node_id: string
          reflection?: string
          user_id: string
          value_added?: number
        }
        Update: {
          created_at?: string
          date?: string
          done?: boolean
          id?: string
          node_id?: string
          reflection?: string
          user_id?: string
          value_added?: number
        }
        Relationships: [
          {
            foreignKeyName: "life_node_logs_node_id_fkey"
            columns: ["node_id"]
            isOneToOne: false
            referencedRelation: "life_nodes"
            referencedColumns: ["id"]
          },
        ]
      }
      life_nodes: {
        Row: {
          color: string
          completed_at: string | null
          created_at: string
          current_value: number
          description: string
          due_date: string | null
          icon: string
          id: string
          metadata: Json
          parent_id: string | null
          priority: number
          progress: number
          sort_order: number
          start_date: string | null
          status: string
          target_value: number | null
          title: string
          type: Database["public"]["Enums"]["life_node_type"]
          unit: string
          updated_at: string
          user_id: string
        }
        Insert: {
          color?: string
          completed_at?: string | null
          created_at?: string
          current_value?: number
          description?: string
          due_date?: string | null
          icon?: string
          id?: string
          metadata?: Json
          parent_id?: string | null
          priority?: number
          progress?: number
          sort_order?: number
          start_date?: string | null
          status?: string
          target_value?: number | null
          title: string
          type: Database["public"]["Enums"]["life_node_type"]
          unit?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          color?: string
          completed_at?: string | null
          created_at?: string
          current_value?: number
          description?: string
          due_date?: string | null
          icon?: string
          id?: string
          metadata?: Json
          parent_id?: string | null
          priority?: number
          progress?: number
          sort_order?: number
          start_date?: string | null
          status?: string
          target_value?: number | null
          title?: string
          type?: Database["public"]["Enums"]["life_node_type"]
          unit?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "life_nodes_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "life_nodes"
            referencedColumns: ["id"]
          },
        ]
      }
      lifeos_ai_insights: {
        Row: {
          body: string
          created_at: string
          id: string
          kind: string
          metadata: Json
          sent_to_telegram: boolean
          title: string
          user_id: string
        }
        Insert: {
          body?: string
          created_at?: string
          id?: string
          kind: string
          metadata?: Json
          sent_to_telegram?: boolean
          title?: string
          user_id: string
        }
        Update: {
          body?: string
          created_at?: string
          id?: string
          kind?: string
          metadata?: Json
          sent_to_telegram?: boolean
          title?: string
          user_id?: string
        }
        Relationships: []
      }
      market_scan_temp: {
        Row: {
          change_percent: number
          current_price: number
          fetched_at: string
          id: string
          pair: string
          previous_close: number
          scan_id: string
        }
        Insert: {
          change_percent?: number
          current_price?: number
          fetched_at?: string
          id?: string
          pair: string
          previous_close?: number
          scan_id: string
        }
        Update: {
          change_percent?: number
          current_price?: number
          fetched_at?: string
          id?: string
          pair?: string
          previous_close?: number
          scan_id?: string
        }
        Relationships: []
      }
      mind_thoughts: {
        Row: {
          content: string
          created_at: string
          date: string
          id: string
          image_url: string | null
          source: string
          tags: string[]
          telegram_message_id: number | null
          user_id: string
        }
        Insert: {
          content?: string
          created_at?: string
          date: string
          id?: string
          image_url?: string | null
          source?: string
          tags?: string[]
          telegram_message_id?: number | null
          user_id: string
        }
        Update: {
          content?: string
          created_at?: string
          date?: string
          id?: string
          image_url?: string | null
          source?: string
          tags?: string[]
          telegram_message_id?: number | null
          user_id?: string
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
      mt5_candles: {
        Row: {
          close: number
          high: number
          id: string
          low: number
          open: number
          open_time: string
          pushed_at: string
          real_volume: number
          symbol: string
          tick_volume: number
          timeframe: string
          volume: number
        }
        Insert: {
          close: number
          high: number
          id?: string
          low: number
          open: number
          open_time: string
          pushed_at?: string
          real_volume?: number
          symbol: string
          tick_volume?: number
          timeframe: string
          volume?: number
        }
        Update: {
          close?: number
          high?: number
          id?: string
          low?: number
          open?: number
          open_time?: string
          pushed_at?: string
          real_volume?: number
          symbol?: string
          tick_volume?: number
          timeframe?: string
          volume?: number
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
      namaz_reminders: {
        Row: {
          date: string
          id: string
          quote_sent: string
          sent_at: string
          waqt: string
        }
        Insert: {
          date?: string
          id?: string
          quote_sent?: string
          sent_at?: string
          waqt: string
        }
        Update: {
          date?: string
          id?: string
          quote_sent?: string
          sent_at?: string
          waqt?: string
        }
        Relationships: []
      }
      price_snapshots: {
        Row: {
          pair: string
          previous_price: number | null
          price: number
          updated_at: string
        }
        Insert: {
          pair: string
          previous_price?: number | null
          price: number
          updated_at?: string
        }
        Update: {
          pair?: string
          previous_price?: number | null
          price?: number
          updated_at?: string
        }
        Relationships: []
      }
      psychology_logs: {
        Row: {
          created_at: string
          date: string
          emotions: string[]
          id: string
          intention: string
          life_stress: number
          mental_state: number
          overall_score: number
          reflection: string
          rule_adherence: boolean
          sleep_quality: number
          user_id: string | null
        }
        Insert: {
          created_at?: string
          date: string
          emotions?: string[]
          id?: string
          intention?: string
          life_stress?: number
          mental_state?: number
          overall_score?: number
          reflection?: string
          rule_adherence?: boolean
          sleep_quality?: number
          user_id?: string | null
        }
        Update: {
          created_at?: string
          date?: string
          emotions?: string[]
          id?: string
          intention?: string
          life_stress?: number
          mental_state?: number
          overall_score?: number
          reflection?: string
          rule_adherence?: boolean
          sleep_quality?: number
          user_id?: string | null
        }
        Relationships: []
      }
      push_subscriptions: {
        Row: {
          auth: string
          created_at: string
          endpoint: string
          id: string
          p256dh: string
          user_id: string
        }
        Insert: {
          auth: string
          created_at?: string
          endpoint: string
          id?: string
          p256dh: string
          user_id: string
        }
        Update: {
          auth?: string
          created_at?: string
          endpoint?: string
          id?: string
          p256dh?: string
          user_id?: string
        }
        Relationships: []
      }
      rule_categories: {
        Row: {
          color: string
          created_at: string
          id: string
          name: string
          user_id: string
        }
        Insert: {
          color?: string
          created_at?: string
          id?: string
          name: string
          user_id: string
        }
        Update: {
          color?: string
          created_at?: string
          id?: string
          name?: string
          user_id?: string
        }
        Relationships: []
      }
      session_pair_recommendations: {
        Row: {
          adr_remaining: number
          atr_status: string
          bias_4h: string
          created_at: string
          daily_structure: string
          differential: number
          direction: string
          divergence_strength: string
          divergence_type: string
          id: string
          is_qualified: boolean
          overextension_pct: number
          pair: string
          rank: number
          reasoning: string
          rsi_value: number
          scan_batch_id: string
          scanned_at: string
          session: string
          total_score: number
        }
        Insert: {
          adr_remaining?: number
          atr_status?: string
          bias_4h?: string
          created_at?: string
          daily_structure?: string
          differential?: number
          direction?: string
          divergence_strength?: string
          divergence_type?: string
          id?: string
          is_qualified?: boolean
          overextension_pct?: number
          pair: string
          rank?: number
          reasoning?: string
          rsi_value?: number
          scan_batch_id?: string
          scanned_at?: string
          session: string
          total_score?: number
        }
        Update: {
          adr_remaining?: number
          atr_status?: string
          bias_4h?: string
          created_at?: string
          daily_structure?: string
          differential?: number
          direction?: string
          divergence_strength?: string
          divergence_type?: string
          id?: string
          is_qualified?: boolean
          overextension_pct?: number
          pair?: string
          rank?: number
          reasoning?: string
          rsi_value?: number
          scan_batch_id?: string
          scanned_at?: string
          session?: string
          total_score?: number
        }
        Relationships: []
      }
      session_reminders: {
        Row: {
          alert_type: string
          created_at: string | null
          date: string
          id: string
          session_name: string
        }
        Insert: {
          alert_type: string
          created_at?: string | null
          date: string
          id?: string
          session_name: string
        }
        Update: {
          alert_type?: string
          created_at?: string | null
          date?: string
          id?: string
          session_name?: string
        }
        Relationships: []
      }
      spike_thresholds: {
        Row: {
          category: string
          cooldown_minutes: number
          id: string
          threshold_percent: number
          updated_at: string
        }
        Insert: {
          category: string
          cooldown_minutes?: number
          id?: string
          threshold_percent: number
          updated_at?: string
        }
        Update: {
          category?: string
          cooldown_minutes?: number
          id?: string
          threshold_percent?: number
          updated_at?: string
        }
        Relationships: []
      }
      telegram_bot_state: {
        Row: {
          id: number
          update_offset: number
          updated_at: string
        }
        Insert: {
          id: number
          update_offset?: number
          updated_at?: string
        }
        Update: {
          id?: number
          update_offset?: number
          updated_at?: string
        }
        Relationships: []
      }
      trades: {
        Row: {
          confidence_level: number
          created_at: string
          date: string
          direction: string
          during_situation: string
          entry_price: number
          entry_screenshots: string[]
          exit_price: number
          exit_screenshots: string[]
          id: string
          improvement_notes: string
          lot_size: number
          mission_id: string | null
          mistakes: string[]
          outcome: string
          pair: string
          partial_closes: Json
          pips: number
          plan_adherence: boolean
          pnl: number
          post_situation: string
          post_trade_notes: string
          pre_situation: string
          pre_trade_notes: string
          psychology_emotion: string
          psychology_state: number
          reason_for_entry: string
          revised_at: string | null
          revision_notes: string
          revision_rating: number | null
          revision_takeaway: string
          revision_would_take_again: boolean | null
          risk_dollars: number
          risk_percent: number
          rrr: number
          rule_checklist: Json
          rule_score: number
          screenshots: string[]
          session: string
          smc_tags: string[]
          starred: boolean
          status: string
          stop_loss: number
          strategy: string
          take_profit: number
          timeframe: string
          user_id: string | null
          what_went_well: string
        }
        Insert: {
          confidence_level?: number
          created_at?: string
          date: string
          direction: string
          during_situation?: string
          entry_price?: number
          entry_screenshots?: string[]
          exit_price?: number
          exit_screenshots?: string[]
          id?: string
          improvement_notes?: string
          lot_size?: number
          mission_id?: string | null
          mistakes?: string[]
          outcome?: string
          pair: string
          partial_closes?: Json
          pips?: number
          plan_adherence?: boolean
          pnl?: number
          post_situation?: string
          post_trade_notes?: string
          pre_situation?: string
          pre_trade_notes?: string
          psychology_emotion?: string
          psychology_state?: number
          reason_for_entry?: string
          revised_at?: string | null
          revision_notes?: string
          revision_rating?: number | null
          revision_takeaway?: string
          revision_would_take_again?: boolean | null
          risk_dollars?: number
          risk_percent?: number
          rrr?: number
          rule_checklist?: Json
          rule_score?: number
          screenshots?: string[]
          session?: string
          smc_tags?: string[]
          starred?: boolean
          status?: string
          stop_loss?: number
          strategy?: string
          take_profit?: number
          timeframe?: string
          user_id?: string | null
          what_went_well?: string
        }
        Update: {
          confidence_level?: number
          created_at?: string
          date?: string
          direction?: string
          during_situation?: string
          entry_price?: number
          entry_screenshots?: string[]
          exit_price?: number
          exit_screenshots?: string[]
          id?: string
          improvement_notes?: string
          lot_size?: number
          mission_id?: string | null
          mistakes?: string[]
          outcome?: string
          pair?: string
          partial_closes?: Json
          pips?: number
          plan_adherence?: boolean
          pnl?: number
          post_situation?: string
          post_trade_notes?: string
          pre_situation?: string
          pre_trade_notes?: string
          psychology_emotion?: string
          psychology_state?: number
          reason_for_entry?: string
          revised_at?: string | null
          revision_notes?: string
          revision_rating?: number | null
          revision_takeaway?: string
          revision_would_take_again?: boolean | null
          risk_dollars?: number
          risk_percent?: number
          rrr?: number
          rule_checklist?: Json
          rule_score?: number
          screenshots?: string[]
          session?: string
          smc_tags?: string[]
          starred?: boolean
          status?: string
          stop_loss?: number
          strategy?: string
          take_profit?: number
          timeframe?: string
          user_id?: string | null
          what_went_well?: string
        }
        Relationships: [
          {
            foreignKeyName: "trades_mission_id_fkey"
            columns: ["mission_id"]
            isOneToOne: false
            referencedRelation: "life_nodes"
            referencedColumns: ["id"]
          },
        ]
      }
      trading_rules: {
        Row: {
          active: boolean
          category: string
          created_at: string
          id: string
          text: string
          user_id: string | null
        }
        Insert: {
          active?: boolean
          category?: string
          created_at?: string
          id?: string
          text: string
          user_id?: string | null
        }
        Update: {
          active?: boolean
          category?: string
          created_at?: string
          id?: string
          text?: string
          user_id?: string | null
        }
        Relationships: []
      }
      user_preferences: {
        Row: {
          preferences: Json
          updated_at: string
          user_id: string
        }
        Insert: {
          preferences?: Json
          updated_at?: string
          user_id: string
        }
        Update: {
          preferences?: Json
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      recompute_mission_habit_value: {
        Args: { _mission_id: string }
        Returns: undefined
      }
      recompute_mission_trading_value: {
        Args: { _mission_id: string }
        Returns: undefined
      }
      recompute_node_progress: {
        Args: { _node_id: string }
        Returns: undefined
      }
    }
    Enums: {
      life_node_type:
        | "vision"
        | "mission"
        | "yearly"
        | "quarterly"
        | "monthly"
        | "weekly"
        | "daily"
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
      life_node_type: [
        "vision",
        "mission",
        "yearly",
        "quarterly",
        "monthly",
        "weekly",
        "daily",
      ],
    },
  },
} as const
