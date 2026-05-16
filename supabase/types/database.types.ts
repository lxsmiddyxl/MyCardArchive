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
      achievements: {
        Row: {
          category: string
          created_at: string
          description: string
          icon: string
          id: string
          rarity: string
          requirement_type: string
          requirement_value: number
          slug: string
          title: string
        }
        Insert: {
          category?: string
          created_at?: string
          description: string
          icon: string
          id?: string
          rarity?: string
          requirement_type: string
          requirement_value: number
          slug: string
          title: string
        }
        Update: {
          category?: string
          created_at?: string
          description?: string
          icon?: string
          id?: string
          rarity?: string
          requirement_type?: string
          requirement_value?: number
          slug?: string
          title?: string
        }
        Relationships: []
      }
      archetype_catalog: {
        Row: {
          archetype_id: string
          description: string
          icon_key: string
          label: string
        }
        Insert: {
          archetype_id: string
          description: string
          icon_key: string
          label: string
        }
        Update: {
          archetype_id?: string
          description?: string
          icon_key?: string
          label?: string
        }
        Relationships: []
      }
      activity_log: {
        Row: {
          action: string
          created_at: string
          id: string
          metadata: Json
          trade_id: string | null
          user_id: string
        }
        Insert: {
          action: string
          created_at?: string
          id?: string
          metadata?: Json
          trade_id?: string | null
          user_id: string
        }
        Update: {
          action?: string
          created_at?: string
          id?: string
          metadata?: Json
          trade_id?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "activity_log_trade_id_fkey"
            columns: ["trade_id"]
            isOneToOne: false
            referencedRelation: "trades"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "activity_log_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      binders: {
        Row: {
          created_at: string
          description: string | null
          id: string
          name: string
          user_id: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          name: string
          user_id: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          name?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "binders_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      binder_slots: {
        Row: {
          binder_id: string
          card_id: string | null
          created_at: string
          id: string
          page_number: number
          slot_index: number
        }
        Insert: {
          binder_id: string
          card_id?: string | null
          created_at?: string
          id?: string
          page_number?: number
          slot_index: number
        }
        Update: {
          binder_id?: string
          card_id?: string | null
          created_at?: string
          id?: string
          page_number?: number
          slot_index?: number
        }
        Relationships: [
          {
            foreignKeyName: "binder_slots_binder_id_fkey"
            columns: ["binder_id"]
            isOneToOne: false
            referencedRelation: "binders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "binder_slots_card_id_fkey"
            columns: ["card_id"]
            isOneToOne: false
            referencedRelation: "cards"
            referencedColumns: ["id"]
          },
        ]
      }
      cards: {
        Row: {
          binder_id: string
          catalog_card_id: string | null
          created_at: string
          for_trade: boolean
          id: string
          image_url: string | null
          looking_for: boolean
          name: string
          name_tsv: unknown
          number: string | null
          rarity: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          binder_id: string
          catalog_card_id?: string | null
          created_at?: string
          for_trade?: boolean
          id?: string
          image_url?: string | null
          looking_for?: boolean
          name: string
          number?: string | null
          rarity?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          binder_id?: string
          catalog_card_id?: string | null
          created_at?: string
          for_trade?: boolean
          id?: string
          image_url?: string | null
          looking_for?: boolean
          name?: string
          number?: string | null
          rarity?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "cards_binder_id_fkey"
            columns: ["binder_id"]
            isOneToOne: false
            referencedRelation: "binders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cards_catalog_card_id_fkey"
            columns: ["catalog_card_id"]
            isOneToOne: false
            referencedRelation: "catalog_cards"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cards_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      catalog_cards: {
        Row: {
          created_at: string
          id: string
          image_large: string | null
          image_small: string | null
          image_url: string | null
          legal_commander: boolean
          legal_expanded: boolean
          legal_standard: boolean
          legal_unlimited: boolean
          name: string
          number: string
          rarity: string | null
          set_id: string
          subtypes: string[]
          supertype: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          id: string
          image_large?: string | null
          image_small?: string | null
          legal_commander?: boolean
          legal_expanded?: boolean
          legal_standard?: boolean
          legal_unlimited?: boolean
          name: string
          number?: string
          rarity?: string | null
          set_id: string
          subtypes?: string[]
          supertype?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          image_large?: string | null
          image_small?: string | null
          legal_commander?: boolean
          legal_expanded?: boolean
          legal_standard?: boolean
          legal_unlimited?: boolean
          name?: string
          number?: string
          rarity?: string | null
          set_id?: string
          subtypes?: string[]
          supertype?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "catalog_cards_set_id_fkey"
            columns: ["set_id"]
            isOneToOne: false
            referencedRelation: "catalog_sets"
            referencedColumns: ["id"]
          },
        ]
      }
      catalog_sets: {
        Row: {
          created_at: string
          id: string
          logo_url: string | null
          name: string
          printed_total: number | null
          publisher: string | null
          release_date: string | null
          release_year: number | null
          series: string
          set_code: string | null
          symbol_url: string | null
          total: number | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          id: string
          logo_url?: string | null
          name: string
          printed_total?: number | null
          publisher?: string | null
          release_date?: string | null
          release_year?: number | null
          series?: string
          set_code?: string | null
          symbol_url?: string | null
          total?: number | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          logo_url?: string | null
          name?: string
          printed_total?: number | null
          publisher?: string | null
          release_date?: string | null
          release_year?: number | null
          series?: string
          set_code?: string | null
          symbol_url?: string | null
          total?: number | null
          updated_at?: string
        }
        Relationships: []
      }
      community_post_comments: {
        Row: {
          author_id: string
          body: string
          created_at: string
          hidden: boolean
          id: string
          parent_comment_id: string | null
          post_id: string
        }
        Insert: {
          author_id: string
          body: string
          created_at?: string
          hidden?: boolean
          id?: string
          parent_comment_id?: string | null
          post_id: string
        }
        Update: {
          author_id?: string
          body?: string
          created_at?: string
          hidden?: boolean
          id?: string
          parent_comment_id?: string | null
          post_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "community_post_comments_author_id_fkey"
            columns: ["author_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "community_post_comments_parent_comment_id_fkey"
            columns: ["parent_comment_id"]
            isOneToOne: false
            referencedRelation: "community_post_comments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "community_post_comments_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "community_posts"
            referencedColumns: ["id"]
          },
        ]
      }
      community_post_reactions: {
        Row: {
          created_at: string
          post_id: string
          reaction: string
          user_id: string
        }
        Insert: {
          created_at?: string
          post_id: string
          reaction: string
          user_id: string
        }
        Update: {
          created_at?: string
          post_id?: string
          reaction?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "community_post_reactions_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "community_posts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "community_post_reactions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      community_post_likes: {
        Row: {
          created_at: string
          post_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          post_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          post_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "community_post_likes_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "community_posts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "community_post_likes_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      community_posts: {
        Row: {
          author_id: string
          body: string
          created_at: string
          id: string
          thread_id: string | null
          updated_at: string
        }
        Insert: {
          author_id: string
          body: string
          created_at?: string
          id?: string
          thread_id?: string | null
          updated_at?: string
        }
        Update: {
          author_id?: string
          body?: string
          created_at?: string
          id?: string
          thread_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "community_posts_author_id_fkey"
            columns: ["author_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      collection_showcases: {
        Row: {
          analytics_saves: number
          analytics_views: number
          binder_ids: string[]
          created_at: string
          description: string | null
          featured_card_ids: string[]
          id: string
          long_form_body: string | null
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          analytics_saves?: number
          analytics_views?: number
          binder_ids?: string[]
          created_at?: string
          description?: string | null
          featured_card_ids?: string[]
          id?: string
          long_form_body?: string | null
          title: string
          updated_at?: string
          user_id: string
        }
        Update: {
          analytics_saves?: number
          analytics_views?: number
          binder_ids?: string[]
          created_at?: string
          description?: string | null
          featured_card_ids?: string[]
          id?: string
          long_form_body?: string | null
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "collection_showcases_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      showcase_version_snapshots: {
        Row: {
          actor_id: string
          created_at: string
          description: string | null
          id: string
          long_form_body: string | null
          seq: number
          showcase_id: string
          title: string
        }
        Insert: {
          actor_id: string
          created_at?: string
          description?: string | null
          id?: string
          long_form_body?: string | null
          seq: number
          showcase_id: string
          title: string
        }
        Update: {
          actor_id?: string
          created_at?: string
          description?: string | null
          id?: string
          long_form_body?: string | null
          seq?: number
          showcase_id?: string
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "showcase_version_snapshots_showcase_id_fkey"
            columns: ["showcase_id"]
            isOneToOne: false
            referencedRelation: "collection_showcases"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "showcase_version_snapshots_actor_id_fkey"
            columns: ["actor_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      deck_cards: {
        Row: {
          card_id: string
          deck_id: string
          quantity: number
          section: string
        }
        Insert: {
          card_id: string
          deck_id: string
          quantity?: number
          section?: string
        }
        Update: {
          card_id?: string
          deck_id?: string
          quantity?: number
          section?: string
        }
        Relationships: [
          {
            foreignKeyName: "deck_cards_card_id_fkey"
            columns: ["card_id"]
            isOneToOne: false
            referencedRelation: "cards"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "deck_cards_deck_id_fkey"
            columns: ["deck_id"]
            isOneToOne: false
            referencedRelation: "decks"
            referencedColumns: ["id"]
          },
        ]
      }
      deck_stats: {
        Row: {
          color_identity: string[]
          deck_id: string
          legality_status: string
          synergy_score: number
          total_cards: number
          unique_cards: number
          updated_at: string
        }
        Insert: {
          color_identity?: string[]
          deck_id: string
          legality_status?: string
          synergy_score?: number
          total_cards?: number
          unique_cards?: number
          updated_at?: string
        }
        Update: {
          color_identity?: string[]
          deck_id?: string
          legality_status?: string
          synergy_score?: number
          total_cards?: number
          unique_cards?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "deck_stats_deck_id_fkey"
            columns: ["deck_id"]
            isOneToOne: true
            referencedRelation: "decks"
            referencedColumns: ["id"]
          },
        ]
      }
      decks: {
        Row: {
          created_at: string
          description: string
          estimated_value: number | null
          format: string
          id: string
          is_public: boolean
          name: string
          rarity_distribution: Json | null
          set_distribution: Json | null
          top_cards: Json | null
          type_distribution: Json | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          description?: string
          estimated_value?: number | null
          format?: string
          id?: string
          is_public?: boolean
          name: string
          rarity_distribution?: Json | null
          set_distribution?: Json | null
          top_cards?: Json | null
          type_distribution?: Json | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          description?: string
          estimated_value?: number | null
          format?: string
          id?: string
          is_public?: boolean
          name?: string
          rarity_distribution?: Json | null
          set_distribution?: Json | null
          top_cards?: Json | null
          type_distribution?: Json | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      deck_guides: {
        Row: {
          analytics_saves: number
          analytics_views: number
          created_at: string
          deck_id: string
          description: string | null
          highlights: Json
          id: string
          premium_sections: Json
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          analytics_saves?: number
          analytics_views?: number
          created_at?: string
          deck_id: string
          description?: string | null
          highlights?: Json
          id?: string
          premium_sections?: Json
          title: string
          updated_at?: string
          user_id: string
        }
        Update: {
          analytics_saves?: number
          analytics_views?: number
          created_at?: string
          deck_id?: string
          description?: string | null
          highlights?: Json
          id?: string
          premium_sections?: Json
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "deck_guides_deck_id_fkey"
            columns: ["deck_id"]
            isOneToOne: true
            referencedRelation: "decks"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "deck_guides_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      feed_events: {
        Row: {
          actor_id: string
          created_at: string
          id: string
          kind: string
          payload: Json
          subject_id: string | null
        }
        Insert: {
          actor_id: string
          created_at?: string
          id?: string
          kind: string
          payload?: Json
          subject_id?: string | null
        }
        Update: {
          actor_id?: string
          created_at?: string
          id?: string
          kind?: string
          payload?: Json
          subject_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "feed_events_actor_id_fkey"
            columns: ["actor_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      feed_event_saves: {
        Row: {
          created_at: string
          feed_event_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          feed_event_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          feed_event_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "feed_event_saves_feed_event_id_fkey"
            columns: ["feed_event_id"]
            isOneToOne: false
            referencedRelation: "feed_events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "feed_event_saves_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      social_nods: {
        Row: {
          created_at: string
          from_user_id: string
          id: string
          to_user_id: string
        }
        Insert: {
          created_at?: string
          from_user_id: string
          id?: string
          to_user_id: string
        }
        Update: {
          created_at?: string
          from_user_id?: string
          id?: string
          to_user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "social_nods_from_user_id_fkey"
            columns: ["from_user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "social_nods_to_user_id_fkey"
            columns: ["to_user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      user_social_graph_v4: {
        Row: {
          narrative: Json
          updated_at: string
          user_id: string
        }
        Insert: {
          narrative?: Json
          updated_at?: string
          user_id: string
        }
        Update: {
          narrative?: Json
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_social_graph_v4_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      card_grading_runs: {
        Row: {
          card_id: string
          created_at: string
          id: string
          inference_source: string | null
          model_label: string | null
          model_version: string | null
          overall: number | null
          peer_card_id: string | null
          pipeline_version: string | null
          user_id: string
        }
        Insert: {
          card_id: string
          created_at?: string
          id?: string
          inference_source?: string | null
          model_label?: string | null
          model_version?: string | null
          overall?: number | null
          peer_card_id?: string | null
          pipeline_version?: string | null
          user_id: string
        }
        Update: {
          card_id?: string
          created_at?: string
          id?: string
          inference_source?: string | null
          model_label?: string | null
          model_version?: string | null
          overall?: number | null
          peer_card_id?: string | null
          pipeline_version?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "card_grading_runs_card_id_fkey"
            columns: ["card_id"]
            isOneToOne: false
            referencedRelation: "cards"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "card_grading_runs_peer_card_id_fkey"
            columns: ["peer_card_id"]
            isOneToOne: false
            referencedRelation: "cards"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "card_grading_runs_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      card_prices: {
        Row: {
          card_id: string
          created_at: string
          currency: string
          id: string
          market_price: number | null
          provider: string
          raw_json: Json
          updated_at: string
          user_id: string
        }
        Insert: {
          card_id: string
          created_at?: string
          currency?: string
          id?: string
          market_price?: number | null
          provider: string
          raw_json?: Json
          updated_at?: string
          user_id: string
        }
        Update: {
          card_id?: string
          created_at?: string
          currency?: string
          id?: string
          market_price?: number | null
          provider?: string
          raw_json?: Json
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "card_prices_card_id_fkey"
            columns: ["card_id"]
            isOneToOne: false
            referencedRelation: "cards"
            referencedColumns: ["id"]
          },
        ]
      }
      card_price_history: {
        Row: {
          card_id: string
          currency: string
          id: string
          market_price: number
          provider: string
          recorded_at: string
        }
        Insert: {
          card_id: string
          currency?: string
          id?: string
          market_price: number
          provider?: string
          recorded_at?: string
        }
        Update: {
          card_id?: string
          currency?: string
          id?: string
          market_price?: number
          provider?: string
          recorded_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "card_price_history_card_id_fkey"
            columns: ["card_id"]
            isOneToOne: false
            referencedRelation: "cards"
            referencedColumns: ["id"]
          },
        ]
      }
      grades: {
        Row: {
          company: string
          created_at: string | null
          grade: string | null
          id: string
          label_color: string | null
        }
        Insert: {
          company: string
          created_at?: string | null
          grade?: string | null
          id?: string
          label_color?: string | null
        }
        Update: {
          company?: string
          created_at?: string | null
          grade?: string | null
          id?: string
          label_color?: string | null
        }
        Relationships: []
      }
      grading_user_fingerprint: {
        Row: {
          calibration_offset: number | null
          fingerprint: string
          fusion_meta: Json
          model_versions: string[]
          stability_score: number | null
          updated_at: string
          user_id: string
        }
        Insert: {
          calibration_offset?: number | null
          fingerprint: string
          fusion_meta?: Json
          model_versions?: string[]
          stability_score?: number | null
          updated_at?: string
          user_id: string
        }
        Update: {
          calibration_offset?: number | null
          fingerprint?: string
          fusion_meta?: Json
          model_versions?: string[]
          stability_score?: number | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "grading_user_fingerprint_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      grading_user_drift_history: {
        Row: {
          calibration_delta: number | null
          computed_at: string
          expected_shift_7d: number
          id: string
          sample_size: number
          series: Json
          slope_per_day: number | null
          user_id: string
        }
        Insert: {
          calibration_delta?: number | null
          computed_at?: string
          expected_shift_7d?: number
          id?: string
          sample_size?: number
          series?: Json
          slope_per_day?: number | null
          user_id: string
        }
        Update: {
          calibration_delta?: number | null
          computed_at?: string
          expected_shift_7d?: number
          id?: string
          sample_size?: number
          series?: Json
          slope_per_day?: number | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "grading_user_drift_history_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      market_alert_prefs: {
        Row: {
          alert_ft_available: boolean
          alert_trade_overlap: boolean
          updated_at: string
          user_id: string
        }
        Insert: {
          alert_ft_available?: boolean
          alert_trade_overlap?: boolean
          updated_at?: string
          user_id: string
        }
        Update: {
          alert_ft_available?: boolean
          alert_trade_overlap?: boolean
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "market_alert_prefs_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      market_offer_events: {
        Row: {
          actor_id: string
          created_at: string
          event_type: string
          id: string
          offer_id: string
          thread_id: string
        }
        Insert: {
          actor_id: string
          created_at?: string
          event_type: string
          id?: string
          offer_id: string
          thread_id: string
        }
        Update: {
          actor_id?: string
          created_at?: string
          event_type?: string
          id?: string
          offer_id?: string
          thread_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "market_offer_events_actor_id_fkey"
            columns: ["actor_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "market_offer_events_offer_id_fkey"
            columns: ["offer_id"]
            isOneToOne: false
            referencedRelation: "market_offers"
            referencedColumns: ["id"]
          },
        ]
      }
      market_offer_revisions: {
        Row: {
          actor_id: string
          created_at: string
          id: string
          offer_id: string
          seq: number
          snapshot: Json
          thread_id: string
        }
        Insert: {
          actor_id: string
          created_at?: string
          id?: string
          offer_id: string
          seq: number
          snapshot: Json
          thread_id: string
        }
        Update: {
          actor_id?: string
          created_at?: string
          id?: string
          offer_id?: string
          seq?: number
          snapshot?: Json
          thread_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "market_offer_revisions_actor_id_fkey"
            columns: ["actor_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "market_offer_revisions_offer_id_fkey"
            columns: ["offer_id"]
            isOneToOne: false
            referencedRelation: "market_offers"
            referencedColumns: ["id"]
          },
        ]
      }
      market_offers: {
        Row: {
          body: string
          catalog_card_id: string | null
          created_at: string
          expires_at: string | null
          from_user_id: string
          id: string
          items_offered: Json
          items_requested: Json
          offer_notes: string | null
          parent_offer_id: string | null
          status: string
          thread_id: string
          to_user_id: string
          updated_at: string
        }
        Insert: {
          body: string
          catalog_card_id?: string | null
          created_at?: string
          expires_at?: string | null
          from_user_id: string
          id?: string
          items_offered?: Json
          items_requested?: Json
          offer_notes?: string | null
          parent_offer_id?: string | null
          status?: string
          thread_id?: string
          to_user_id: string
          updated_at?: string
        }
        Update: {
          body?: string
          catalog_card_id?: string | null
          created_at?: string
          expires_at?: string | null
          from_user_id?: string
          id?: string
          items_offered?: Json
          items_requested?: Json
          offer_notes?: string | null
          parent_offer_id?: string | null
          status?: string
          thread_id?: string
          to_user_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "market_offers_catalog_card_id_fkey"
            columns: ["catalog_card_id"]
            isOneToOne: false
            referencedRelation: "catalog_cards"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "market_offers_from_user_id_fkey"
            columns: ["from_user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "market_offers_parent_offer_id_fkey"
            columns: ["parent_offer_id"]
            isOneToOne: false
            referencedRelation: "market_offers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "market_offers_to_user_id_fkey"
            columns: ["to_user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      market_trade_rooms: {
        Row: {
          created_at: string
          thread_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          thread_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          thread_id?: string
          updated_at?: string
        }
        Relationships: []
      }
      market_trade_room_messages: {
        Row: {
          actor_id: string
          body: string
          created_at: string
          id: string
          thread_id: string
        }
        Insert: {
          actor_id: string
          body: string
          created_at?: string
          id?: string
          thread_id: string
        }
        Update: {
          actor_id?: string
          body?: string
          created_at?: string
          id?: string
          thread_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "market_trade_room_messages_actor_id_fkey"
            columns: ["actor_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      market_watchlist: {
        Row: {
          catalog_card_id: string
          created_at: string
          user_id: string
        }
        Insert: {
          catalog_card_id: string
          created_at?: string
          user_id: string
        }
        Update: {
          catalog_card_id?: string
          created_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "market_watchlist_catalog_card_id_fkey"
            columns: ["catalog_card_id"]
            isOneToOne: false
            referencedRelation: "catalog_cards"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "market_watchlist_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          body: string | null
          created_at: string
          id: string
          read_at: string | null
          title: string
          trade_id: string | null
          type: string
          user_id: string
        }
        Insert: {
          body?: string | null
          created_at?: string
          id?: string
          read_at?: string | null
          title: string
          trade_id?: string | null
          type: string
          user_id: string
        }
        Update: {
          body?: string | null
          created_at?: string
          id?: string
          read_at?: string | null
          title?: string
          trade_id?: string | null
          type?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "notifications_trade_id_fkey"
            columns: ["trade_id"]
            isOneToOne: false
            referencedRelation: "trades"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notifications_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          bio: string | null
          created_at: string
          display_name: string | null
          email: string | null
          favorite_card: string | null
          favorite_color: string | null
          favorite_set: string | null
          handle: string | null
          id: string
          joined_at: string
          location: string | null
          username: string | null
          website: string | null
        }
        Insert: {
          avatar_url?: string | null
          bio?: string | null
          created_at?: string
          display_name?: string | null
          email?: string | null
          favorite_card?: string | null
          favorite_color?: string | null
          favorite_set?: string | null
          handle?: string | null
          id?: string
          joined_at?: string
          location?: string | null
          username?: string | null
          website?: string | null
        }
        Update: {
          avatar_url?: string | null
          bio?: string | null
          created_at?: string
          display_name?: string | null
          email?: string | null
          favorite_card?: string | null
          favorite_color?: string | null
          favorite_set?: string | null
          handle?: string | null
          id?: string
          joined_at?: string
          location?: string | null
          username?: string | null
          website?: string | null
        }
        Relationships: []
      }
      stripe_customers: {
        Row: {
          created_at: string
          stripe_customer_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          stripe_customer_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          stripe_customer_id?: string
          user_id?: string
        }
        Relationships: []
      }
      stripe_scan_pack_grants: {
        Row: {
          bonus_scans: number
          checkout_session_id: string
          created_at: string
          pack_id: string
          user_id: string
        }
        Insert: {
          bonus_scans: number
          checkout_session_id: string
          created_at?: string
          pack_id: string
          user_id: string
        }
        Update: {
          bonus_scans?: number
          checkout_session_id?: string
          created_at?: string
          pack_id?: string
          user_id?: string
        }
        Relationships: []
      }
      scan_events: {
        Row: {
          card_id: string | null
          created_at: string
          id: string
          raw_text: string | null
          user_id: string
        }
        Insert: {
          card_id?: string | null
          created_at?: string
          id?: string
          raw_text?: string | null
          user_id: string
        }
        Update: {
          card_id?: string | null
          created_at?: string
          id?: string
          raw_text?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "scan_events_card_id_fkey"
            columns: ["card_id"]
            isOneToOne: false
            referencedRelation: "cards"
            referencedColumns: ["id"]
          },
        ]
      }
      sets: {
        Row: {
          created_at: string | null
          id: string
          name: string
          sport: string | null
          user_id: string | null
          year: number | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          name: string
          sport?: string | null
          user_id?: string | null
          year?: number | null
        }
        Update: {
          created_at?: string | null
          id?: string
          name?: string
          sport?: string | null
          user_id?: string | null
          year?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "sets_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      social_collection_stats_public: {
        Row: {
          binder_count: number
          card_count: number
          deck_count: number
          trade_count: number
          updated_at: string
          user_id: string
        }
        Insert: {
          binder_count?: number
          card_count?: number
          deck_count?: number
          trade_count?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          binder_count?: number
          card_count?: number
          deck_count?: number
          trade_count?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "social_collection_stats_public_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      social_public_activity: {
        Row: {
          action: string
          created_at: string
          id: string
          metadata: Json
          source_activity_id: string
          trade_id: string | null
          user_id: string
        }
        Insert: {
          action: string
          created_at: string
          id?: string
          metadata?: Json
          source_activity_id: string
          trade_id?: string | null
          user_id: string
        }
        Update: {
          action?: string
          created_at?: string
          id?: string
          metadata?: Json
          source_activity_id?: string
          trade_id?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "social_public_activity_source_activity_id_fkey"
            columns: ["source_activity_id"]
            isOneToOne: false
            referencedRelation: "activity_log"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "social_public_activity_trade_id_fkey"
            columns: ["trade_id"]
            isOneToOne: false
            referencedRelation: "trades"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "social_public_activity_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      seasonal_event_participation: {
        Row: {
          earned_at: string
          event_id: string
          id: string
          user_id: string
        }
        Insert: {
          earned_at?: string
          event_id: string
          id?: string
          user_id: string
        }
        Update: {
          earned_at?: string
          event_id?: string
          id?: string
          user_id?: string
        }
        Relationships: []
      }
      social_public_profiles: {
        Row: {
          avatar_url: string | null
          bio: string
          display_name: string | null
          favorite_card: string | null
          favorite_color: string | null
          favorite_set: string | null
          favorite_sets: Json
          handle: string | null
          joined_at: string
          location: string | null
          tier_slug: string | null
          updated_at: string
          user_id: string
          username: string | null
          website: string | null
        }
        Insert: {
          avatar_url?: string | null
          bio?: string
          display_name?: string | null
          favorite_card?: string | null
          favorite_color?: string | null
          favorite_set?: string | null
          favorite_sets?: Json
          handle?: string | null
          joined_at?: string
          location?: string | null
          tier_slug?: string | null
          updated_at?: string
          user_id: string
          username?: string | null
          website?: string | null
        }
        Update: {
          avatar_url?: string | null
          bio?: string
          display_name?: string | null
          favorite_card?: string | null
          favorite_color?: string | null
          favorite_set?: string | null
          favorite_sets?: Json
          handle?: string | null
          joined_at?: string
          location?: string | null
          tier_slug?: string | null
          updated_at?: string
          user_id?: string
          username?: string | null
          website?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "social_public_profiles_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      social_mutual_pairs: {
        Row: {
          updated_at: string
          user_high: string
          user_low: string
        }
        Insert: {
          updated_at?: string
          user_high: string
          user_low: string
        }
        Update: {
          updated_at?: string
          user_high?: string
          user_low?: string
        }
        Relationships: [
          {
            foreignKeyName: "social_mutual_pairs_user_high_fkey"
            columns: ["user_high"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "social_mutual_pairs_user_low_fkey"
            columns: ["user_low"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      tiers: {
        Row: {
          binder_limit: number | null
          card_limit: number | null
          created_at: string
          description: string | null
          id: string
          monthly_price: number
          name: string
          scan_limit: number | null
          slug: string
          sort_order: number
          yearly_price: number
        }
        Insert: {
          binder_limit?: number | null
          card_limit?: number | null
          created_at?: string
          description?: string | null
          id?: string
          monthly_price?: number
          name: string
          scan_limit?: number | null
          slug: string
          sort_order?: number
          yearly_price?: number
        }
        Update: {
          binder_limit?: number | null
          card_limit?: number | null
          created_at?: string
          description?: string | null
          id?: string
          monthly_price?: number
          name?: string
          scan_limit?: number | null
          slug?: string
          sort_order?: number
          yearly_price?: number
        }
        Relationships: []
      }
      trade_items: {
        Row: {
          card_id: string
          id: string
          owner_id: string
          quantity: number
          side: string
          trade_id: string
        }
        Insert: {
          card_id: string
          id?: string
          owner_id: string
          quantity: number
          side: string
          trade_id: string
        }
        Update: {
          card_id?: string
          id?: string
          owner_id?: string
          quantity?: number
          side?: string
          trade_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "trade_items_card_id_fkey"
            columns: ["card_id"]
            isOneToOne: false
            referencedRelation: "cards"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "trade_items_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "trade_items_trade_id_fkey"
            columns: ["trade_id"]
            isOneToOne: false
            referencedRelation: "trades"
            referencedColumns: ["id"]
          },
        ]
      }
      trade_messages: {
        Row: {
          created_at: string
          id: string
          message: string
          sender_id: string
          trade_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          message: string
          sender_id: string
          trade_id: string
        }
        Update: {
          created_at?: string
          id?: string
          message?: string
          sender_id?: string
          trade_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "trade_messages_sender_id_fkey"
            columns: ["sender_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "trade_messages_trade_id_fkey"
            columns: ["trade_id"]
            isOneToOne: false
            referencedRelation: "trades"
            referencedColumns: ["id"]
          },
        ]
      }
      trade_notifications: {
        Row: {
          body: string | null
          created_at: string
          id: string
          kind: string
          read_at: string | null
          title: string
          trade_id: string
          user_id: string
        }
        Insert: {
          body?: string | null
          created_at?: string
          id?: string
          kind: string
          read_at?: string | null
          title: string
          trade_id: string
          user_id: string
        }
        Update: {
          body?: string | null
          created_at?: string
          id?: string
          kind?: string
          read_at?: string | null
          title?: string
          trade_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "trade_notifications_trade_id_fkey"
            columns: ["trade_id"]
            isOneToOne: false
            referencedRelation: "trades"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "trade_notifications_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      trades: {
        Row: {
          counterparty_id: string
          created_at: string
          created_by: string
          id: string
          status: string
          updated_at: string
        }
        Insert: {
          counterparty_id: string
          created_at?: string
          created_by: string
          id?: string
          status?: string
          updated_at?: string
        }
        Update: {
          counterparty_id?: string
          created_at?: string
          created_by?: string
          id?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "trades_counterparty_id_fkey"
            columns: ["counterparty_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "trades_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      user_achievements: {
        Row: {
          achievement_id: string
          unlocked_at: string
          user_id: string
        }
        Insert: {
          achievement_id: string
          unlocked_at?: string
          user_id: string
        }
        Update: {
          achievement_id?: string
          unlocked_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_achievements_achievement_id_fkey"
            columns: ["achievement_id"]
            isOneToOne: false
            referencedRelation: "achievements"
            referencedColumns: ["id"]
          },
        ]
      }
      user_activity_log: {
        Row: {
          activity_date: string
          activity_ts: string
          activity_type: string
          id: string
          metadata: Json
          user_id: string
        }
        Insert: {
          activity_date: string
          activity_ts: string
          activity_type: string
          id?: string
          metadata?: Json
          user_id: string
        }
        Update: {
          activity_date?: string
          activity_ts?: string
          activity_type?: string
          id?: string
          metadata?: Json
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_activity_log_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      user_activity_streaks: {
        Row: {
          last_active_date: string | null
          streak_count: number
          user_id: string
        }
        Insert: {
          last_active_date?: string | null
          streak_count?: number
          user_id: string
        }
        Update: {
          last_active_date?: string | null
          streak_count?: number
          user_id?: string
        }
        Relationships: []
      }
      user_fandom_identity: {
        Row: {
          favorite_artist_id: string | null
          favorite_character_id: string | null
          favorite_era_id: string | null
          favorite_set_id: string | null
          favorite_theme_id: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          favorite_artist_id?: string | null
          favorite_character_id?: string | null
          favorite_era_id?: string | null
          favorite_set_id?: string | null
          favorite_theme_id?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          favorite_artist_id?: string | null
          favorite_character_id?: string | null
          favorite_era_id?: string | null
          favorite_set_id?: string | null
          favorite_theme_id?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_fandom_identity_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      user_follows: {
        Row: {
          created_at: string
          follower_id: string
          following_id: string
        }
        Insert: {
          created_at?: string
          follower_id: string
          following_id: string
        }
        Update: {
          created_at?: string
          follower_id?: string
          following_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_follows_follower_id_fkey"
            columns: ["follower_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_follows_following_id_fkey"
            columns: ["following_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      user_havelist_index: {
        Row: {
          card_id: string
          created_at: string
          quantity: number
          user_id: string
        }
        Insert: {
          card_id: string
          created_at?: string
          quantity: number
          user_id: string
        }
        Update: {
          card_id?: string
          created_at?: string
          quantity?: number
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_havelist_index_card_id_fkey"
            columns: ["card_id"]
            isOneToOne: false
            referencedRelation: "cards"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_havelist_index_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      user_journey_progress: {
        Row: {
          completed_at: string | null
          completed_steps: number
          id: string
          is_complete: boolean
          journey_id: string
          user_id: string
        }
        Insert: {
          completed_at?: string | null
          completed_steps?: number
          id?: string
          is_complete?: boolean
          journey_id: string
          user_id: string
        }
        Update: {
          completed_at?: string | null
          completed_steps?: number
          id?: string
          is_complete?: boolean
          journey_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_journey_progress_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      user_collection_mastery: {
        Row: {
          completed_at: string | null
          completed_count: number
          id: string
          is_complete: boolean
          mastery_key: string
          mastery_type: string
          user_id: string
        }
        Insert: {
          completed_at?: string | null
          completed_count?: number
          id?: string
          is_complete?: boolean
          mastery_key: string
          mastery_type: string
          user_id: string
        }
        Update: {
          completed_at?: string | null
          completed_count?: number
          id?: string
          is_complete?: boolean
          mastery_key?: string
          mastery_type?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_collection_mastery_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      user_collection_value_cache: {
        Row: {
          user_id: string
          estimated_value_cents: number
          total_cards: number
          unique_cards: number
          high_rarity_count: number
          last_refreshed_at: string
        }
        Insert: {
          user_id: string
          estimated_value_cents?: number
          total_cards?: number
          unique_cards?: number
          high_rarity_count?: number
          last_refreshed_at?: string
        }
        Update: {
          user_id?: string
          estimated_value_cents?: number
          total_cards?: number
          unique_cards?: number
          high_rarity_count?: number
          last_refreshed_at?: string
        }
        Relationships: []
      }
      user_grail_cards: {
        Row: {
          id: string
          user_id: string
          card_id: string
          note: string | null
          added_at: string
        }
        Insert: {
          id?: string
          user_id: string
          card_id: string
          note?: string | null
          added_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          card_id?: string
          note?: string | null
          added_at?: string
        }
        Relationships: []
      }
      user_badges: {
        Row: {
          badge_key: string
          badge_type: string
          earned_at: string
          id: string
          user_id: string
        }
        Insert: {
          badge_key: string
          badge_type: string
          earned_at?: string
          id?: string
          user_id: string
        }
        Update: {
          badge_key?: string
          badge_type?: string
          earned_at?: string
          id?: string
          user_id?: string
        }
        Relationships: []
      }
      user_badge_events: {
        Row: {
          id: string
          user_id: string
          event_type: string
          badge_type: string | null
          badge_key: string | null
          weight: number
          metadata: Json
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          event_type: string
          badge_type?: string | null
          badge_key?: string | null
          weight?: number
          metadata?: Json
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          event_type?: string
          badge_type?: string | null
          badge_key?: string | null
          weight?: number
          metadata?: Json
          created_at?: string
        }
        Relationships: []
      }
      user_badge_progress: {
        Row: {
          user_id: string
          badge_type: string
          badge_key: string
          tier: string
          qualitative_label: string
          prestige_step: number | null
          prestige_steps_total: number | null
          season_label: string | null
          updated_at: string
        }
        Insert: {
          user_id: string
          badge_type?: string
          badge_key: string
          tier?: string
          qualitative_label?: string
          prestige_step?: number | null
          prestige_steps_total?: number | null
          season_label?: string | null
          updated_at?: string
        }
        Update: {
          user_id?: string
          badge_type?: string
          badge_key?: string
          tier?: string
          qualitative_label?: string
          prestige_step?: number | null
          prestige_steps_total?: number | null
          season_label?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      user_clubs: {
        Row: {
          assigned_at: string
          club_id: string
          user_id: string
        }
        Insert: {
          assigned_at?: string
          club_id: string
          user_id: string
        }
        Update: {
          assigned_at?: string
          club_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_clubs_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      user_archetypes: {
        Row: {
          archetype_id: string
          confidence_band: string
          updated_at: string
          user_id: string
        }
        Insert: {
          archetype_id: string
          confidence_band: string
          updated_at?: string
          user_id: string
        }
        Update: {
          archetype_id?: string
          confidence_band?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_archetypes_archetype_id_fkey"
            columns: ["archetype_id"]
            isOneToOne: false
            referencedRelation: "archetype_catalog"
            referencedColumns: ["archetype_id"]
          },
          {
            foreignKeyName: "user_archetypes_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      user_persona_cache: {
        Row: {
          persona_text: string
          updated_at: string
          user_id: string
        }
        Insert: {
          persona_text: string
          updated_at?: string
          user_id: string
        }
        Update: {
          persona_text?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_persona_cache_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      user_taste_vectors: {
        Row: {
          updated_at: string
          user_id: string
          vector: Json
        }
        Insert: {
          updated_at?: string
          user_id: string
          vector?: Json
        }
        Update: {
          updated_at?: string
          user_id?: string
          vector?: Json
        }
        Relationships: [
          {
            foreignKeyName: "user_taste_vectors_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      user_similarity_cache: {
        Row: {
          similarity_scores: number[]
          similar_user_ids: string[]
          updated_at: string
          user_id: string
        }
        Insert: {
          similarity_scores?: number[]
          similar_user_ids?: string[]
          updated_at?: string
          user_id: string
        }
        Update: {
          similarity_scores?: number[]
          similar_user_ids?: string[]
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_similarity_cache_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      user_presence: {
        Row: {
          device_type: string | null
          last_activity: string | null
          last_activity_at: string | null
          last_seen_at: string
          presence_opt_out: boolean
          presence_state: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          device_type?: string | null
          last_activity?: string | null
          last_activity_at?: string | null
          last_seen_at?: string
          presence_opt_out?: boolean
          presence_state?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          device_type?: string | null
          last_activity?: string | null
          last_activity_at?: string | null
          last_seen_at?: string
          presence_opt_out?: boolean
          presence_state?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_presence_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      user_presence_events: {
        Row: {
          created_at: string
          event_type: string
          id: string
          metadata: Json
          user_id: string
        }
        Insert: {
          created_at?: string
          event_type: string
          id?: string
          metadata?: Json
          user_id: string
        }
        Update: {
          created_at?: string
          event_type?: string
          id?: string
          metadata?: Json
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_presence_events_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      collector_rooms: {
        Row: {
          created_at: string
          expires_at: string
          room_id: string
          room_type: string
          topic_key: string | null
        }
        Insert: {
          created_at?: string
          expires_at: string
          room_id?: string
          room_type: string
          topic_key?: string | null
        }
        Update: {
          created_at?: string
          expires_at?: string
          room_id?: string
          room_type?: string
          topic_key?: string | null
        }
        Relationships: []
      }
      collector_room_members: {
        Row: {
          joined_at: string
          last_seen_at: string
          room_id: string
          user_id: string
        }
        Insert: {
          joined_at?: string
          last_seen_at?: string
          room_id: string
          user_id: string
        }
        Update: {
          joined_at?: string
          last_seen_at?: string
          room_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "collector_room_members_room_id_fkey"
            columns: ["room_id"]
            isOneToOne: false
            referencedRelation: "collector_rooms"
            referencedColumns: ["room_id"]
          },
          {
            foreignKeyName: "collector_room_members_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      collector_activity_wave_meta: {
        Row: {
          id: number
          last_refresh_at: string
          updated_at: string
        }
        Insert: {
          id?: number
          last_refresh_at?: string
          updated_at?: string
        }
        Update: {
          id?: number
          last_refresh_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      collector_activity_wave: {
        Row: {
          active_clubs: number
          active_collectors: number
          active_sets: number
          day_bucket: number
          hour_bucket: number
          wave_band: string
        }
        Insert: {
          active_clubs?: number
          active_collectors?: number
          active_sets?: number
          day_bucket: number
          hour_bucket: number
          wave_band: string
        }
        Update: {
          active_clubs?: number
          active_collectors?: number
          active_sets?: number
          day_bucket?: number
          hour_bucket?: number
          wave_band?: string
        }
        Relationships: []
      }
      set_activity_wave: {
        Row: {
          active_collectors: number
          day_bucket: number
          hour_bucket: number
          set_id: string
          wave_band: string
        }
        Insert: {
          active_collectors?: number
          day_bucket: number
          hour_bucket: number
          set_id: string
          wave_band: string
        }
        Update: {
          active_collectors?: number
          day_bucket?: number
          hour_bucket?: number
          set_id?: string
          wave_band?: string
        }
        Relationships: [
          {
            foreignKeyName: "set_activity_wave_set_id_fkey"
            columns: ["set_id"]
            isOneToOne: false
            referencedRelation: "catalog_sets"
            referencedColumns: ["id"]
          },
        ]
      }
      club_activity_wave: {
        Row: {
          active_collectors: number
          club_id: string
          day_bucket: number
          hour_bucket: number
          wave_band: string
        }
        Insert: {
          active_collectors?: number
          club_id: string
          day_bucket: number
          hour_bucket: number
          wave_band: string
        }
        Update: {
          active_collectors?: number
          club_id?: string
          day_bucket?: number
          hour_bucket?: number
          wave_band?: string
        }
        Relationships: []
      }
      seasonal_activity_wave: {
        Row: {
          active_collectors: number
          day_bucket: number
          hour_bucket: number
          season_id: string
          wave_band: string
        }
        Insert: {
          active_collectors?: number
          day_bucket: number
          hour_bucket: number
          season_id: string
          wave_band: string
        }
        Update: {
          active_collectors?: number
          day_bucket?: number
          hour_bucket?: number
          season_id?: string
          wave_band?: string
        }
        Relationships: []
      }
      user_search_index: {
        Row: {
          active_within_days: number | null
          binder_complete_count: number
          club_ids: string[]
          events_last_30d: number
          events_last_7d: number
          fandom_artist_id: string | null
          fandom_character_id: string | null
          fandom_era_id: string | null
          fandom_set_id: string | null
          fandom_theme_id: string | null
          journey_complete_ids: string[]
          persona_tokens: unknown
          play_archetype_id: string | null
          play_format_id: string | null
          presence_state: string | null
          primary_club_id: string | null
          rarity_profile: string | null
          seasonal_event_ids: string[]
          set_complete_count: number
          trade_tier: number
          updated_at: string
          user_id: string
          value_band: number
        }
        Insert: {
          active_within_days?: number | null
          binder_complete_count?: number
          club_ids?: string[]
          events_last_30d?: number
          events_last_7d?: number
          fandom_artist_id?: string | null
          fandom_character_id?: string | null
          fandom_era_id?: string | null
          fandom_set_id?: string | null
          fandom_theme_id?: string | null
          journey_complete_ids?: string[]
          persona_tokens?: unknown
          play_archetype_id?: string | null
          play_format_id?: string | null
          presence_state?: string | null
          primary_club_id?: string | null
          rarity_profile?: string | null
          seasonal_event_ids?: string[]
          set_complete_count?: number
          trade_tier?: number
          updated_at?: string
          user_id: string
          value_band?: number
        }
        Update: {
          active_within_days?: number | null
          binder_complete_count?: number
          club_ids?: string[]
          events_last_30d?: number
          events_last_7d?: number
          fandom_artist_id?: string | null
          fandom_character_id?: string | null
          fandom_era_id?: string | null
          fandom_set_id?: string | null
          fandom_theme_id?: string | null
          journey_complete_ids?: string[]
          persona_tokens?: unknown
          play_archetype_id?: string | null
          play_format_id?: string | null
          presence_state?: string | null
          primary_club_id?: string | null
          rarity_profile?: string | null
          seasonal_event_ids?: string[]
          set_complete_count?: number
          trade_tier?: number
          updated_at?: string
          user_id?: string
          value_band?: number
        }
        Relationships: [
          {
            foreignKeyName: "user_search_index_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      user_play_identity: {
        Row: {
          user_id: string
          favorite_format_id: string | null
          favorite_archetype_id: string | null
          favorite_deck_name: string | null
          updated_at: string
        }
        Insert: {
          user_id: string
          favorite_format_id?: string | null
          favorite_archetype_id?: string | null
          favorite_deck_name?: string | null
          updated_at?: string
        }
        Update: {
          user_id?: string
          favorite_format_id?: string | null
          favorite_archetype_id?: string | null
          favorite_deck_name?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      user_deck_stats: {
        Row: {
          id: string
          user_id: string
          deck_id: string
          total_cards: number
          unique_cards: number
          last_updated: string
        }
        Insert: {
          id?: string
          user_id: string
          deck_id: string
          total_cards?: number
          unique_cards?: number
          last_updated?: string
        }
        Update: {
          id?: string
          user_id?: string
          deck_id?: string
          total_cards?: number
          unique_cards?: number
          last_updated?: string
        }
        Relationships: []
      }
      user_reputation_cache: {
        Row: {
          score: number
          updated_at: string
          user_id: string
        }
        Insert: {
          score?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          score?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      user_reputation_graph: {
        Row: {
          user_id: string
          helpfulness_score: number
          expertise_score: number
          positivity_score: number
          reliability_score: number
          contribution_score: number
          updated_at: string
        }
        Insert: {
          user_id: string
          helpfulness_score?: number
          expertise_score?: number
          positivity_score?: number
          reliability_score?: number
          contribution_score?: number
          updated_at?: string
        }
        Update: {
          user_id?: string
          helpfulness_score?: number
          expertise_score?: number
          positivity_score?: number
          reliability_score?: number
          contribution_score?: number
          updated_at?: string
        }
        Relationships: []
      }
      user_reputation_events: {
        Row: {
          id: string
          user_id: string
          event_type: string
          weight: number
          metadata: Json
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          event_type: string
          weight?: number
          metadata?: Json
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          event_type?: string
          weight?: number
          metadata?: Json
          created_at?: string
        }
        Relationships: []
      }
      user_identity_map: {
        Row: {
          identity: Json
          updated_at: string
          user_id: string
        }
        Insert: {
          identity?: Json
          updated_at?: string
          user_id: string
        }
        Update: {
          identity?: Json
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_identity_map_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      user_influence_graph: {
        Row: {
          user_id: string
          identity_reach_score: number
          contribution_reach_score: number
          expertise_reach_score: number
          social_reach_score: number
          seasonal_reach_score: number
          updated_at: string
        }
        Insert: {
          user_id: string
          identity_reach_score?: number
          contribution_reach_score?: number
          expertise_reach_score?: number
          social_reach_score?: number
          seasonal_reach_score?: number
          updated_at?: string
        }
        Update: {
          user_id?: string
          identity_reach_score?: number
          contribution_reach_score?: number
          expertise_reach_score?: number
          social_reach_score?: number
          seasonal_reach_score?: number
          updated_at?: string
        }
        Relationships: []
      }
      user_influence_events: {
        Row: {
          id: string
          user_id: string
          event_type: string
          weight: number
          metadata: Json
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          event_type: string
          weight?: number
          metadata?: Json
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          event_type?: string
          weight?: number
          metadata?: Json
          created_at?: string
        }
        Relationships: []
      }
      user_season_summaries: {
        Row: {
          generated_at: string
          season_id: string
          summary_json: Json
          user_id: string
          year: number
        }
        Insert: {
          generated_at?: string
          season_id: string
          summary_json?: Json
          user_id: string
          year: number
        }
        Update: {
          generated_at?: string
          season_id?: string
          summary_json?: Json
          user_id?: string
          year?: number
        }
        Relationships: [
          {
            foreignKeyName: "user_season_summaries_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      user_shop_signals: {
        Row: {
          csv_export_count: number
          updated_at: string
          user_id: string
        }
        Insert: {
          csv_export_count?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          csv_export_count?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      user_year_in_review: {
        Row: {
          generated_at: string
          summary_json: Json
          user_id: string
          viewed_at: string | null
          year: number
        }
        Insert: {
          generated_at?: string
          summary_json?: Json
          user_id: string
          viewed_at?: string | null
          year: number
        }
        Update: {
          generated_at?: string
          summary_json?: Json
          user_id?: string
          viewed_at?: string | null
          year?: number
        }
        Relationships: [
          {
            foreignKeyName: "user_year_in_review_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      internal_unlimited: {
        Row: {
          created_at: string
          note: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          note?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          note?: string | null
          user_id?: string
        }
        Relationships: []
      }
      user_tiers: {
        Row: {
          binder_limit: number
          bonus_scans_remaining: number
          card_limit: number
          created_at: string
          scan_limit: number
          tier_slug: string
          updated_at: string
          user_id: string
        }
        Insert: {
          binder_limit?: number
          bonus_scans_remaining?: number
          card_limit?: number
          created_at?: string
          scan_limit?: number
          tier_slug?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          binder_limit?: number
          bonus_scans_remaining?: number
          card_limit?: number
          created_at?: string
          scan_limit?: number
          tier_slug?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      user_trade_feedback: {
        Row: {
          id: string
          from_user_id: string
          to_user_id: string
          rating: string
          comment: string | null
          created_at: string
        }
        Insert: {
          id?: string
          from_user_id: string
          to_user_id: string
          rating: string
          comment?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          from_user_id?: string
          to_user_id?: string
          rating?: string
          comment?: string | null
          created_at?: string
        }
        Relationships: []
      }
      user_trade_reputation: {
        Row: {
          user_id: string
          completed_trades_count: number
          positive_feedback_count: number
          neutral_feedback_count: number
          negative_feedback_count: number
          last_trade_at: string | null
          updated_at: string
        }
        Insert: {
          user_id: string
          completed_trades_count?: number
          positive_feedback_count?: number
          neutral_feedback_count?: number
          negative_feedback_count?: number
          last_trade_at?: string | null
          updated_at?: string
        }
        Update: {
          user_id?: string
          completed_trades_count?: number
          positive_feedback_count?: number
          neutral_feedback_count?: number
          negative_feedback_count?: number
          last_trade_at?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      user_wantlist_index: {
        Row: {
          card_id: string
          created_at: string
          quantity: number
          user_id: string
        }
        Insert: {
          card_id: string
          created_at?: string
          quantity: number
          user_id: string
        }
        Update: {
          card_id?: string
          created_at?: string
          quantity?: number
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_wantlist_index_card_id_fkey"
            columns: ["card_id"]
            isOneToOne: false
            referencedRelation: "cards"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_wantlist_index_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      get_public_deck_gate: {
        Args: { p_deck_id: string }
        Returns: Json
      }
      get_public_deck_owner_display: {
        Args: { p_deck_id: string }
        Returns: string
      }
      get_deck_visibility: {
        Args: { p_deck_id: string }
        Returns: Json
      }
      apply_achievement_unlock: {
        Args: { achievement_slug: string; user_id: string }
        Returns: Json
      }
      apply_billing_user_tier: {
        Args: { p_tier_slug: string; p_user_id: string }
        Returns: undefined
      }
      ensure_social_public_profile_projection: {
        Args: { p_user_id: string }
        Returns: undefined
      }
      get_profile_public_counts: {
        Args: { p_user_id: string }
        Returns: {
          posts: number
          scans: number
          achievements: number
        }[]
      }
      get_club_members: {
        Args: {
          p_club_id: string
          p_limit: number
          p_offset: number
          p_viewer_id?: string | null
        }
        Returns: {
          user_id: string
          display_name: string
          username: string
          handle: string
          avatar_url: string
          persona_text: string
          similarity_score: number | null
        }[]
      }
      get_user_badges: {
        Args: { p_user_id: string }
        Returns: {
          id: string
          user_id: string
          badge_type: string
          badge_key: string
          earned_at: string
        }[]
      }
      get_user_clubs: {
        Args: { p_user_id: string }
        Returns: {
          club_id: string
          assigned_at: string
        }[]
      }
      get_users_clubs_batch: {
        Args: { p_user_ids: string[] }
        Returns: {
          user_id: string
          club_id: string
        }[]
      }
      get_user_journey_progress: {
        Args: { p_user_id: string }
        Returns: {
          journey_id: string
          completed_steps: number
          is_complete: boolean
          completed_at: string | null
        }[]
      }
      get_users_journey_progress_batch: {
        Args: { p_user_ids: string[] }
        Returns: {
          user_id: string
          journey_id: string
          completed_steps: number
          is_complete: boolean
          completed_at: string | null
        }[]
      }
      refresh_user_journey_progress: {
        Args: { p_user_id: string }
        Returns: undefined
      }
      upsert_user_journey_progress: {
        Args: {
          p_user_id: string
          p_journey_id: string
          p_completed_steps: number
          p_is_complete: boolean
        }
        Returns: undefined
      }
      get_user_collection_mastery: {
        Args: { p_user_id: string }
        Returns: {
          mastery_type: string
          mastery_key: string
          completed_count: number
          is_complete: boolean
          completed_at: string | null
        }[]
      }
      get_users_collection_mastery_batch: {
        Args: { p_user_ids: string[] }
        Returns: {
          user_id: string
          mastery_type: string
          mastery_key: string
          completed_count: number
          is_complete: boolean
          completed_at: string | null
        }[]
      }
      refresh_user_collection_mastery: {
        Args: { p_user_id: string }
        Returns: undefined
      }
      delete_user_grail_card: {
        Args: { p_user_id: string; p_card_id: string }
        Returns: undefined
      }
      get_user_collection_value: {
        Args: { p_user_id: string }
        Returns: {
          estimated_value_cents: number
          total_cards: number
          unique_cards: number
          high_rarity_count: number
          last_refreshed_at: string | null
        }[]
      }
      get_user_activity_heatmap: {
        Args: { p_user_id: string; p_year: number }
        Returns: number[]
      }
      get_user_activity_range: {
        Args: { p_end_date: string; p_start_date: string; p_user_id: string }
        Returns: {
          activity_date: string
          activity_type: string
          metadata: Json
        }[]
      }
      get_user_timeline_events: {
        Args: { p_user_id: string }
        Returns: {
          event_date: string
          event_type: string
          icon: string
          label: string
          metadata: Json
        }[]
      }
      get_user_latest_year_in_review: {
        Args: { p_user_id: string }
        Returns: {
          generated_at: string
          summary_json: Json
          viewed_at: string | null
          year: number
        }[]
      }
      get_user_season_summary: {
        Args: { p_user_id: string; p_year: number; p_season: string }
        Returns: {
          generated_at: string
          summary_json: Json
        }[]
      }
      get_user_year_in_review: {
        Args: { p_user_id: string; p_year: number }
        Returns: {
          generated_at: string
          summary_json: Json
          viewed_at: string | null
        }[]
      }
      get_users_season_highlight_batch: {
        Args: { p_user_ids: string[]; p_year: number; p_season: string }
        Returns: {
          highlight: string
          user_id: string
        }[]
      }
      get_users_season_summary_batch: {
        Args: { p_user_ids: string[]; p_year: number; p_season: string }
        Returns: {
          generated_at: string
          summary_json: Json
          user_id: string
        }[]
      }
      get_users_year_in_review_batch: {
        Args: { p_user_ids: string[]; p_year: number }
        Returns: {
          generated_at: string
          summary_json: Json
          user_id: string
          viewed_at: string | null
        }[]
      }
      get_users_yir_viewed_batch: {
        Args: { p_user_ids: string[] }
        Returns: {
          last_viewed_year: number
          user_id: string
        }[]
      }
      mark_year_in_review_viewed: {
        Args: { p_year: number }
        Returns: undefined
      }
      refresh_my_season_summary: {
        Args: { p_year: number; p_season: string }
        Returns: undefined
      }
      refresh_my_year_in_review: {
        Args: { p_year: number }
        Returns: undefined
      }
      scheduled_generate_year_in_review_for_user: {
        Args: { p_user_id: string; p_year: number }
        Returns: undefined
      }
      get_user_fandom_identity: {
        Args: { p_user_id: string }
        Returns: {
          user_id: string
          favorite_set_id: string | null
          favorite_era_id: string | null
          favorite_artist_id: string | null
          favorite_character_id: string | null
          favorite_theme_id: string | null
          updated_at: string
        }[]
      }
      get_users_fandom_identity_batch: {
        Args: { p_user_ids: string[] }
        Returns: {
          user_id: string
          favorite_set_id: string | null
          favorite_era_id: string | null
          favorite_artist_id: string | null
          favorite_character_id: string | null
          favorite_theme_id: string | null
          updated_at: string | null
        }[]
      }
      refresh_user_fandom_badges: {
        Args: { p_user_id: string }
        Returns: undefined
      }
      suggest_user_fandom_identity: {
        Args: { p_user_id: string }
        Returns: {
          suggested_set_id: string | null
          suggested_era_id: string | null
          suggested_artist_id: string | null
          suggested_character_id: string | null
          suggested_theme_id: string | null
        }[]
      }
      upsert_user_fandom_identity: {
        Args: {
          p_user_id: string
          p_favorite_set_id?: string | null
          p_favorite_era_id?: string | null
          p_favorite_artist_id?: string | null
          p_favorite_character_id?: string | null
          p_favorite_theme_id?: string | null
        }
        Returns: undefined
      }
      get_user_persona: {
        Args: { p_user_id: string }
        Returns: {
          user_id: string
          persona_text: string | null
          updated_at: string | null
        }[]
      }
      get_users_persona_batch: {
        Args: { p_user_ids: string[] }
        Returns: {
          user_id: string
          persona_text: string | null
          updated_at: string | null
        }[]
      }
      get_archetype_spotlights: {
        Args: { p_limit?: number }
        Returns: {
          archetype_id: string
          description: string
          icon_key: string
          label: string
          spotlight_note: string
        }[]
      }
      get_user_archetypes: {
        Args: { p_user_id: string }
        Returns: {
          archetype_id: string
          confidence_band: string
          description: string
          icon_key: string
          label: string
        }[]
      }
      get_users_archetypes_batch: {
        Args: { p_user_ids: string[] }
        Returns: {
          archetype_id: string
          confidence_band: string
          description: string
          icon_key: string
          label: string
          user_id: string
        }[]
      }
      get_identity_spotlights: {
        Args: { p_limit?: number }
        Returns: {
          blurb: string
          headline: string
          spotlight_key: string
        }[]
      }
      get_user_identity_map: {
        Args: { p_user_id: string }
        Returns: {
          identity: Json
          updated_at: string
        }[]
      }
      get_users_identity_map_batch: {
        Args: { p_user_ids: string[] }
        Returns: {
          identity: Json
          updated_at: string
          user_id: string
        }[]
      }
      get_users_activity_recent_days_batch: {
        Args: { p_days?: number; p_user_ids: string[] }
        Returns: {
          counts: number[]
          user_id: string
        }[]
      }
      get_users_activity_week_count_batch: {
        Args: { p_user_ids: string[] }
        Returns: {
          event_count: number
          user_id: string
        }[]
      }
      refresh_user_persona: {
        Args: { p_user_id: string }
        Returns: undefined
      }
      refresh_user_archetypes: {
        Args: { p_user_id: string }
        Returns: undefined
      }
      refresh_user_taste_vector: {
        Args: { p_user_id: string }
        Returns: undefined
      }
      refresh_user_identity_map: {
        Args: { p_user_id: string }
        Returns: undefined
      }
      refresh_user_similarity: {
        Args: { p_user_id: string }
        Returns: undefined
      }
      get_user_similarity: {
        Args: { p_user_id: string }
        Returns: {
          user_id: string
          similar_user_ids: string[] | null
          similarity_scores: number[] | null
          updated_at: string | null
        }[]
      }
      get_users_similarity_batch: {
        Args: { p_user_ids: string[] }
        Returns: {
          user_id: string
          similar_user_ids: string[] | null
          similarity_scores: number[] | null
          updated_at: string | null
        }[]
      }
      update_user_presence: {
        Args: { p_activity: string | null; p_user_id: string }
        Returns: undefined
      }
      touch_user_presence: {
        Args: { p_activity: string | null; p_user_id: string }
        Returns: undefined
      }
      get_user_presence: {
        Args: { p_user_id: string }
        Returns: {
          user_id: string
          last_seen_at: string | null
          last_activity: string | null
          last_activity_at: string | null
          presence_opt_out: boolean
          updated_at: string | null
        }[]
      }
      get_users_presence_batch: {
        Args: { p_user_ids: string[] }
        Returns: {
          user_id: string
          last_seen_at: string | null
          last_activity: string | null
          last_activity_at: string | null
          presence_opt_out: boolean
          updated_at: string | null
        }[]
      }
      refresh_user_presence: {
        Args: { p_device: string; p_state: string; p_user_id: string }
        Returns: undefined
      }
      log_user_presence_event: {
        Args: { p_event_type: string; p_metadata: Json; p_user_id: string }
        Returns: undefined
      }
      get_recently_active_collectors: {
        Args: { p_limit: number }
        Returns: {
          spotlight_note: string
          user_id: string
        }[]
      }
      get_presence_spotlights: {
        Args: { p_limit: number }
        Returns: {
          spotlight_note: string
          user_id: string
        }[]
      }
      dissolve_expired_rooms: {
        Args: Record<PropertyKey, never>
        Returns: undefined
      }
      refresh_collector_room: {
        Args: { p_room_type: string; p_topic_key: string; p_user_id: string }
        Returns: string | null
      }
      get_active_rooms_for_user: {
        Args: { p_user_id: string }
        Returns: {
          expires_at: string
          member_total: number
          room_id: string
          room_type: string
          topic_key: string | null
        }[]
      }
      get_room_members: {
        Args: { p_room_id: string }
        Returns: {
          avatar_url: string | null
          display_name: string | null
          user_id: string
          username: string | null
        }[]
      }
      get_room_spotlights: {
        Args: { p_limit: number }
        Returns: {
          note: string
        }[]
      }
      refresh_activity_waves: {
        Args: Record<PropertyKey, never>
        Returns: undefined
      }
      activity_count_to_wave_band: {
        Args: { p_count: number | null }
        Returns: string
      }
      activity_ntile_band: {
        Args: { p_ntile: number | null }
        Returns: string
      }
      get_platform_activity_wave: {
        Args: Record<PropertyKey, never>
        Returns: {
          day_bucket: number
          hour_bucket: number
          wave_band: string
        }[]
      }
      get_set_activity_wave: {
        Args: { p_set_id: string }
        Returns: {
          hour_bucket: number
          wave_band: string
        }[]
      }
      get_club_activity_wave: {
        Args: { p_club_id: string }
        Returns: {
          hour_bucket: number
          wave_band: string
        }[]
      }
      get_seasonal_activity_wave: {
        Args: { p_season_id: string }
        Returns: {
          hour_bucket: number
          wave_band: string
        }[]
      }
      get_activity_spotlights: {
        Args: { p_limit: number }
        Returns: {
          note: string
        }[]
      }
      get_user_grail_cards: {
        Args: { p_user_id: string }
        Returns: {
          card_id: string
          card_name: string
          note: string | null
          added_at: string
        }[]
      }
      get_users_collection_value_batch: {
        Args: { p_user_ids: string[] }
        Returns: {
          user_id: string
          estimated_value_cents: number
          total_cards: number
          unique_cards: number
          high_rarity_count: number
          last_refreshed_at: string | null
        }[]
      }
      get_users_grail_highlight_batch: {
        Args: { p_user_ids: string[] }
        Returns: {
          user_id: string
          grail_count: number
          highlight_name: string | null
        }[]
      }
      get_search_filter_options: {
        Args: Record<PropertyKey, never>
        Returns: Json
      }
      search_catalog_cards_v1: {
        Args: {
          p_limit?: number
          p_query: string
          p_set_id?: string | null
        }
        Returns: {
          id: string
          set_id: string | null
          name: string
          number: string
          rarity: string | null
          image_url: string | null
          set: string | null
          set_name?: string | null
        }[]
      }
      search_catalog_sets_v1: {
        Args: {
          p_limit?: number
          p_query: string
        }
        Returns: {
          id: string
          name: string
          series: string | null
          set_code: string | null
          release_year: number | null
          release_date: string | null
          total: number | null
          printed_total: number | null
          symbol_url: string | null
          logo_url: string | null
        }[]
      }
      search_collectors: {
        Args: {
          p_filters: Json
          p_limit: number
          p_offset: number
          p_viewer_id?: string | null
        }
        Returns: {
          user_id: string
          rank_score: number
          similarity_score: number | null
          persona_text: string | null
          display_name: string | null
          username: string | null
          handle: string | null
          avatar_url: string | null
          presence_state: string | null
          active_within_days: number | null
          primary_club_id: string | null
          club_ids: string[]
          events_last_7d: number
          events_last_30d: number
          play_format_id: string | null
          play_archetype_id: string | null
          fandom_era_id: string | null
          value_band: number
          trade_tier: number
        }[]
      }
      refresh_my_collection_value: {
        Args: Record<PropertyKey, never>
        Returns: undefined
      }
      refresh_user_clubs: {
        Args: { p_user_id: string }
        Returns: undefined
      }
      refresh_user_collection_value: {
        Args: { p_user_id: string }
        Returns: undefined
      }
      upsert_user_grail_card: {
        Args: { p_user_id: string; p_card_id: string; p_note: string | null }
        Returns: undefined
      }
      refresh_user_trade_reputation: {
        Args: { p_user_id: string }
        Returns: undefined
      }
      get_users_top_scan_milestones: {
        Args: { p_user_ids: string[] }
        Returns: {
          user_id: string
          badge_key: string
        }[]
      }
      get_users_trade_reputation_batch: {
        Args: { p_user_ids: string[] }
        Returns: {
          user_id: string
          completed_trades_count: number
          positive_feedback_count: number
          neutral_feedback_count: number
          negative_feedback_count: number
          last_trade_at: string | null
        }[]
      }
      get_user_reputation: {
        Args: { p_user_id: string }
        Returns: {
          score: number
          updated_at: string
          helpfulness_score: number
          expertise_score: number
          positivity_score: number
          reliability_score: number
          contribution_score: number
          graph_updated_at: string
        }[]
      }
      get_users_reputation_graph_batch: {
        Args: { p_user_ids: string[] }
        Returns: {
          user_id: string
          helpfulness_score: number
          expertise_score: number
          positivity_score: number
          reliability_score: number
          contribution_score: number
          updated_at: string
        }[]
      }
      get_reputation_leaders: {
        Args: { p_dimension: string; p_limit?: number | null }
        Returns: {
          user_id: string
          spotlight_note: string
        }[]
      }
      get_user_reputation_events_public: {
        Args: { p_user_id: string; p_limit?: number | null }
        Returns: {
          label: string
          occurred_on: string
        }[]
      }
      get_user_influence: {
        Args: { p_user_id: string }
        Returns: {
          identity_reach_score: number
          contribution_reach_score: number
          expertise_reach_score: number
          social_reach_score: number
          seasonal_reach_score: number
          updated_at: string
        }[]
      }
      get_users_influence_batch: {
        Args: { p_user_ids: string[] }
        Returns: {
          user_id: string
          identity_reach_score: number
          contribution_reach_score: number
          expertise_reach_score: number
          social_reach_score: number
          seasonal_reach_score: number
          updated_at: string
        }[]
      }
      get_influence_spotlights: {
        Args: { p_dimension: string; p_limit?: number | null }
        Returns: {
          user_id: string
          spotlight_note: string
        }[]
      }
      get_user_influence_events_public: {
        Args: { p_user_id: string; p_limit?: number | null }
        Returns: {
          label: string
          occurred_on: string
        }[]
      }
      get_user_badge_progress: {
        Args: { p_user_id: string }
        Returns: {
          badge_type: string
          badge_key: string
          catalog_category: string
          tier: string
          qualitative_label: string
          season_label: string | null
          prestige_step: number | null
          prestige_steps_total: number | null
          display_hint: string | null
        }[]
      }
      get_users_badge_progress_batch: {
        Args: { p_user_ids: string[] }
        Returns: {
          user_id: string
          badge_type: string
          badge_key: string
          catalog_category: string
          tier: string
          qualitative_label: string
          season_label: string | null
          prestige_step: number | null
          prestige_steps_total: number | null
          display_hint: string | null
        }[]
      }
      get_badge_spotlights: {
        Args: { p_category: string; p_limit?: number | null }
        Returns: {
          user_id: string
          spotlight_note: string
        }[]
      }
      get_user_trade_reputation: {
        Args: { p_user_id: string }
        Returns: {
          completed_trades_count: number
          positive_feedback_count: number
          neutral_feedback_count: number
          negative_feedback_count: number
          last_trade_at: string | null
        }[]
      }
      get_users_social_flair_context: {
        Args: { p_user_ids: string[] }
        Returns: {
          user_id: string
          reputation_score: number
          reputation_updated_at: string | null
          streak_count: number
          last_active_date: string | null
          csv_export_count: number
        }[]
      }
      get_users_seasonal_event_context: {
        Args: { p_user_ids: string[] }
        Returns: {
          user_id: string
          top_seasonal_badge_key: string | null
          seasonal_badge_keys: string[]
        }[]
      }
      record_csv_export_usage: {
        Args: { p_user_id: string }
        Returns: undefined
      }
      record_trade_feedback: {
        Args: {
          p_from_user_id: string
          p_to_user_id: string
          p_rating: string
          p_comment: string
        }
        Returns: undefined
      }
      community_set_comment_hidden: {
        Args: { p_comment_id: string; p_hidden: boolean }
        Returns: undefined
      }
      compute_deck_stats: {
        Args: { deck_id: string }
        Returns: undefined
      }
      compute_user_activity_heatmap: {
        Args: { p_user_id: string; p_year: number }
        Returns: number[]
      }
      compute_user_timeline_events: {
        Args: { p_user_id: string }
        Returns: {
          event_date: string
          event_type: string
          icon: string
          label: string
          metadata: Json
        }[]
      }
      get_market_discovery: {
        Args: Record<PropertyKey, never>
        Returns: Json
      }
      get_global_feed: {
        Args: { p_limit?: number; p_before?: string | null }
        Returns: Json
      }
      get_global_feed_v2: {
        Args: { p_limit?: number; p_before?: string | null }
        Returns: Json
      }
      get_global_feed_v3: {
        Args: { p_limit?: number; p_before?: string | null }
        Returns: Json
      }
      get_profile_feed_v3_signal_lines: {
        Args: { p_actor_id: string; p_events: Json }
        Returns: Json
      }
      get_users_social_graph_v4_batch: {
        Args: { p_user_ids: string[] }
        Returns: {
          narrative: Json
          updated_at: string
          user_id: string
        }[]
      }
      post_social_nod: {
        Args: { p_to_user_id: string }
        Returns: Json
      }
      refresh_my_social_graph_v4: {
        Args: Record<PropertyKey, never>
        Returns: undefined
      }
      get_grading_cohort_avg_overall: {
        Args: Record<PropertyKey, never>
        Returns: number
      }
      grading_compute_temporal_drift: {
        Args: { p_user_id: string }
        Returns: Json
      }
      grading_recalibrate_for_drift: {
        Args: { p_user_id: string }
        Returns: Json
      }
      get_market_auto_matches: {
        Args: Record<PropertyKey, never>
        Returns: Json
      }
      compute_multi_party_loops: {
        Args: { p_limit?: number; p_user_id: string }
        Returns: Json
      }
      compute_trade_graph_for_user: {
        Args: { p_user_id: string }
        Returns: Json
      }
      increment_deck_guide_views: {
        Args: { p_guide_id: string }
        Returns: undefined
      }
      increment_showcase_views: {
        Args: { p_showcase_id: string }
        Returns: undefined
      }
      get_social_recommendations: {
        Args: { p_limit?: number }
        Returns: Json
      }
      mock_upgrade_user_tier: {
        Args: { p_tier_slug: string }
        Returns: Json
      }
      consume_bonus_scan_if_needed: {
        Args: {
          p_user_id: string
          p_used_count_after: number
          p_scan_limit: number
        }
        Returns: undefined
      }
      increment_bonus_scans_remaining: {
        Args: { p_user_id: string; p_delta: number }
        Returns: undefined
      }
      get_user_play_identity: {
        Args: { p_user_id: string }
        Returns: {
          favorite_format_id: string | null
          favorite_archetype_id: string | null
          favorite_deck_name: string | null
          updated_at: string | null
        }[]
      }
      get_users_play_identity_batch: {
        Args: { p_user_ids: string[] }
        Returns: {
          user_id: string
          favorite_format_id: string | null
          favorite_archetype_id: string | null
          favorite_deck_name: string | null
          deck_count_for_badges: number
          updated_at: string | null
        }[]
      }
      get_user_top_deck_stats: {
        Args: { p_user_id: string }
        Returns: {
          deck_id: string
          deck_name: string
          total_cards: number
          unique_cards: number
          last_updated: string
        }[]
      }
      upsert_user_play_identity: {
        Args: {
          p_user_id: string
          p_format_id: string
          p_archetype_id: string
          p_deck_name: string
        }
        Returns: undefined
      }
      refresh_user_play_identity_badges: {
        Args: { p_user_id: string }
        Returns: undefined
      }
      sync_user_deck_stats_for_deck: {
        Args: { p_deck_id: string }
        Returns: undefined
      }
      refresh_social_collection_stats_for_user: {
        Args: { p_user_id: string }
        Returns: undefined
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

/** Full table typing: Row, Insert, Update, Relationships — `Database['public']['Tables']['achievements']` */
export type Achievements = Database["public"]["Tables"]["achievements"]

/** Full table typing: Row, Insert, Update, Relationships — `Database['public']['Tables']['user_achievements']` */
export type UserAchievements = Database["public"]["Tables"]["user_achievements"]

/** Supabase RPC `apply_achievement_unlock(user_id, achievement_slug)` */
export type ApplyAchievementUnlockArgs =
  Database["public"]["Functions"]["apply_achievement_unlock"]["Args"]

export type ApplyAchievementUnlockReturns =
  Database["public"]["Functions"]["apply_achievement_unlock"]["Returns"]

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
