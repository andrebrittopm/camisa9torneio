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
    PostgrestVersion: "14.15"
  }
  public: {
    Tables: {
      av_events: {
        Row: {
          active: boolean
          created_at: string
          event_name: string
          event_number: number
          event_year: number
          id: string
          location: string | null
          order_deadline: string | null
          orders_open: boolean
          pix_holder_name: string | null
          pix_key: string | null
          pix_key_type: string | null
          unit_price: number
          updated_at: string
        }
        Insert: {
          active?: boolean
          created_at?: string
          event_name: string
          event_number: number
          event_year: number
          id?: string
          location?: string | null
          order_deadline?: string | null
          orders_open?: boolean
          pix_holder_name?: string | null
          pix_key?: string | null
          pix_key_type?: string | null
          unit_price?: number
          updated_at?: string
        }
        Update: {
          active?: boolean
          created_at?: string
          event_name?: string
          event_number?: number
          event_year?: number
          id?: string
          location?: string | null
          order_deadline?: string | null
          orders_open?: boolean
          pix_holder_name?: string | null
          pix_key?: string | null
          pix_key_type?: string | null
          unit_price?: number
          updated_at?: string
        }
        Relationships: []
      }
      av_order_items: {
        Row: {
          created_at: string
          custom_name: string | null
          custom_number: string | null
          custom_size: string | null
          event_id: string
          id: string
          line_total: number | null
          model_code: string
          model_name: string
          order_id: string
          quantity: number
          shirt_model_id: string
          shirt_type: string
          size_option: string
          unit_price: number
        }
        Insert: {
          created_at?: string
          custom_name?: string | null
          custom_number?: string | null
          custom_size?: string | null
          event_id: string
          id?: string
          line_total?: number | null
          model_code: string
          model_name: string
          order_id: string
          quantity?: number
          shirt_model_id: string
          shirt_type: string
          size_option: string
          unit_price: number
        }
        Update: {
          created_at?: string
          custom_name?: string | null
          custom_number?: string | null
          custom_size?: string | null
          event_id?: string
          id?: string
          line_total?: number | null
          model_code?: string
          model_name?: string
          order_id?: string
          quantity?: number
          shirt_model_id?: string
          shirt_type?: string
          size_option?: string
          unit_price?: number
        }
        Relationships: [
          {
            foreignKeyName: "fk_model_event"
            columns: ["shirt_model_id", "event_id"]
            isOneToOne: false
            referencedRelation: "av_shirt_models"
            referencedColumns: ["id", "event_id"]
          },
          {
            foreignKeyName: "fk_order_event"
            columns: ["order_id", "event_id"]
            isOneToOne: false
            referencedRelation: "av_orders"
            referencedColumns: ["id", "event_id"]
          },
        ]
      }
      av_orders: {
        Row: {
          created_at: string
          customer_name: string
          event_id: string
          id: string
          idempotency_key: string
          notes: string | null
          order_seq: number
          order_status: string
          payment_status: string
          request_fingerprint: string
          subtotal: number
          total_amount: number
          updated_at: string
          whatsapp: string
        }
        Insert: {
          created_at?: string
          customer_name: string
          event_id: string
          id?: string
          idempotency_key: string
          notes?: string | null
          order_seq?: never
          order_status?: string
          payment_status?: string
          request_fingerprint: string
          subtotal?: number
          total_amount?: number
          updated_at?: string
          whatsapp: string
        }
        Update: {
          created_at?: string
          customer_name?: string
          event_id?: string
          id?: string
          idempotency_key?: string
          notes?: string | null
          order_seq?: never
          order_status?: string
          payment_status?: string
          request_fingerprint?: string
          subtotal?: number
          total_amount?: number
          updated_at?: string
          whatsapp?: string
        }
        Relationships: [
          {
            foreignKeyName: "av_orders_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "av_events"
            referencedColumns: ["id"]
          },
        ]
      }
      av_payment_receipts: {
        Row: {
          id: string
          mime_type: string | null
          order_id: string
          original_file_name: string | null
          review_notes: string | null
          review_status: string
          reviewed_at: string | null
          reviewed_by: string | null
          size_bytes: number | null
          storage_path: string
          uploaded_at: string
        }
        Insert: {
          id?: string
          mime_type?: string | null
          order_id: string
          original_file_name?: string | null
          review_notes?: string | null
          review_status?: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          size_bytes?: number | null
          storage_path: string
          uploaded_at?: string
        }
        Update: {
          id?: string
          mime_type?: string | null
          order_id?: string
          original_file_name?: string | null
          review_notes?: string | null
          review_status?: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          size_bytes?: number | null
          storage_path?: string
          uploaded_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "av_payment_receipts_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "av_orders"
            referencedColumns: ["id"]
          },
        ]
      }
      av_shirt_models: {
        Row: {
          active: boolean
          allow_custom_size: boolean
          available_sizes: string[]
          back_image_url: string | null
          category: string
          code: string
          created_at: string
          event_id: string
          front_image_url: string | null
          id: string
          model_3d_url: string | null
          name: string
          sort_order: number
          thumbnail_url: string | null
          updated_at: string
        }
        Insert: {
          active?: boolean
          allow_custom_size?: boolean
          available_sizes?: string[]
          back_image_url?: string | null
          category: string
          code: string
          created_at?: string
          event_id: string
          front_image_url?: string | null
          id?: string
          model_3d_url?: string | null
          name: string
          sort_order?: number
          thumbnail_url?: string | null
          updated_at?: string
        }
        Update: {
          active?: boolean
          allow_custom_size?: boolean
          available_sizes?: string[]
          back_image_url?: string | null
          category?: string
          code?: string
          created_at?: string
          event_id?: string
          front_image_url?: string | null
          id?: string
          model_3d_url?: string | null
          name?: string
          sort_order?: number
          thumbnail_url?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "av_shirt_models_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "av_events"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      av_create_order: {
        Args: {
          p_customer_name: string
          p_event_id: string
          p_idempotency_key: string
          p_items: Json
          p_notes: string
          p_request_fingerprint: string
          p_whatsapp: string
        }
        Returns: Json
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
