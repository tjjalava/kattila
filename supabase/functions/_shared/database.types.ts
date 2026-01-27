export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type Database = {
  graphql_public: {
    Tables: {
      [_ in never]: never;
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      graphql: {
        Args: {
          extensions?: Json;
          operationName?: string;
          query?: string;
          variables?: Json;
        };
        Returns: Json;
      };
    };
    Enums: {
      [_ in never]: never;
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
  public: {
    Tables: {
      electricity_tarifs: {
        Row: {
          created_at: string;
          effective_from: string;
          rate_per_kwh: number;
          rate_per_month: number;
          type: string;
        };
        Insert: {
          created_at?: string;
          effective_from: string;
          rate_per_kwh?: number;
          rate_per_month?: number;
          type: string;
        };
        Update: {
          created_at?: string;
          effective_from?: string;
          rate_per_kwh?: number;
          rate_per_month?: number;
          type?: string;
        };
        Relationships: [];
      };
      heating_plan: {
        Row: {
          actual_power: number;
          cost: number;
          created_at: string;
          locked: boolean;
          options: Json;
          power: number;
          price: number;
          t_down: number;
          t_up: number;
          timestamp: string;
          total_price: number;
          transmission_price: number;
          updated_at: string;
        };
        Insert: {
          actual_power: number;
          cost: number;
          created_at?: string;
          locked?: boolean;
          options?: Json;
          power: number;
          price: number;
          t_down: number;
          t_up: number;
          timestamp: string;
          total_price?: number;
          transmission_price?: number;
          updated_at?: string;
        };
        Update: {
          actual_power?: number;
          cost?: number;
          created_at?: string;
          locked?: boolean;
          options?: Json;
          power?: number;
          price?: number;
          t_down?: number;
          t_up?: number;
          timestamp?: string;
          total_price?: number;
          transmission_price?: number;
          updated_at?: string;
        };
        Relationships: [];
      };
      resistor_state: {
        Row: {
          down: boolean;
          down_temp: number;
          id: number;
          timestamp: string;
          up: boolean;
          up_temp: number;
        };
        Insert: {
          down: boolean;
          down_temp: number;
          id?: number;
          timestamp?: string;
          up: boolean;
          up_temp: number;
        };
        Update: {
          down?: boolean;
          down_temp?: number;
          id?: number;
          timestamp?: string;
          up?: boolean;
          up_temp?: number;
        };
        Relationships: [];
      };
      schedule: {
        Row: {
          id: number;
          limitdown: number | null;
          limitup: number | null;
          range: unknown;
        };
        Insert: {
          id?: number;
          limitdown?: number | null;
          limitup?: number | null;
          range: unknown;
        };
        Update: {
          id?: number;
          limitdown?: number | null;
          limitup?: number | null;
          range?: unknown;
        };
        Relationships: [];
      };
      temperature: {
        Row: {
          peripheral: string;
          temperature: number;
          timestamp: string;
        };
        Insert: {
          peripheral: string;
          temperature: number;
          timestamp?: string;
        };
        Update: {
          peripheral?: string;
          temperature?: number;
          timestamp?: string;
        };
        Relationships: [];
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      get_temperature_drop_rates: {
        Args: never;
        Returns: {
          drop_rate_per_hour: number;
          peripheral: string;
        }[];
      };
      get_temperature_increase_rates: {
        Args: { interval_hours?: unknown };
        Returns: {
          diff_per_hour: number;
          increase_per_kwh: number;
          peripheral: string;
          state: number;
        }[];
      };
      get_temperatures: {
        Args: { resolution?: unknown };
        Returns: {
          ala: number;
          t: string;
          yla: number;
        }[];
      };
    };
    Enums: {
      [_ in never]: never;
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
};

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">;

type DefaultSchema =
  DatabaseWithoutInternals[Extract<keyof Database, "public">];

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  } ? keyof (
      & DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]][
        "Tables"
      ]
      & DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]][
        "Views"
      ]
    )
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
} ? (
    & DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]][
      "Tables"
    ]
    & DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]][
      "Views"
    ]
  )[TableName] extends {
    Row: infer R;
  } ? R
  : never
  : DefaultSchemaTableNameOrOptions extends keyof (
    & DefaultSchema["Tables"]
    & DefaultSchema["Views"]
  ) ? (
      & DefaultSchema["Tables"]
      & DefaultSchema["Views"]
    )[DefaultSchemaTableNameOrOptions] extends {
      Row: infer R;
    } ? R
    : never
  : never;

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  } ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]][
      "Tables"
    ]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
} ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]][
    "Tables"
  ][TableName] extends {
    Insert: infer I;
  } ? I
  : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
      Insert: infer I;
    } ? I
    : never
  : never;

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  } ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]][
      "Tables"
    ]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
} ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]][
    "Tables"
  ][TableName] extends {
    Update: infer U;
  } ? U
  : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
      Update: infer U;
    } ? U
    : never
  : never;

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  } ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]][
      "Enums"
    ]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
} ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][
    EnumName
  ]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
  : never;

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  } ? keyof DatabaseWithoutInternals[
      PublicCompositeTypeNameOrOptions["schema"]
    ]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
} ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]][
    "CompositeTypes"
  ][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends
    keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
  : never;

export const Constants = {
  graphql_public: {
    Enums: {},
  },
  public: {
    Enums: {},
  },
} as const;
