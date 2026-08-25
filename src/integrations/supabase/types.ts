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
      contrato_custos: {
        Row: {
          cl: string
          contrato_id: string | null
          created_at: string | null
          custo_mao_obra: number | null
          custo_materiais: number | null
          custo_terceiros: number | null
          despesas_adm: number | null
          faturamento_bruto: number | null
          id: string
          impostos: number | null
          mes_referencia: string
        }
        Insert: {
          cl: string
          contrato_id?: string | null
          created_at?: string | null
          custo_mao_obra?: number | null
          custo_materiais?: number | null
          custo_terceiros?: number | null
          despesas_adm?: number | null
          faturamento_bruto?: number | null
          id?: string
          impostos?: number | null
          mes_referencia: string
        }
        Update: {
          cl?: string
          contrato_id?: string | null
          created_at?: string | null
          custo_mao_obra?: number | null
          custo_materiais?: number | null
          custo_terceiros?: number | null
          despesas_adm?: number | null
          faturamento_bruto?: number | null
          id?: string
          impostos?: number | null
          mes_referencia?: string
        }
        Relationships: [
          {
            foreignKeyName: "contrato_custos_contrato_id_fkey"
            columns: ["contrato_id"]
            isOneToOne: false
            referencedRelation: "contratos"
            referencedColumns: ["id"]
          },
        ]
      }
      contratos: {
        Row: {
          cl: string | null
          created_at: string | null
          id: string
          nome_contrato: string
        }
        Insert: {
          cl?: string | null
          created_at?: string | null
          id?: string
          nome_contrato: string
        }
        Update: {
          cl?: string | null
          created_at?: string | null
          id?: string
          nome_contrato?: string
        }
        Relationships: []
      }
      custos: {
        Row: {
          categoria: string
          contrato: string | null
          contrato_id: string | null
          created_at: string | null
          data: string
          descricao: string | null
          id: string
          valor: number
        }
        Insert: {
          categoria: string
          contrato?: string | null
          contrato_id?: string | null
          created_at?: string | null
          data: string
          descricao?: string | null
          id?: string
          valor: number
        }
        Update: {
          categoria?: string
          contrato?: string | null
          contrato_id?: string | null
          created_at?: string | null
          data?: string
          descricao?: string | null
          id?: string
          valor?: number
        }
        Relationships: [
          {
            foreignKeyName: "custos_contrato_id_fkey"
            columns: ["contrato_id"]
            isOneToOne: false
            referencedRelation: "contratos"
            referencedColumns: ["id"]
          },
        ]
      }
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
            foreignKeyName: "equipamento_fotos_equipamento_id_fkey"
            columns: ["equipamento_id"]
            isOneToOne: false
            referencedRelation: "tacografos_vencimentos"
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
          limite_revisao: number
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
          limite_revisao?: number
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
          limite_revisao?: number
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
          {
            foreignKeyName: "manutencao_historico_equipamento_id_fkey"
            columns: ["equipamento_id"]
            isOneToOne: false
            referencedRelation: "tacografos_vencimentos"
            referencedColumns: ["id"]
          },
        ]
      }
      notas_fiscais: {
        Row: {
          cl: string | null
          created_at: string
          created_by: string | null
          data: string | null
          descricao_produto: string | null
          equipamento_id: string | null
          fornecedor: string | null
          id: string
          identificacao: string | null
          nf: string | null
          observacao: string | null
          updated_at: string
          valor: number | null
          venc01: string | null
          venc02: string | null
          venc03: string | null
          venc04: string | null
          venc05: string | null
        }
        Insert: {
          cl?: string | null
          created_at?: string
          created_by?: string | null
          data?: string | null
          descricao_produto?: string | null
          equipamento_id?: string | null
          fornecedor?: string | null
          id?: string
          identificacao?: string | null
          nf?: string | null
          observacao?: string | null
          updated_at?: string
          valor?: number | null
          venc01?: string | null
          venc02?: string | null
          venc03?: string | null
          venc04?: string | null
          venc05?: string | null
        }
        Update: {
          cl?: string | null
          created_at?: string
          created_by?: string | null
          data?: string | null
          descricao_produto?: string | null
          equipamento_id?: string | null
          fornecedor?: string | null
          id?: string
          identificacao?: string | null
          nf?: string | null
          observacao?: string | null
          updated_at?: string
          valor?: number | null
          venc01?: string | null
          venc02?: string | null
          venc03?: string | null
          venc04?: string | null
          venc05?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "notas_fiscais_equipamento_id_fkey"
            columns: ["equipamento_id"]
            isOneToOne: false
            referencedRelation: "equipamentos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notas_fiscais_equipamento_id_fkey"
            columns: ["equipamento_id"]
            isOneToOne: false
            referencedRelation: "tacografos_vencimentos"
            referencedColumns: ["id"]
          },
        ]
      }
      notas_fiscais_permissoes: {
        Row: {
          created_at: string
          created_by: string | null
          gerenciar: boolean
          id: string
          updated_at: string
          user_id: string
          visualizar: boolean
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          gerenciar?: boolean
          id?: string
          updated_at?: string
          user_id: string
          visualizar?: boolean
        }
        Update: {
          created_at?: string
          created_by?: string | null
          gerenciar?: boolean
          id?: string
          updated_at?: string
          user_id?: string
          visualizar?: boolean
        }
        Relationships: []
      }
      notificacoes: {
        Row: {
          created_at: string
          data_vencimento: string | null
          dias: number | null
          equipamento_id: string | null
          id: string
          lida: boolean
          mensagem: string
          tipo: string
          titulo: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          data_vencimento?: string | null
          dias?: number | null
          equipamento_id?: string | null
          id?: string
          lida?: boolean
          mensagem: string
          tipo: string
          titulo: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          data_vencimento?: string | null
          dias?: number | null
          equipamento_id?: string | null
          id?: string
          lida?: boolean
          mensagem?: string
          tipo?: string
          titulo?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "notificacoes_equipamento_id_fkey"
            columns: ["equipamento_id"]
            isOneToOne: false
            referencedRelation: "equipamentos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notificacoes_equipamento_id_fkey"
            columns: ["equipamento_id"]
            isOneToOne: false
            referencedRelation: "tacografos_vencimentos"
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
      seguros: {
        Row: {
          created_at: string
          data_vencimento: string
          id: string
          seguradora: string
          updated_at: string
          veiculo_equipamento: string
        }
        Insert: {
          created_at?: string
          data_vencimento: string
          id?: string
          seguradora: string
          updated_at?: string
          veiculo_equipamento: string
        }
        Update: {
          created_at?: string
          data_vencimento?: string
          id?: string
          seguradora?: string
          updated_at?: string
          veiculo_equipamento?: string
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
      seguros_alerta: {
        Row: {
          data_vencimento: string | null
          dias_para_vencer: number | null
          id: string | null
          seguradora: string | null
          status_alerta: string | null
          veiculo_equipamento: string | null
        }
        Insert: {
          data_vencimento?: string | null
          dias_para_vencer?: never
          id?: string | null
          seguradora?: string | null
          status_alerta?: never
          veiculo_equipamento?: string | null
        }
        Update: {
          data_vencimento?: string | null
          dias_para_vencer?: never
          id?: string | null
          seguradora?: string | null
          status_alerta?: never
          veiculo_equipamento?: string | null
        }
        Relationships: []
      }
      tacografos_vencimentos: {
        Row: {
          data_vencimento: string | null
          dias: number | null
          id: string | null
          identificacao: string | null
          numero: string | null
          situacao: string | null
          valor_original: string | null
        }
        Insert: {
          data_vencimento?: never
          dias?: never
          id?: string | null
          identificacao?: string | null
          numero?: string | null
          situacao?: never
          valor_original?: string | null
        }
        Update: {
          data_vencimento?: never
          dias?: never
          id?: string | null
          identificacao?: string | null
          numero?: string | null
          situacao?: never
          valor_original?: string | null
        }
        Relationships: []
      }
    }
    Functions: {
      can_manage_notas_fiscais: { Args: never; Returns: boolean }
      can_view_notas_fiscais: { Args: never; Returns: boolean }
      gerar_notificacoes_tacografos: { Args: never; Returns: number }
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
