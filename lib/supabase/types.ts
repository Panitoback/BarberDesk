export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
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
          client_id: string
          created_at: string
          date: string
          id: string
          price: number | null
          service: string
          status: Database["public"]["Enums"]["appointment_status"]
          tenant_id: string
          time: string
        }
        Insert: {
          client_id: string
          created_at?: string
          date: string
          id?: string
          price?: number | null
          service: string
          status?: Database["public"]["Enums"]["appointment_status"]
          tenant_id: string
          time: string
        }
        Update: {
          client_id?: string
          created_at?: string
          date?: string
          id?: string
          price?: number | null
          service?: string
          status?: Database["public"]["Enums"]["appointment_status"]
          tenant_id?: string
          time?: string
        }
        Relationships: [
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
          id: string
          loyalty_active: boolean
          noshow_active: boolean
          noshow_message: string | null
          reactivation_active: boolean
          reactivation_days: number
          review_active: boolean
          review_link: string | null
          tenant_id: string
          updated_at: string
        }
        Insert: {
          id?: string
          loyalty_active?: boolean
          noshow_active?: boolean
          noshow_message?: string | null
          reactivation_active?: boolean
          reactivation_days?: number
          review_active?: boolean
          review_link?: string | null
          tenant_id: string
          updated_at?: string
        }
        Update: {
          id?: string
          loyalty_active?: boolean
          noshow_active?: boolean
          noshow_message?: string | null
          reactivation_active?: boolean
          reactivation_days?: number
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
      clients: {
        Row: {
          created_at: string
          email: string | null
          id: string
          last_visit: string | null
          name: string
          no_show_count: number
          phone: string
          tenant_id: string
        }
        Insert: {
          created_at?: string
          email?: string | null
          id?: string
          last_visit?: string | null
          name: string
          no_show_count?: number
          phone: string
          tenant_id: string
        }
        Update: {
          created_at?: string
          email?: string | null
          id?: string
          last_visit?: string | null
          name?: string
          no_show_count?: number
          phone?: string
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "clients_tenant_id_fkey"
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
      messages: {
        Row: {
          body: string
          client_id: string | null
          created_at: string
          direction: Database["public"]["Enums"]["message_direction"]
          id: string
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
      tenants: {
        Row: {
          config: Json
          created_at: string
          id: string
          name: string
          owner_id: string
          plan: Database["public"]["Enums"]["plan_type"]
          subdomain: string
          twilio_number: string | null
        }
        Insert: {
          config?: Json
          created_at?: string
          id?: string
          name: string
          owner_id: string
          plan?: Database["public"]["Enums"]["plan_type"]
          subdomain: string
          twilio_number?: string | null
        }
        Update: {
          config?: Json
          created_at?: string
          id?: string
          name?: string
          owner_id?: string
          plan?: Database["public"]["Enums"]["plan_type"]
          subdomain?: string
          twilio_number?: string | null
        }
        Relationships: []
      }
      visits: {
        Row: {
          client_id: string
          created_at: string
          date: string
          id: string
          notes: string | null
          points_earned: number
          price: number | null
          service: string
          tenant_id: string
        }
        Insert: {
          client_id: string
          created_at?: string
          date?: string
          id?: string
          notes?: string | null
          points_earned?: number
          price?: number | null
          service: string
          tenant_id: string
        }
        Update: {
          client_id?: string
          created_at?: string
          date?: string
          id?: string
          notes?: string | null
          points_earned?: number
          price?: number | null
          service?: string
          tenant_id?: string
        }
        Relationships: [
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
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      user_owns_tenant: { Args: { target_tenant_id: string }; Returns: boolean }
      complete_appointment: {
        Args: { p_appointment_id: string; p_tenant_id: string }
        Returns: Json
      }
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
