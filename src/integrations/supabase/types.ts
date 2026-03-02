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
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      audit_logs: {
        Row: {
          action: string
          created_at: string
          id: string
          new_value: Json | null
          obra_id: string | null
          old_value: Json | null
          record_id: string | null
          table_name: string | null
          user_id: string | null
          user_name: string | null
          user_role: string | null
        }
        Insert: {
          action: string
          created_at?: string
          id?: string
          new_value?: Json | null
          obra_id?: string | null
          old_value?: Json | null
          record_id?: string | null
          table_name?: string | null
          user_id?: string | null
          user_name?: string | null
          user_role?: string | null
        }
        Update: {
          action?: string
          created_at?: string
          id?: string
          new_value?: Json | null
          obra_id?: string | null
          old_value?: Json | null
          record_id?: string | null
          table_name?: string | null
          user_id?: string | null
          user_name?: string | null
          user_role?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "audit_logs_obra_id_fkey"
            columns: ["obra_id"]
            isOneToOne: false
            referencedRelation: "obras"
            referencedColumns: ["id"]
          },
        ]
      }
      avaliacoes: {
        Row: {
          atendimento: number
          created_at: string
          date: string
          documentacao: number
          fornecedor_id: string
          id: string
          nota_fiscal: string
          obra_id: string
          observacoes: string | null
          pontualidade: number
          qualidade: number
          user_id: string
        }
        Insert: {
          atendimento: number
          created_at?: string
          date: string
          documentacao: number
          fornecedor_id: string
          id?: string
          nota_fiscal: string
          obra_id: string
          observacoes?: string | null
          pontualidade: number
          qualidade: number
          user_id: string
        }
        Update: {
          atendimento?: number
          created_at?: string
          date?: string
          documentacao?: number
          fornecedor_id?: string
          id?: string
          nota_fiscal?: string
          obra_id?: string
          observacoes?: string | null
          pontualidade?: number
          qualidade?: number
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "avaliacoes_fornecedor_id_fkey"
            columns: ["fornecedor_id"]
            isOneToOne: false
            referencedRelation: "fornecedores"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "avaliacoes_obra_id_fkey"
            columns: ["obra_id"]
            isOneToOne: false
            referencedRelation: "obras"
            referencedColumns: ["id"]
          },
        ]
      }
      configuracoes: {
        Row: {
          currency: string
          dark_mode: boolean
          id: string
          logo_url: string | null
          primary_color: string
          system_name: string
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          currency?: string
          dark_mode?: boolean
          id?: string
          logo_url?: string | null
          primary_color?: string
          system_name?: string
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          currency?: string
          dark_mode?: boolean
          id?: string
          logo_url?: string | null
          primary_color?: string
          system_name?: string
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: []
      }
      devolucoes: {
        Row: {
          created_at: string
          date: string
          entrada_id: string
          fornecedor_id: string
          id: string
          insumo_id: string
          motivo: string
          obra_id: string
          quantity: number
          user_id: string
        }
        Insert: {
          created_at?: string
          date: string
          entrada_id: string
          fornecedor_id: string
          id?: string
          insumo_id: string
          motivo: string
          obra_id: string
          quantity: number
          user_id: string
        }
        Update: {
          created_at?: string
          date?: string
          entrada_id?: string
          fornecedor_id?: string
          id?: string
          insumo_id?: string
          motivo?: string
          obra_id?: string
          quantity?: number
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "devolucoes_entrada_id_fkey"
            columns: ["entrada_id"]
            isOneToOne: false
            referencedRelation: "entradas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "devolucoes_fornecedor_id_fkey"
            columns: ["fornecedor_id"]
            isOneToOne: false
            referencedRelation: "fornecedores"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "devolucoes_insumo_id_fkey"
            columns: ["insumo_id"]
            isOneToOne: false
            referencedRelation: "insumos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "devolucoes_obra_id_fkey"
            columns: ["obra_id"]
            isOneToOne: false
            referencedRelation: "obras"
            referencedColumns: ["id"]
          },
        ]
      }
      entradas: {
        Row: {
          avaliacao_id: string | null
          created_at: string
          date: string
          deleted_at: string | null
          fornecedor_id: string
          fvm_id: string | null
          id: string
          insumo_id: string
          nota_fiscal: string
          obra_id: string
          quantity: number
          total_value: number
          unit_value: number
          user_id: string
        }
        Insert: {
          avaliacao_id?: string | null
          created_at?: string
          date: string
          deleted_at?: string | null
          fornecedor_id: string
          fvm_id?: string | null
          id?: string
          insumo_id: string
          nota_fiscal: string
          obra_id: string
          quantity: number
          total_value: number
          unit_value: number
          user_id: string
        }
        Update: {
          avaliacao_id?: string | null
          created_at?: string
          date?: string
          deleted_at?: string | null
          fornecedor_id?: string
          fvm_id?: string | null
          id?: string
          insumo_id?: string
          nota_fiscal?: string
          obra_id?: string
          quantity?: number
          total_value?: number
          unit_value?: number
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "entradas_fornecedor_id_fkey"
            columns: ["fornecedor_id"]
            isOneToOne: false
            referencedRelation: "fornecedores"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "entradas_insumo_id_fkey"
            columns: ["insumo_id"]
            isOneToOne: false
            referencedRelation: "insumos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "entradas_obra_id_fkey"
            columns: ["obra_id"]
            isOneToOne: false
            referencedRelation: "obras"
            referencedColumns: ["id"]
          },
        ]
      }
      estoque: {
        Row: {
          average_unit_cost: number
          id: string
          insumo_id: string
          obra_id: string
          quantity: number
          total_value: number
          updated_at: string
        }
        Insert: {
          average_unit_cost?: number
          id?: string
          insumo_id: string
          obra_id: string
          quantity?: number
          total_value?: number
          updated_at?: string
        }
        Update: {
          average_unit_cost?: number
          id?: string
          insumo_id?: string
          obra_id?: string
          quantity?: number
          total_value?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "estoque_insumo_id_fkey"
            columns: ["insumo_id"]
            isOneToOne: false
            referencedRelation: "insumos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "estoque_obra_id_fkey"
            columns: ["obra_id"]
            isOneToOne: false
            referencedRelation: "obras"
            referencedColumns: ["id"]
          },
        ]
      }
      fornecedores: {
        Row: {
          cnpj: string
          contact: string | null
          created_at: string
          deleted_at: string | null
          id: string
          name: string
          updated_at: string
        }
        Insert: {
          cnpj: string
          contact?: string | null
          created_at?: string
          deleted_at?: string | null
          id?: string
          name: string
          updated_at?: string
        }
        Update: {
          cnpj?: string
          contact?: string | null
          created_at?: string
          deleted_at?: string | null
          id?: string
          name?: string
          updated_at?: string
        }
        Relationships: []
      }
      fvms: {
        Row: {
          created_at: string
          date: string
          documentacao_ok: boolean
          fornecedor_id: string
          id: string
          nota_fiscal: string
          obra_id: string
          observacoes: string | null
          qualidade_material: boolean
          quantidade_conferida: boolean
          status: Database["public"]["Enums"]["fvm_status"]
          user_id: string
        }
        Insert: {
          created_at?: string
          date: string
          documentacao_ok?: boolean
          fornecedor_id: string
          id?: string
          nota_fiscal: string
          obra_id: string
          observacoes?: string | null
          qualidade_material?: boolean
          quantidade_conferida?: boolean
          status?: Database["public"]["Enums"]["fvm_status"]
          user_id: string
        }
        Update: {
          created_at?: string
          date?: string
          documentacao_ok?: boolean
          fornecedor_id?: string
          id?: string
          nota_fiscal?: string
          obra_id?: string
          observacoes?: string | null
          qualidade_material?: boolean
          quantidade_conferida?: boolean
          status?: Database["public"]["Enums"]["fvm_status"]
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "fvms_fornecedor_id_fkey"
            columns: ["fornecedor_id"]
            isOneToOne: false
            referencedRelation: "fornecedores"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fvms_obra_id_fkey"
            columns: ["obra_id"]
            isOneToOne: false
            referencedRelation: "obras"
            referencedColumns: ["id"]
          },
        ]
      }
      insumos: {
        Row: {
          category: string
          code: string
          controla_consumo: boolean
          controla_estoque: boolean
          controla_rastreabilidade: boolean
          created_at: string
          deleted_at: string | null
          estoque_minimo: number
          exige_servico_baixa: boolean
          id: string
          material_nao_estocavel: boolean
          name: string
          unit: string
          updated_at: string
        }
        Insert: {
          category?: string
          code: string
          controla_consumo?: boolean
          controla_estoque?: boolean
          controla_rastreabilidade?: boolean
          created_at?: string
          deleted_at?: string | null
          estoque_minimo?: number
          exige_servico_baixa?: boolean
          id?: string
          material_nao_estocavel?: boolean
          name: string
          unit: string
          updated_at?: string
        }
        Update: {
          category?: string
          code?: string
          controla_consumo?: boolean
          controla_estoque?: boolean
          controla_rastreabilidade?: boolean
          created_at?: string
          deleted_at?: string | null
          estoque_minimo?: number
          exige_servico_baixa?: boolean
          id?: string
          material_nao_estocavel?: boolean
          name?: string
          unit?: string
          updated_at?: string
        }
        Relationships: []
      }
      inventarios: {
        Row: {
          created_at: string
          date: string
          diferenca: number
          id: string
          insumo_id: string
          justificativa: string
          obra_id: string
          quantidade_fisica: number
          quantidade_sistema: number
          user_id: string
        }
        Insert: {
          created_at?: string
          date: string
          diferenca: number
          id?: string
          insumo_id: string
          justificativa: string
          obra_id: string
          quantidade_fisica: number
          quantidade_sistema: number
          user_id: string
        }
        Update: {
          created_at?: string
          date?: string
          diferenca?: number
          id?: string
          insumo_id?: string
          justificativa?: string
          obra_id?: string
          quantidade_fisica?: number
          quantidade_sistema?: number
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "inventarios_insumo_id_fkey"
            columns: ["insumo_id"]
            isOneToOne: false
            referencedRelation: "insumos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventarios_obra_id_fkey"
            columns: ["obra_id"]
            isOneToOne: false
            referencedRelation: "obras"
            referencedColumns: ["id"]
          },
        ]
      }
      kit_items: {
        Row: {
          created_at: string
          id: string
          insumo_id: string
          kit_id: string
          quantity: number
        }
        Insert: {
          created_at?: string
          id?: string
          insumo_id: string
          kit_id: string
          quantity?: number
        }
        Update: {
          created_at?: string
          id?: string
          insumo_id?: string
          kit_id?: string
          quantity?: number
        }
        Relationships: [
          {
            foreignKeyName: "kit_items_insumo_id_fkey"
            columns: ["insumo_id"]
            isOneToOne: false
            referencedRelation: "insumos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "kit_items_kit_id_fkey"
            columns: ["kit_id"]
            isOneToOne: false
            referencedRelation: "kits"
            referencedColumns: ["id"]
          },
        ]
      }
      kits: {
        Row: {
          created_at: string
          deleted_at: string | null
          description: string | null
          id: string
          name: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          deleted_at?: string | null
          description?: string | null
          id?: string
          name: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          deleted_at?: string | null
          description?: string | null
          id?: string
          name?: string
          updated_at?: string
        }
        Relationships: []
      }
      locations: {
        Row: {
          created_at: string
          deleted_at: string | null
          id: string
          name: string
          obra_id: string
          parent_id: string | null
          status: string
          type: Database["public"]["Enums"]["location_type"]
          updated_at: string
        }
        Insert: {
          created_at?: string
          deleted_at?: string | null
          id?: string
          name: string
          obra_id: string
          parent_id?: string | null
          status?: string
          type?: Database["public"]["Enums"]["location_type"]
          updated_at?: string
        }
        Update: {
          created_at?: string
          deleted_at?: string | null
          id?: string
          name?: string
          obra_id?: string
          parent_id?: string | null
          status?: string
          type?: Database["public"]["Enums"]["location_type"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "locations_obra_id_fkey"
            columns: ["obra_id"]
            isOneToOne: false
            referencedRelation: "obras"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "locations_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "locations"
            referencedColumns: ["id"]
          },
        ]
      }
      movimentacoes: {
        Row: {
          created_at: string
          date: string
          deleted_at: string | null
          description: string
          id: string
          insumo_id: string
          obra_id: string
          quantity: number
          reference_id: string | null
          type: Database["public"]["Enums"]["movimentacao_type"]
          user_id: string
        }
        Insert: {
          created_at?: string
          date: string
          deleted_at?: string | null
          description?: string
          id?: string
          insumo_id: string
          obra_id: string
          quantity: number
          reference_id?: string | null
          type: Database["public"]["Enums"]["movimentacao_type"]
          user_id: string
        }
        Update: {
          created_at?: string
          date?: string
          deleted_at?: string | null
          description?: string
          id?: string
          insumo_id?: string
          obra_id?: string
          quantity?: number
          reference_id?: string | null
          type?: Database["public"]["Enums"]["movimentacao_type"]
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "movimentacoes_insumo_id_fkey"
            columns: ["insumo_id"]
            isOneToOne: false
            referencedRelation: "insumos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "movimentacoes_obra_id_fkey"
            columns: ["obra_id"]
            isOneToOne: false
            referencedRelation: "obras"
            referencedColumns: ["id"]
          },
        ]
      }
      obras: {
        Row: {
          address: string
          code: string
          created_at: string
          id: string
          name: string
          status: Database["public"]["Enums"]["obra_status"]
          updated_at: string
        }
        Insert: {
          address?: string
          code: string
          created_at?: string
          id?: string
          name: string
          status?: Database["public"]["Enums"]["obra_status"]
          updated_at?: string
        }
        Update: {
          address?: string
          code?: string
          created_at?: string
          id?: string
          name?: string
          status?: Database["public"]["Enums"]["obra_status"]
          updated_at?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          id: string
          name: string
          updated_at: string
          user_id: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          id?: string
          name?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          id?: string
          name?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      saidas: {
        Row: {
          created_at: string
          date: string
          deleted_at: string | null
          edit_reason: string | null
          edited_at: string | null
          id: string
          insumo_id: string
          kit_id: string | null
          local_aplicacao: string
          location_id: string | null
          obra_id: string
          quantidade_executada: number | null
          quantity: number
          responsavel: string
          service_package_id: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          date: string
          deleted_at?: string | null
          edit_reason?: string | null
          edited_at?: string | null
          id?: string
          insumo_id: string
          kit_id?: string | null
          local_aplicacao: string
          location_id?: string | null
          obra_id: string
          quantidade_executada?: number | null
          quantity: number
          responsavel: string
          service_package_id?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          date?: string
          deleted_at?: string | null
          edit_reason?: string | null
          edited_at?: string | null
          id?: string
          insumo_id?: string
          kit_id?: string | null
          local_aplicacao?: string
          location_id?: string | null
          obra_id?: string
          quantidade_executada?: number | null
          quantity?: number
          responsavel?: string
          service_package_id?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "saidas_insumo_id_fkey"
            columns: ["insumo_id"]
            isOneToOne: false
            referencedRelation: "insumos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "saidas_kit_id_fkey"
            columns: ["kit_id"]
            isOneToOne: false
            referencedRelation: "kits"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "saidas_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "locations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "saidas_obra_id_fkey"
            columns: ["obra_id"]
            isOneToOne: false
            referencedRelation: "obras"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "saidas_service_package_id_fkey"
            columns: ["service_package_id"]
            isOneToOne: false
            referencedRelation: "service_packages"
            referencedColumns: ["id"]
          },
        ]
      }
      service_packages: {
        Row: {
          created_at: string
          deleted_at: string | null
          eap_code: string
          id: string
          name: string
          obra_id: string
          status: string
          unit: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          deleted_at?: string | null
          eap_code?: string
          id?: string
          name: string
          obra_id: string
          status?: string
          unit?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          deleted_at?: string | null
          eap_code?: string
          id?: string
          name?: string
          obra_id?: string
          status?: string
          unit?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "service_packages_obra_id_fkey"
            columns: ["obra_id"]
            isOneToOne: false
            referencedRelation: "obras"
            referencedColumns: ["id"]
          },
        ]
      }
      transferencias: {
        Row: {
          created_at: string
          date: string
          id: string
          insumo_id: string
          obra_destino_id: string
          obra_origem_id: string
          quantity: number
          user_id: string
        }
        Insert: {
          created_at?: string
          date: string
          id?: string
          insumo_id: string
          obra_destino_id: string
          obra_origem_id: string
          quantity: number
          user_id: string
        }
        Update: {
          created_at?: string
          date?: string
          id?: string
          insumo_id?: string
          obra_destino_id?: string
          obra_origem_id?: string
          quantity?: number
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "transferencias_insumo_id_fkey"
            columns: ["insumo_id"]
            isOneToOne: false
            referencedRelation: "insumos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transferencias_obra_destino_id_fkey"
            columns: ["obra_destino_id"]
            isOneToOne: false
            referencedRelation: "obras"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transferencias_obra_origem_id_fkey"
            columns: ["obra_origem_id"]
            isOneToOne: false
            referencedRelation: "obras"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
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
      app_role: "admin" | "almoxarifado"
      fvm_status: "pendente" | "aprovada" | "reprovada"
      location_type: "torre" | "pavimento" | "unidade" | "ambiente"
      movimentacao_type:
        | "entrada"
        | "saida"
        | "transferencia_entrada"
        | "transferencia_saida"
        | "devolucao"
        | "ajuste_inventario"
      obra_status: "ativa" | "concluida" | "pausada" | "arquivada"
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
      app_role: ["admin", "almoxarifado"],
      fvm_status: ["pendente", "aprovada", "reprovada"],
      location_type: ["torre", "pavimento", "unidade", "ambiente"],
      movimentacao_type: [
        "entrada",
        "saida",
        "transferencia_entrada",
        "transferencia_saida",
        "devolucao",
        "ajuste_inventario",
      ],
      obra_status: ["ativa", "concluida", "pausada", "arquivada"],
    },
  },
} as const
