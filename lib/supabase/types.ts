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
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      actions_log: {
        Row: {
          client_id: string | null
          created_at: string
          id: string
          metadata: Json
          tenant_id: string
          type: Database["public"]["Enums"]["action_type"]
        }
        Insert: {
          client_id?: string | null
          created_at?: string
          id?: string
          metadata?: Json
          tenant_id: string
          type: Database["public"]["Enums"]["action_type"]
        }
        Update: {
          client_id?: string | null
          created_at?: string
          id?: string
          metadata?: Json
          tenant_id?: string
          type?: Database["public"]["Enums"]["action_type"]
        }
        Relationships: [
          {
            foreignKeyName: "actions_log_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "actions_log_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      appointments: {
        Row: {
          barber_id: string | null
          client_id: string
          client_note: string | null
          created_at: string
          date: string
          deposit_paid: boolean
          duration_min: number
          haircut_photo_url: string | null
          id: string
          price: number | null
          reminder_sent_at: string | null
          service: string
          status: Database["public"]["Enums"]["appointment_status"]
          stripe_session_id: string | null
          tenant_id: string
          time: string
          walkin: boolean
        }
        Insert: {
          barber_id?: string | null
          client_id: string
          client_note?: string | null
          created_at?: string
          date: string
          deposit_paid?: boolean
          duration_min?: number
          haircut_photo_url?: string | null
          id?: string
          price?: number | null
          reminder_sent_at?: string | null
          service: string
          status?: Database["public"]["Enums"]["appointment_status"]
          stripe_session_id?: string | null
          tenant_id: string
          time: string
          walkin?: boolean
        }
        Update: {
          barber_id?: string | null
          client_id?: string
          client_note?: string | null
          created_at?: string
          date?: string
          deposit_paid?: boolean
          duration_min?: number
          haircut_photo_url?: string | null
          id?: string
          price?: number | null
          reminder_sent_at?: string | null
          service?: string
          status?: Database["public"]["Enums"]["appointment_status"]
          stripe_session_id?: string | null
          tenant_id?: string
          time?: string
          walkin?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "appointments_barber_id_fkey"
            columns: ["barber_id"]
            isOneToOne: false
            referencedRelation: "barbers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "citas_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "citas_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      automations_config: {
        Row: {
          flash_active: boolean
          flash_discount_pct: number
          id: string
          loyalty_active: boolean
          loyalty_dollars_per_star: number
          loyalty_mode: string
          noshow_active: boolean
          noshow_message: string | null
          reactivation_active: boolean
          reactivation_days: number
          reminder_active: boolean
          reminder_hours: number
          review_active: boolean
          review_link: string | null
          tenant_id: string
          updated_at: string
        }
        Insert: {
          flash_active?: boolean
          flash_discount_pct?: number
          id?: string
          loyalty_active?: boolean
          loyalty_dollars_per_star?: number
          loyalty_mode?: string
          noshow_active?: boolean
          noshow_message?: string | null
          reactivation_active?: boolean
          reactivation_days?: number
          reminder_active?: boolean
          reminder_hours?: number
          review_active?: boolean
          review_link?: string | null
          tenant_id: string
          updated_at?: string
        }
        Update: {
          flash_active?: boolean
          flash_discount_pct?: number
          id?: string
          loyalty_active?: boolean
          loyalty_dollars_per_star?: number
          loyalty_mode?: string
          noshow_active?: boolean
          noshow_message?: string | null
          reactivation_active?: boolean
          reactivation_days?: number
          reminder_active?: boolean
          reminder_hours?: number
          review_active?: boolean
          review_link?: string | null
          tenant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "automations_config_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: true
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      barbers: {
        Row: {
          active: boolean
          bio: string | null
          commission_pct: number | null
          created_at: string
          display_order: number
          email: string | null
          hours: Json | null
          id: string
          instagram_handle: string | null
          name: string
          photo_path: string | null
          price_modifier: number
          tenant_id: string
        }
        Insert: {
          active?: boolean
          bio?: string | null
          commission_pct?: number | null
          created_at?: string
          display_order?: number
          email?: string | null
          hours?: Json | null
          id?: string
          instagram_handle?: string | null
          name: string
          photo_path?: string | null
          price_modifier?: number
          tenant_id: string
        }
        Update: {
          active?: boolean
          bio?: string | null
          commission_pct?: number | null
          created_at?: string
          display_order?: number
          email?: string | null
          hours?: Json | null
          id?: string
          instagram_handle?: string | null
          name?: string
          photo_path?: string | null
          price_modifier?: number
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "barbers_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      clients: {
        Row: {
          created_at: string
          email: string | null
          id: string
          is_anonymous: boolean
          last_visit: string | null
          name: string
          no_show_count: number
          notes: string | null
          phone: string | null
          preferred_barber_id: string | null
          tenant_id: string
        }
        Insert: {
          created_at?: string
          email?: string | null
          id?: string
          is_anonymous?: boolean
          last_visit?: string | null
          name: string
          no_show_count?: number
          notes?: string | null
          phone?: string | null
          preferred_barber_id?: string | null
          tenant_id: string
        }
        Update: {
          created_at?: string
          email?: string | null
          id?: string
          is_anonymous?: boolean
          last_visit?: string | null
          name?: string
          no_show_count?: number
          notes?: string | null
          phone?: string | null
          preferred_barber_id?: string | null
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "clients_preferred_barber_id_fkey"
            columns: ["preferred_barber_id"]
            isOneToOne: false
            referencedRelation: "barbers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "clients_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      error_logs: {
        Row: {
          created_at: string
          error_code: string | null
          id: string
          message: string
          metadata: Json
          method: string | null
          request_body: Json | null
          route: string | null
          source: string
          stack: string | null
          status: number | null
          tenant_id: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string
          error_code?: string | null
          id?: string
          message: string
          metadata?: Json
          method?: string | null
          request_body?: Json | null
          route?: string | null
          source: string
          stack?: string | null
          status?: number | null
          tenant_id?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string
          error_code?: string | null
          id?: string
          message?: string
          metadata?: Json
          method?: string | null
          request_body?: Json | null
          route?: string | null
          source?: string
          stack?: string | null
          status?: number | null
          tenant_id?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "error_logs_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      loyalty_points: {
        Row: {
          client_id: string
          id: string
          level: Database["public"]["Enums"]["loyalty_level"]
          points: number
          tenant_id: string
          updated_at: string
        }
        Insert: {
          client_id: string
          id?: string
          level?: Database["public"]["Enums"]["loyalty_level"]
          points?: number
          tenant_id: string
          updated_at?: string
        }
        Update: {
          client_id?: string
          id?: string
          level?: Database["public"]["Enums"]["loyalty_level"]
          points?: number
          tenant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "loyalty_points_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "loyalty_points_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      loyalty_redemptions: {
        Row: {
          client_id: string
          id: string
          notes: string | null
          redeemed_at: string
          reward_id: string
          stars_spent: number
          tenant_id: string
        }
        Insert: {
          client_id: string
          id?: string
          notes?: string | null
          redeemed_at?: string
          reward_id: string
          stars_spent: number
          tenant_id: string
        }
        Update: {
          client_id?: string
          id?: string
          notes?: string | null
          redeemed_at?: string
          reward_id?: string
          stars_spent?: number
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "loyalty_redemptions_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "loyalty_redemptions_reward_id_fkey"
            columns: ["reward_id"]
            isOneToOne: false
            referencedRelation: "loyalty_rewards"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "loyalty_redemptions_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      loyalty_rewards: {
        Row: {
          active: boolean
          created_at: string
          description: string | null
          display_order: number
          id: string
          name: string
          stars_required: number
          tenant_id: string
        }
        Insert: {
          active?: boolean
          created_at?: string
          description?: string | null
          display_order?: number
          id?: string
          name: string
          stars_required: number
          tenant_id: string
        }
        Update: {
          active?: boolean
          created_at?: string
          description?: string | null
          display_order?: number
          id?: string
          name?: string
          stars_required?: number
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "loyalty_rewards_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      messages: {
        Row: {
          body: string
          client_id: string | null
          created_at: string
          direction: Database["public"]["Enums"]["message_direction"]
          id: string
          read_at: string | null
          status: Database["public"]["Enums"]["message_status"]
          tenant_id: string
          twilio_sid: string | null
        }
        Insert: {
          body: string
          client_id?: string | null
          created_at?: string
          direction: Database["public"]["Enums"]["message_direction"]
          id?: string
          read_at?: string | null
          status?: Database["public"]["Enums"]["message_status"]
          tenant_id: string
          twilio_sid?: string | null
        }
        Update: {
          body?: string
          client_id?: string | null
          created_at?: string
          direction?: Database["public"]["Enums"]["message_direction"]
          id?: string
          read_at?: string | null
          status?: Database["public"]["Enums"]["message_status"]
          tenant_id?: string
          twilio_sid?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "messages_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "messages_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      shop_gallery: {
        Row: {
          caption: string | null
          created_at: string
          display_order: number
          id: string
          photo_path: string
          tenant_id: string
        }
        Insert: {
          caption?: string | null
          created_at?: string
          display_order?: number
          id?: string
          photo_path: string
          tenant_id: string
        }
        Update: {
          caption?: string | null
          created_at?: string
          display_order?: number
          id?: string
          photo_path?: string
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "shop_gallery_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      tenants: {
        Row: {
          config: Json
          created_at: string
          id: string
          multi_barber: boolean
          name: string
          owner_id: string
          plan: Database["public"]["Enums"]["plan_type"]
          staff_token: string
          subdomain: string
          twilio_number: string | null
        }
        Insert: {
          config?: Json
          created_at?: string
          id?: string
          multi_barber?: boolean
          name: string
          owner_id: string
          plan?: Database["public"]["Enums"]["plan_type"]
          staff_token?: string
          subdomain: string
          twilio_number?: string | null
        }
        Update: {
          config?: Json
          created_at?: string
          id?: string
          multi_barber?: boolean
          name?: string
          owner_id?: string
          plan?: Database["public"]["Enums"]["plan_type"]
          staff_token?: string
          subdomain?: string
          twilio_number?: string | null
        }
        Relationships: []
      }
      time_blocks: {
        Row: {
          all_day: boolean
          barber_id: string | null
          created_at: string
          date: string
          end_time: string
          id: string
          reason: string | null
          start_time: string
          tenant_id: string
        }
        Insert: {
          all_day?: boolean
          barber_id?: string | null
          created_at?: string
          date: string
          end_time: string
          id?: string
          reason?: string | null
          start_time: string
          tenant_id: string
        }
        Update: {
          all_day?: boolean
          barber_id?: string | null
          created_at?: string
          date?: string
          end_time?: string
          id?: string
          reason?: string | null
          start_time?: string
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "time_blocks_barber_id_fkey"
            columns: ["barber_id"]
            isOneToOne: false
            referencedRelation: "barbers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "time_blocks_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      visits: {
        Row: {
          appointment_id: string | null
          client_id: string
          created_at: string
          date: string
          extras: Json
          id: string
          notes: string | null
          points_earned: number
          price: number | null
          service: string
          tenant_id: string
        }
        Insert: {
          appointment_id?: string | null
          client_id: string
          created_at?: string
          date?: string
          extras?: Json
          id?: string
          notes?: string | null
          points_earned?: number
          price?: number | null
          service: string
          tenant_id: string
        }
        Update: {
          appointment_id?: string | null
          client_id?: string
          created_at?: string
          date?: string
          extras?: Json
          id?: string
          notes?: string | null
          points_earned?: number
          price?: number | null
          service?: string
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "visits_appointment_id_fkey"
            columns: ["appointment_id"]
            isOneToOne: false
            referencedRelation: "appointments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "visits_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "visits_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      waitlist: {
        Row: {
          created_at: string
          date: string
          id: string
          name: string
          notified_at: string | null
          phone: string
          service: string
          tenant_id: string
        }
        Insert: {
          created_at?: string
          date: string
          id?: string
          name: string
          notified_at?: string | null
          phone: string
          service: string
          tenant_id: string
        }
        Update: {
          created_at?: string
          date?: string
          id?: string
          name?: string
          notified_at?: string | null
          phone?: string
          service?: string
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "waitlist_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      complete_appointment:
        | {
            Args: {
              p_appointment_id: string
              p_price_override?: number
              p_tenant_id: string
            }
            Returns: Json
          }
        | {
            Args: {
              p_appointment_id: string
              p_extras?: Json
              p_price_override?: number
              p_tenant_id: string
            }
            Returns: Json
          }
      redeem_loyalty_reward: {
        Args: {
          p_client_id: string
          p_notes?: string
          p_reward_id: string
          p_tenant_id: string
        }
        Returns: Json
      }
      user_owns_tenant: { Args: { target_tenant_id: string }; Returns: boolean }
    }
    Enums: {
      action_type:
        | "noshow"
        | "loyalty_add"
        | "reactivation_sms"
        | "review_request"
        | "sms_auto_reply"
      appointment_status: "pending" | "completed" | "no_show" | "cancelled"
      loyalty_level: "bronze" | "silver" | "gold" | "platinum"
      message_direction: "inbound" | "outbound"
      message_status: "queued" | "sent" | "delivered" | "failed"
      plan_type: "trial" | "active" | "suspended"
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
      action_type: [
        "noshow",
        "loyalty_add",
        "reactivation_sms",
        "review_request",
        "sms_auto_reply",
      ],
      appointment_status: ["pending", "completed", "no_show", "cancelled"],
      loyalty_level: ["bronze", "silver", "gold", "platinum"],
      message_direction: ["inbound", "outbound"],
      message_status: ["queued", "sent", "delivered", "failed"],
      plan_type: ["trial", "active", "suspended"],
    },
  },
} as const
