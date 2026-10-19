/**
 * GENERATED FILE — DO NOT EDIT BY HAND.
 *
 * Regenerate whenever the schema changes:
 *   npx supabase gen types typescript --project-id hunrfdmwfgdvhkszosog \
 *     > lib/supabase/database-generated.ts
 *
 * App-facing aliases and domain constants live in `lib/database.types.ts`,
 * which re-exports everything here. Import from there, not from this file.
 */

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
      broker_payments: {
        Row: {
          amount: number
          broker_id: string
          created_at: string
          date: string
          id: string
          method: string
          notes: string | null
          route_id: string | null
          user_id: string
        }
        Insert: {
          amount?: number
          broker_id: string
          created_at?: string
          date?: string
          id?: string
          method?: string
          notes?: string | null
          route_id?: string | null
          user_id: string
        }
        Update: {
          amount?: number
          broker_id?: string
          created_at?: string
          date?: string
          id?: string
          method?: string
          notes?: string | null
          route_id?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "broker_payments_broker_id_fkey"
            columns: ["broker_id"]
            isOneToOne: false
            referencedRelation: "brokers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "broker_payments_route_id_fkey"
            columns: ["route_id"]
            isOneToOne: false
            referencedRelation: "routes"
            referencedColumns: ["id"]
          },
        ]
      }
      brokers: {
        Row: {
          city: string | null
          created_at: string
          id: string
          name: string
          notes: string | null
          phone: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          city?: string | null
          created_at?: string
          id?: string
          name: string
          notes?: string | null
          phone?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          city?: string | null
          created_at?: string
          id?: string
          name?: string
          notes?: string | null
          phone?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      driver_advances: {
        Row: {
          amount_given: number
          amount_returned: number
          created_at: string
          date: string
          driver_id: string
          id: string
          notes: string | null
          route_id: string | null
          settled: boolean
          updated_at: string
          user_id: string
        }
        Insert: {
          amount_given?: number
          amount_returned?: number
          created_at?: string
          date?: string
          driver_id: string
          id?: string
          notes?: string | null
          route_id?: string | null
          settled?: boolean
          updated_at?: string
          user_id: string
        }
        Update: {
          amount_given?: number
          amount_returned?: number
          created_at?: string
          date?: string
          driver_id?: string
          id?: string
          notes?: string | null
          route_id?: string | null
          settled?: boolean
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "driver_advances_driver_id_fkey"
            columns: ["driver_id"]
            isOneToOne: false
            referencedRelation: "drivers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "driver_advances_route_id_fkey"
            columns: ["route_id"]
            isOneToOne: false
            referencedRelation: "routes"
            referencedColumns: ["id"]
          },
        ]
      }
      drivers: {
        Row: {
          active: boolean
          cnic: string | null
          created_at: string
          id: string
          license_no: string | null
          name: string
          notes: string | null
          phone: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          active?: boolean
          cnic?: string | null
          created_at?: string
          id?: string
          license_no?: string | null
          name: string
          notes?: string | null
          phone?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          active?: boolean
          cnic?: string | null
          created_at?: string
          id?: string
          license_no?: string | null
          name?: string
          notes?: string | null
          phone?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      expenses: {
        Row: {
          amount: number
          category: string
          created_at: string
          date: string
          id: string
          kind: string
          notes: string | null
          pump_name: string | null
          quantity: number | null
          rate: number | null
          receipt_url: string | null
          route_id: string
          slip_no: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          amount?: number
          category?: string
          created_at?: string
          date?: string
          id?: string
          kind?: string
          notes?: string | null
          pump_name?: string | null
          quantity?: number | null
          rate?: number | null
          receipt_url?: string | null
          route_id: string
          slip_no?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          amount?: number
          category?: string
          created_at?: string
          date?: string
          id?: string
          kind?: string
          notes?: string | null
          pump_name?: string | null
          quantity?: number | null
          rate?: number | null
          receipt_url?: string | null
          route_id?: string
          slip_no?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "expenses_route_id_fkey"
            columns: ["route_id"]
            isOneToOne: false
            referencedRelation: "routes"
            referencedColumns: ["id"]
          },
        ]
      }
      khata_contacts: {
        Row: {
          created_at: string
          id: string
          name: string
          notes: string | null
          opening_balance: number
          phone: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
          notes?: string | null
          opening_balance?: number
          phone?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          notes?: string | null
          opening_balance?: number
          phone?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      khata_entries: {
        Row: {
          amount: number
          contact_id: string
          created_at: string
          date: string
          direction: string
          id: string
          notes: string | null
          user_id: string
        }
        Insert: {
          amount?: number
          contact_id: string
          created_at?: string
          date?: string
          direction: string
          id?: string
          notes?: string | null
          user_id: string
        }
        Update: {
          amount?: number
          contact_id?: string
          created_at?: string
          date?: string
          direction?: string
          id?: string
          notes?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "khata_entries_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "khata_contacts"
            referencedColumns: ["id"]
          },
        ]
      }
      maintenance_events: {
        Row: {
          cost: number
          created_at: string
          date: string
          id: string
          mechanic_id: string | null
          notes: string | null
          odometer: number | null
          type: string
          updated_at: string
          user_id: string
          vehicle_id: string
        }
        Insert: {
          cost?: number
          created_at?: string
          date?: string
          id?: string
          mechanic_id?: string | null
          notes?: string | null
          odometer?: number | null
          type: string
          updated_at?: string
          user_id: string
          vehicle_id: string
        }
        Update: {
          cost?: number
          created_at?: string
          date?: string
          id?: string
          mechanic_id?: string | null
          notes?: string | null
          odometer?: number | null
          type?: string
          updated_at?: string
          user_id?: string
          vehicle_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "maintenance_events_mechanic_id_fkey"
            columns: ["mechanic_id"]
            isOneToOne: false
            referencedRelation: "mechanics"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "maintenance_events_vehicle_id_fkey"
            columns: ["vehicle_id"]
            isOneToOne: false
            referencedRelation: "vehicles"
            referencedColumns: ["id"]
          },
        ]
      }
      maintenance_fees: {
        Row: {
          amount: number
          created_at: string
          id: string
          mechanic_id: string | null
          month: string
          notes: string | null
          updated_at: string
          user_id: string
          vehicle_id: string
        }
        Insert: {
          amount?: number
          created_at?: string
          id?: string
          mechanic_id?: string | null
          month: string
          notes?: string | null
          updated_at?: string
          user_id: string
          vehicle_id: string
        }
        Update: {
          amount?: number
          created_at?: string
          id?: string
          mechanic_id?: string | null
          month?: string
          notes?: string | null
          updated_at?: string
          user_id?: string
          vehicle_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "maintenance_fees_mechanic_id_fkey"
            columns: ["mechanic_id"]
            isOneToOne: false
            referencedRelation: "mechanics"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "maintenance_fees_vehicle_id_fkey"
            columns: ["vehicle_id"]
            isOneToOne: false
            referencedRelation: "vehicles"
            referencedColumns: ["id"]
          },
        ]
      }
      mechanics: {
        Row: {
          city: string | null
          created_at: string
          id: string
          name: string
          notes: string | null
          phone: string | null
          updated_at: string
          user_id: string
          workshop: string | null
        }
        Insert: {
          city?: string | null
          created_at?: string
          id?: string
          name: string
          notes?: string | null
          phone?: string | null
          updated_at?: string
          user_id: string
          workshop?: string | null
        }
        Update: {
          city?: string | null
          created_at?: string
          id?: string
          name?: string
          notes?: string | null
          phone?: string | null
          updated_at?: string
          user_id?: string
          workshop?: string | null
        }
        Relationships: []
      }
      parties: {
        Row: {
          city: string | null
          created_at: string
          id: string
          name: string
          notes: string | null
          opening_balance: number
          phone: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          city?: string | null
          created_at?: string
          id?: string
          name: string
          notes?: string | null
          opening_balance?: number
          phone?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          city?: string | null
          created_at?: string
          id?: string
          name?: string
          notes?: string | null
          opening_balance?: number
          phone?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      party_payments: {
        Row: {
          amount: number
          created_at: string
          date: string
          id: string
          method: string
          notes: string | null
          party_id: string
          user_id: string
        }
        Insert: {
          amount?: number
          created_at?: string
          date?: string
          id?: string
          method?: string
          notes?: string | null
          party_id: string
          user_id: string
        }
        Update: {
          amount?: number
          created_at?: string
          date?: string
          id?: string
          method?: string
          notes?: string | null
          party_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "party_payments_party_id_fkey"
            columns: ["party_id"]
            isOneToOne: false
            referencedRelation: "parties"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          company: string | null
          created_at: string
          full_name: string | null
          id: string
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          company?: string | null
          created_at?: string
          full_name?: string | null
          id: string
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          company?: string | null
          created_at?: string
          full_name?: string | null
          id?: string
          updated_at?: string
        }
        Relationships: []
      }
      routes: {
        Row: {
          broker_commission_type: string | null
          broker_commission_value: number
          broker_id: string | null
          created_at: string
          destination: string
          driver_id: string | null
          end_date: string | null
          id: string
          material: string | null
          notes: string | null
          origin: string
          parent_route_id: string | null
          party_id: string | null
          revenue: number
          start_date: string
          updated_at: string
          user_id: string
          vehicle_id: string
          weight: number | null
        }
        Insert: {
          broker_commission_type?: string | null
          broker_commission_value?: number
          broker_id?: string | null
          created_at?: string
          destination: string
          driver_id?: string | null
          end_date?: string | null
          id?: string
          material?: string | null
          notes?: string | null
          origin: string
          parent_route_id?: string | null
          party_id?: string | null
          revenue?: number
          start_date?: string
          updated_at?: string
          user_id: string
          vehicle_id: string
          weight?: number | null
        }
        Update: {
          broker_commission_type?: string | null
          broker_commission_value?: number
          broker_id?: string | null
          created_at?: string
          destination?: string
          driver_id?: string | null
          end_date?: string | null
          id?: string
          material?: string | null
          notes?: string | null
          origin?: string
          parent_route_id?: string | null
          party_id?: string | null
          revenue?: number
          start_date?: string
          updated_at?: string
          user_id?: string
          vehicle_id?: string
          weight?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "routes_broker_id_fkey"
            columns: ["broker_id"]
            isOneToOne: false
            referencedRelation: "brokers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "routes_driver_id_fkey"
            columns: ["driver_id"]
            isOneToOne: false
            referencedRelation: "drivers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "routes_parent_route_id_fkey"
            columns: ["parent_route_id"]
            isOneToOne: false
            referencedRelation: "routes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "routes_party_id_fkey"
            columns: ["party_id"]
            isOneToOne: false
            referencedRelation: "parties"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "routes_vehicle_id_fkey"
            columns: ["vehicle_id"]
            isOneToOne: false
            referencedRelation: "vehicles"
            referencedColumns: ["id"]
          },
        ]
      }
      tyres: {
        Row: {
          brand: string | null
          created_at: string
          id: string
          notes: string | null
          odometer_fitted: number
          odometer_removed: number | null
          position: string | null
          purchase_cost: number
          purchase_date: string
          retread_count: number
          serial_no: string | null
          size: string | null
          status: Database["public"]["Enums"]["tyre_status"]
          updated_at: string
          user_id: string
          vehicle_id: string
        }
        Insert: {
          brand?: string | null
          created_at?: string
          id?: string
          notes?: string | null
          odometer_fitted?: number
          odometer_removed?: number | null
          position?: string | null
          purchase_cost?: number
          purchase_date?: string
          retread_count?: number
          serial_no?: string | null
          size?: string | null
          status?: Database["public"]["Enums"]["tyre_status"]
          updated_at?: string
          user_id: string
          vehicle_id: string
        }
        Update: {
          brand?: string | null
          created_at?: string
          id?: string
          notes?: string | null
          odometer_fitted?: number
          odometer_removed?: number | null
          position?: string | null
          purchase_cost?: number
          purchase_date?: string
          retread_count?: number
          serial_no?: string | null
          size?: string | null
          status?: Database["public"]["Enums"]["tyre_status"]
          updated_at?: string
          user_id?: string
          vehicle_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "tyres_vehicle_id_fkey"
            columns: ["vehicle_id"]
            isOneToOne: false
            referencedRelation: "vehicles"
            referencedColumns: ["id"]
          },
        ]
      }
      vehicle_owners: {
        Row: {
          created_at: string
          id: string
          is_self: boolean
          name: string
          notes: string | null
          phone: string | null
          share_percent: number
          updated_at: string
          user_id: string
          vehicle_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_self?: boolean
          name: string
          notes?: string | null
          phone?: string | null
          share_percent?: number
          updated_at?: string
          user_id: string
          vehicle_id: string
        }
        Update: {
          created_at?: string
          id?: string
          is_self?: boolean
          name?: string
          notes?: string | null
          phone?: string | null
          share_percent?: number
          updated_at?: string
          user_id?: string
          vehicle_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "vehicle_owners_vehicle_id_fkey"
            columns: ["vehicle_id"]
            isOneToOne: false
            referencedRelation: "vehicles"
            referencedColumns: ["id"]
          },
        ]
      }
      vehicles: {
        Row: {
          created_at: string
          id: string
          make_model: string | null
          odometer: number
          plate_number: string
          status: Database["public"]["Enums"]["vehicle_status"]
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          make_model?: string | null
          odometer?: number
          plate_number: string
          status?: Database["public"]["Enums"]["vehicle_status"]
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          make_model?: string | null
          odometer?: number
          plate_number?: string
          status?: Database["public"]["Enums"]["vehicle_status"]
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
      delete_current_user: { Args: never; Returns: undefined }
    }
    Enums: {
      expense_category: "Fuel" | "Toll" | "Maintenance" | "Driver" | "Misc"
      tyre_status: "in_use" | "spare" | "retreaded" | "scrapped"
      vehicle_status: "active" | "idle" | "maintenance" | "retired"
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
      expense_category: ["Fuel", "Toll", "Maintenance", "Driver", "Misc"],
      tyre_status: ["in_use", "spare", "retreaded", "scrapped"],
      vehicle_status: ["active", "idle", "maintenance", "retired"],
    },
  },
} as const
