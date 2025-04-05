export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  public: {
    Tables: {
      heating_plan: {
        Row: {
          actual_power: number
          cost: number
          created_at: string
          locked: boolean
          power: number
          price: number
          t_down: number
          t_up: number
          timestamp: string
          updated_at: string
        }
        Insert: {
          actual_power: number
          cost: number
          created_at?: string
          locked?: boolean
          power: number
          price: number
          t_down: number
          t_up: number
          timestamp: string
          updated_at?: string
        }
        Update: {
          actual_power?: number
          cost?: number
          created_at?: string
          locked?: boolean
          power?: number
          price?: number
          t_down?: number
          t_up?: number
          timestamp?: string
          updated_at?: string
        }
        Relationships: []
      }
      meteo: {
        Row: {
          temperature: number
          timestamp: string
        }
        Insert: {
          temperature: number
          timestamp: string
        }
        Update: {
          temperature?: number
          timestamp?: string
        }
        Relationships: []
      }
      resistor_state: {
        Row: {
          down: boolean
          down_temp: number
          id: number
          timestamp: string
          up: boolean
          up_temp: number
        }
        Insert: {
          down: boolean
          down_temp: number
          id?: number
          timestamp?: string
          up: boolean
          up_temp: number
        }
        Update: {
          down?: boolean
          down_temp?: number
          id?: number
          timestamp?: string
          up?: boolean
          up_temp?: number
        }
        Relationships: []
      }
      temperature: {
        Row: {
          peripheral: string
          temperature: number
          timestamp: string
        }
        Insert: {
          peripheral: string
          temperature: number
          timestamp?: string
        }
        Update: {
          peripheral?: string
          temperature?: number
          timestamp?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      get_temperature_drop_rates: {
        Args: {
          interval_hours?: unknown
        }
        Returns: {
          peripheral: string
          drop_rate_per_hour: number
        }[]
      }
      get_temperature_increase_rates: {
        Args: {
          interval_hours?: unknown
        }
        Returns: {
          peripheral: string
          state: number
          diff_per_hour: number
          increase_per_kwh: number
        }[]
      }
      get_temperatures: {
        Args: {
          resolution?: unknown
        }
        Returns: {
          t: string
          yla: number
          ala: number
        }[]
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

type PublicSchema = Database[Extract<keyof Database, "public">]

export type Tables<
  PublicTableNameOrOptions extends
    | keyof (PublicSchema["Tables"] & PublicSchema["Views"])
    | { schema: keyof Database },
  TableName extends PublicTableNameOrOptions extends { schema: keyof Database }
    ? keyof (Database[PublicTableNameOrOptions["schema"]]["Tables"] &
        Database[PublicTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = PublicTableNameOrOptions extends { schema: keyof Database }
  ? (Database[PublicTableNameOrOptions["schema"]]["Tables"] &
      Database[PublicTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : PublicTableNameOrOptions extends keyof (PublicSchema["Tables"] &
        PublicSchema["Views"])
    ? (PublicSchema["Tables"] &
        PublicSchema["Views"])[PublicTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  PublicTableNameOrOptions extends
    | keyof PublicSchema["Tables"]
    | { schema: keyof Database },
  TableName extends PublicTableNameOrOptions extends { schema: keyof Database }
    ? keyof Database[PublicTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = PublicTableNameOrOptions extends { schema: keyof Database }
  ? Database[PublicTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : PublicTableNameOrOptions extends keyof PublicSchema["Tables"]
    ? PublicSchema["Tables"][PublicTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  PublicTableNameOrOptions extends
    | keyof PublicSchema["Tables"]
    | { schema: keyof Database },
  TableName extends PublicTableNameOrOptions extends { schema: keyof Database }
    ? keyof Database[PublicTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = PublicTableNameOrOptions extends { schema: keyof Database }
  ? Database[PublicTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : PublicTableNameOrOptions extends keyof PublicSchema["Tables"]
    ? PublicSchema["Tables"][PublicTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  PublicEnumNameOrOptions extends
    | keyof PublicSchema["Enums"]
    | { schema: keyof Database },
  EnumName extends PublicEnumNameOrOptions extends { schema: keyof Database }
    ? keyof Database[PublicEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = PublicEnumNameOrOptions extends { schema: keyof Database }
  ? Database[PublicEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : PublicEnumNameOrOptions extends keyof PublicSchema["Enums"]
    ? PublicSchema["Enums"][PublicEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof PublicSchema["CompositeTypes"]
    | { schema: keyof Database },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends { schema: keyof Database }
  ? Database[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof PublicSchema["CompositeTypes"]
    ? PublicSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never
