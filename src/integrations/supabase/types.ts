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
      equipamento_fotos: {
        Row: {
          caption: string | null
          created_at: string
          equipamento_id: string
          id: string
          manutencao_historico_id: string | null
          storage_path: string
          uploaded_by: string
        }
        Insert: {
          caption?: string | null
          created_at?: string
          equipamento_id: string
          id?: string
          manutencao_historico_id?: string | null
          storage_path: string
          uploaded_by: string
        }
        Update: {
          caption?: string | null
          created_at?: string
          equipamento_id?: string
          id?: string
          manutencao_historico_id?: string | null
          storage_path?: string
          uploaded_by?: string
        }
        Relationships: [
          {
            foreignKeyName: "equipamento_fotos_equipamento_id_fkey"
            columns: ["equipamento_id"]
            isOneToOne: false
            referencedRelation: "equipamentos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "equipamento_fotos_manutencao_historico_id_fkey"
            columns: ["manutencao_historico_id"]
            isOneToOne: false
            referencedRelation: "manutencao_historico"
            referencedColumns: ["id"]
          },
        ]
      }
      equipamentos: {
        Row: {
          afericao_taco: string | null
          ano: string | null
          cartao_ticket: string | null
          cl: string | null
          cnh: string | null
          cover_storage_path: string | null
          created_at: string
          data_horimetro_atual: string | null
          data_ultima_revisao: string | null
          eixo_oleo: string | null
          filtro_ar_cond1: string | null
          filtro_ar_cond2: string | null
          filtro_ar_ext: string | null
          filtro_ar_int: string | null
          filtro_diesel_p: string | null
          filtro_diesel_s: string | null
          filtro_hidr: string | null
          filtro_lub: string | null
          filtro_respiro: string | null
          filtro_sep_agua: string | null
          filtro_trans: string | null
          h_revisao: number | null
          hidraulico_oleo: string | null
          horimetro_atual: number | null
          hr_rodado: number | null
          id: string
          identificacao: string | null
          item: number | null
          localizacao: string | null
          modelo: string | null
          motor_oleo: string | null
          numero: string
          observacoes: string | null
          operador_contato: string | null
          placa: string | null
          proxima_revisao_horimetro: number | null
          status: string | null
          tandem_oleo: string | null
          telefone: string | null
          transmissao_oleo: string | null
          u_revisao: number | null
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          afericao_taco?: string | null
          ano?: string | null
          cartao_ticket?: string | null
          cl?: string | null
          cnh?: string | null
          cover_storage_path?: string | null
          created_at?: string
          data_horimetro_atual?: string | null
          data_ultima_revisao?: string | null
          eixo_oleo?: string | null
          filtro_ar_cond1?: string | null
          filtro_ar_cond2?: string | null
          filtro_ar_ext?: string | null
          filtro_ar_int?: string | null
          filtro_diesel_p?: string | null
          filtro_diesel_s?: string | null
          filtro_hidr?: string | null
          filtro_lub?: string | null
          filtro_respiro?: string | null
          filtro_sep_agua?: string | null
          filtro_trans?: string | null
          h_revisao?: number | null
          hidraulico_oleo?: string | null
          horimetro_atual?: number | null
          hr_rodado?: number | null
          id?: string
          identificacao?: string | null
          item?: number | null
          localizacao?: string | null
          modelo?: string | null
          motor_oleo?: string | null
          numero: string
          observacoes?: string | null
          operador_contato?: string | null
          placa?: string | null
          proxima_revisao_horimetro?: number | null
          status?: string | null
          tandem_oleo?: string | null
          telefone?: string | null
          transmissao_oleo?: string | null
          u_revisao?: number | null
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          afericao_taco?: string | null
          ano?: string | null
          cartao_ticket?: string | null
          cl?: string | null
          cnh?: string | null
          cover_storage_path?: string | null
          created_at?: string
          data_horimetro_atual?: string | null
          data_ultima_revisao?: string | null
          eixo_oleo?: string | null
          filtro_ar_cond1?: string | null
          filtro_ar_cond2?: string | null
          filtro_ar_ext?: string | null
          filtro_ar_int?: string | null
          filtro_diesel_p?: string | null
          filtro_diesel_s?: string | null
          filtro_hidr?: string | null
          filtro_lub?: string | null
          filtro_respiro?: string | null
          filtro_sep_agua?: string | null
          filtro_trans?: string | null
          h_revisao?: number | null
          hidraulico_oleo?: string | null
          horimetro_atual?: number | null
          hr_rodado?: number | null
          id?: string
          identificacao?: string | null
          item?: number | null
          localizacao?: string | null
          modelo?: string | null
          motor_oleo?: string | null
          numero?: string
          observacoes?: string | null
          operador_contato?: string | null
          placa?: string | null
          proxima_revisao_horimetro?: number | null
          status?: string | null
          tandem_oleo?: string | null
          telefone?: string | null
          transmissao_oleo?: string | null
          u_revisao?: number | null
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: []
      }
      manutencao_historico: {
        Row: {
          created_at: string
          created_by: string | null
          data: string
          equipamento_id: string
          executante: string | null
          horimetro: number | null
          id: string
          itens: Json
          observacoes: string | null
          tipo_revisao: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          data?: string
          equipamento_id: string
          executante?: string | null
          horimetro?: number | null
          id?: string
          itens?: Json
          observacoes?: string | null
          tipo_revisao?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          data?: string
          equipamento_id?: string
          executante?: string | null
          horimetro?: number | null
          id?: string
          itens?: Json
          observacoes?: string | null
          tipo_revisao?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "manutencao_historico_equipamento_id_fkey"
            columns: ["equipamento_id"]
            isOneToOne: false
            referencedRelation: "equipamentos"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          created_at: string
          email: string | null
          full_name: string
          id: string
          phone: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          email?: string | null
          full_name?: string
          id: string
          phone?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          email?: string | null
          full_name?: string
          id?: string
          phone?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "admin" | "colaborador"
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
      app_role: ["admin", "colaborador"],
    },
  },
} as const
