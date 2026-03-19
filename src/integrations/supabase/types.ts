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
      available_permissions: {
        Row: {
          category: string
          description: string | null
          id: string
          label: string
          sort_order: number
        }
        Insert: {
          category: string
          description?: string | null
          id: string
          label: string
          sort_order?: number
        }
        Update: {
          category?: string
          description?: string | null
          id?: string
          label?: string
          sort_order?: number
        }
        Relationships: []
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
      emprestimos: {
        Row: {
          aprovador_nome: string | null
          aprovador_user_id: string | null
          created_at: string
          data_devolucao: string | null
          data_prevista_devolucao: string
          date: string
          id: string
          insumo_id: string
          obra_emprestadora_id: string
          obra_solicitante_id: string
          observacoes: string | null
          quantity: number
          solicitante_nome: string
          solicitante_user_id: string
          status: string
        }
        Insert: {
          aprovador_nome?: string | null
          aprovador_user_id?: string | null
          created_at?: string
          data_devolucao?: string | null
          data_prevista_devolucao: string
          date: string
          id?: string
          insumo_id: string
          obra_emprestadora_id: string
          obra_solicitante_id: string
          observacoes?: string | null
          quantity: number
          solicitante_nome?: string
          solicitante_user_id: string
          status?: string
        }
        Update: {
          aprovador_nome?: string | null
          aprovador_user_id?: string | null
          created_at?: string
          data_devolucao?: string | null
          data_prevista_devolucao?: string
          date?: string
          id?: string
          insumo_id?: string
          obra_emprestadora_id?: string
          obra_solicitante_id?: string
          observacoes?: string | null
          quantity?: number
          solicitante_nome?: string
          solicitante_user_id?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "emprestimos_insumo_id_fkey"
            columns: ["insumo_id"]
            isOneToOne: false
            referencedRelation: "insumos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "emprestimos_obra_emprestadora_id_fkey"
            columns: ["obra_emprestadora_id"]
            isOneToOne: false
            referencedRelation: "obras"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "emprestimos_obra_solicitante_id_fkey"
            columns: ["obra_solicitante_id"]
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
          fornecedor_id: string | null
          fvm_id: string | null
          id: string
          insumo_id: string
          lote: string | null
          nota_fiscal: string
          obra_id: string
          oc_item_id: string | null
          quantity: number
          total_value: number
          unit_value: number
          user_id: string
          validade: string | null
        }
        Insert: {
          avaliacao_id?: string | null
          created_at?: string
          date: string
          deleted_at?: string | null
          fornecedor_id?: string | null
          fvm_id?: string | null
          id?: string
          insumo_id: string
          lote?: string | null
          nota_fiscal: string
          obra_id: string
          oc_item_id?: string | null
          quantity: number
          total_value: number
          unit_value: number
          user_id: string
          validade?: string | null
        }
        Update: {
          avaliacao_id?: string | null
          created_at?: string
          date?: string
          deleted_at?: string | null
          fornecedor_id?: string | null
          fvm_id?: string | null
          id?: string
          insumo_id?: string
          lote?: string | null
          nota_fiscal?: string
          obra_id?: string
          oc_item_id?: string | null
          quantity?: number
          total_value?: number
          unit_value?: number
          user_id?: string
          validade?: string | null
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
          {
            foreignKeyName: "entradas_oc_item_id_fkey"
            columns: ["oc_item_id"]
            isOneToOne: false
            referencedRelation: "oc_items"
            referencedColumns: ["id"]
          },
        ]
      }
      estoque: {
        Row: {
          average_unit_cost: number
          id: string
          insumo_id: string
          lote: string | null
          obra_id: string
          quantity: number
          total_value: number
          updated_at: string
          validade: string | null
        }
        Insert: {
          average_unit_cost?: number
          id?: string
          insumo_id: string
          lote?: string | null
          obra_id: string
          quantity?: number
          total_value?: number
          updated_at?: string
          validade?: string | null
        }
        Update: {
          average_unit_cost?: number
          id?: string
          insumo_id?: string
          lote?: string | null
          obra_id?: string
          quantity?: number
          total_value?: number
          updated_at?: string
          validade?: string | null
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
      fabricantes: {
        Row: {
          created_at: string
          deleted_at: string | null
          id: string
          name: string
        }
        Insert: {
          created_at?: string
          deleted_at?: string | null
          id?: string
          name: string
        }
        Update: {
          created_at?: string
          deleted_at?: string | null
          id?: string
          name?: string
        }
        Relationships: []
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
      fvm_answers: {
        Row: {
          conforme: boolean
          created_at: string
          fvm_id: string
          id: string
          observacao: string | null
          question_id: string
        }
        Insert: {
          conforme?: boolean
          created_at?: string
          fvm_id: string
          id?: string
          observacao?: string | null
          question_id: string
        }
        Update: {
          conforme?: boolean
          created_at?: string
          fvm_id?: string
          id?: string
          observacao?: string | null
          question_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "fvm_answers_fvm_id_fkey"
            columns: ["fvm_id"]
            isOneToOne: false
            referencedRelation: "fvms"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fvm_answers_question_id_fkey"
            columns: ["question_id"]
            isOneToOne: false
            referencedRelation: "fvm_questions"
            referencedColumns: ["id"]
          },
        ]
      }
      fvm_questions: {
        Row: {
          active: boolean
          created_at: string
          id: string
          sort_order: number
          text: string
        }
        Insert: {
          active?: boolean
          created_at?: string
          id?: string
          sort_order?: number
          text: string
        }
        Update: {
          active?: boolean
          created_at?: string
          id?: string
          sort_order?: number
          text?: string
        }
        Relationships: []
      }
      fvms: {
        Row: {
          created_at: string
          date: string
          documentacao_ok: boolean
          fornecedor_id: string | null
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
          fornecedor_id?: string | null
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
          fornecedor_id?: string | null
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
      insumo_categories: {
        Row: {
          created_at: string
          id: string
          name: string
          sort_order: number
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
          sort_order?: number
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          sort_order?: number
        }
        Relationships: []
      }
      insumo_units: {
        Row: {
          abbreviation: string
          created_at: string
          id: string
          name: string
          sort_order: number
        }
        Insert: {
          abbreviation: string
          created_at?: string
          id?: string
          name: string
          sort_order?: number
        }
        Update: {
          abbreviation?: string
          created_at?: string
          id?: string
          name?: string
          sort_order?: number
        }
        Relationships: []
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
          tipo_laudo: Database["public"]["Enums"]["tipo_laudo"]
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
          tipo_laudo?: Database["public"]["Enums"]["tipo_laudo"]
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
          tipo_laudo?: Database["public"]["Enums"]["tipo_laudo"]
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
          obra_id: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          deleted_at?: string | null
          description?: string | null
          id?: string
          name: string
          obra_id?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          deleted_at?: string | null
          description?: string | null
          id?: string
          name?: string
          obra_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "kits_obra_id_fkey"
            columns: ["obra_id"]
            isOneToOne: false
            referencedRelation: "obras"
            referencedColumns: ["id"]
          },
        ]
      }
      laudos: {
        Row: {
          created_at: string
          created_by: string
          fabricante_id: string | null
          file_name: string
          file_url: string
          fvm_id: string | null
          id: string
          insumo_id: string
          lote: string | null
          nota_fiscal: string | null
          obra_id: string | null
          updated_at: string
          validade: string | null
        }
        Insert: {
          created_at?: string
          created_by: string
          fabricante_id?: string | null
          file_name: string
          file_url: string
          fvm_id?: string | null
          id?: string
          insumo_id: string
          lote?: string | null
          nota_fiscal?: string | null
          obra_id?: string | null
          updated_at?: string
          validade?: string | null
        }
        Update: {
          created_at?: string
          created_by?: string
          fabricante_id?: string | null
          file_name?: string
          file_url?: string
          fvm_id?: string | null
          id?: string
          insumo_id?: string
          lote?: string | null
          nota_fiscal?: string | null
          obra_id?: string | null
          updated_at?: string
          validade?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "laudos_fabricante_id_fkey"
            columns: ["fabricante_id"]
            isOneToOne: false
            referencedRelation: "fabricantes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "laudos_fvm_id_fkey"
            columns: ["fvm_id"]
            isOneToOne: false
            referencedRelation: "fvms"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "laudos_insumo_id_fkey"
            columns: ["insumo_id"]
            isOneToOne: false
            referencedRelation: "insumos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "laudos_obra_id_fkey"
            columns: ["obra_id"]
            isOneToOne: false
            referencedRelation: "obras"
            referencedColumns: ["id"]
          },
        ]
      }
      location_types: {
        Row: {
          created_at: string
          id: string
          name: string
          sort_order: number
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
          sort_order?: number
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          sort_order?: number
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
          user_name: string
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
          user_name?: string
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
          user_name?: string
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
      nao_conformidades: {
        Row: {
          created_at: string
          description: string
          fvm_answer_id: string | null
          fvm_id: string
          id: string
          insumo_id: string | null
          obra_id: string
          resolution: string | null
          resolved_at: string | null
          resolved_by: string | null
          status: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string
          fvm_answer_id?: string | null
          fvm_id: string
          id?: string
          insumo_id?: string | null
          obra_id: string
          resolution?: string | null
          resolved_at?: string | null
          resolved_by?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string
          fvm_answer_id?: string | null
          fvm_id?: string
          id?: string
          insumo_id?: string | null
          obra_id?: string
          resolution?: string | null
          resolved_at?: string | null
          resolved_by?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "nao_conformidades_fvm_answer_id_fkey"
            columns: ["fvm_answer_id"]
            isOneToOne: false
            referencedRelation: "fvm_answers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "nao_conformidades_fvm_id_fkey"
            columns: ["fvm_id"]
            isOneToOne: false
            referencedRelation: "fvms"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "nao_conformidades_insumo_id_fkey"
            columns: ["insumo_id"]
            isOneToOne: false
            referencedRelation: "insumos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "nao_conformidades_obra_id_fkey"
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
      oc_items: {
        Row: {
          created_at: string
          id: string
          insumo_id: string
          oc_id: string
          quantity: number
          quantity_delivered: number
          unit_value: number
        }
        Insert: {
          created_at?: string
          id?: string
          insumo_id: string
          oc_id: string
          quantity: number
          quantity_delivered?: number
          unit_value?: number
        }
        Update: {
          created_at?: string
          id?: string
          insumo_id?: string
          oc_id?: string
          quantity?: number
          quantity_delivered?: number
          unit_value?: number
        }
        Relationships: [
          {
            foreignKeyName: "oc_items_insumo_id_fkey"
            columns: ["insumo_id"]
            isOneToOne: false
            referencedRelation: "insumos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "oc_items_oc_id_fkey"
            columns: ["oc_id"]
            isOneToOne: false
            referencedRelation: "ordens_compra"
            referencedColumns: ["id"]
          },
        ]
      }
      ordens_compra: {
        Row: {
          created_at: string
          id: string
          numero_oc: string
          obra_id: string
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          numero_oc: string
          obra_id: string
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          numero_oc?: string
          obra_id?: string
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ordens_compra_obra_id_fkey"
            columns: ["obra_id"]
            isOneToOne: false
            referencedRelation: "obras"
            referencedColumns: ["id"]
          },
        ]
      }
      permission_profiles: {
        Row: {
          created_at: string
          description: string | null
          id: string
          name: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          name: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          name?: string
          updated_at?: string
        }
        Relationships: []
      }
      profile_permissions: {
        Row: {
          created_at: string
          id: string
          permission: string
          profile_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          permission: string
          profile_id: string
        }
        Update: {
          created_at?: string
          id?: string
          permission?: string
          profile_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "profile_permissions_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "permission_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          id: string
          name: string
          permission_profile_id: string | null
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          id?: string
          name?: string
          permission_profile_id?: string | null
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          id?: string
          name?: string
          permission_profile_id?: string | null
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "profiles_permission_profile_id_fkey"
            columns: ["permission_profile_id"]
            isOneToOne: false
            referencedRelation: "permission_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      requisicoes: {
        Row: {
          approved_at: string | null
          approved_by: string | null
          created_at: string
          date: string
          id: string
          insumo_id: string
          kit_id: string | null
          local_aplicacao: string
          location_id: string | null
          motivo_rejeicao: string | null
          obra_id: string
          quantity: number
          responsavel: string
          solicitante_nome: string
          status: string
          user_id: string
        }
        Insert: {
          approved_at?: string | null
          approved_by?: string | null
          created_at?: string
          date: string
          id?: string
          insumo_id: string
          kit_id?: string | null
          local_aplicacao?: string
          location_id?: string | null
          motivo_rejeicao?: string | null
          obra_id: string
          quantity: number
          responsavel: string
          solicitante_nome?: string
          status?: string
          user_id: string
        }
        Update: {
          approved_at?: string | null
          approved_by?: string | null
          created_at?: string
          date?: string
          id?: string
          insumo_id?: string
          kit_id?: string | null
          local_aplicacao?: string
          location_id?: string | null
          motivo_rejeicao?: string | null
          obra_id?: string
          quantity?: number
          responsavel?: string
          solicitante_nome?: string
          status?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "requisicoes_insumo_id_fkey"
            columns: ["insumo_id"]
            isOneToOne: false
            referencedRelation: "insumos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "requisicoes_kit_id_fkey"
            columns: ["kit_id"]
            isOneToOne: false
            referencedRelation: "kits"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "requisicoes_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "locations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "requisicoes_obra_id_fkey"
            columns: ["obra_id"]
            isOneToOne: false
            referencedRelation: "obras"
            referencedColumns: ["id"]
          },
        ]
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
          lote: string | null
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
          lote?: string | null
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
          lote?: string | null
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
          obra_id: string | null
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
          obra_id?: string | null
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
          obra_id?: string | null
          status?: string
          unit?: string
          updated_at?: string
        }
        Relationships: []
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
      user_has_permission: {
        Args: { _permission: string; _user_id: string }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "admin" | "almoxarifado" | "gestor_obra" | "visualizador"
      fvm_status: "pendente" | "aprovada" | "reprovada"
      location_type: "torre" | "pavimento" | "unidade" | "ambiente"
      movimentacao_type:
        | "entrada"
        | "saida"
        | "transferencia_entrada"
        | "transferencia_saida"
        | "devolucao"
        | "ajuste_inventario"
        | "exclusao_global"
      obra_status: "ativa" | "concluida" | "pausada" | "arquivada"
      tipo_laudo: "global" | "por_lote" | "nao_controlado"
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
      app_role: ["admin", "almoxarifado", "gestor_obra", "visualizador"],
      fvm_status: ["pendente", "aprovada", "reprovada"],
      location_type: ["torre", "pavimento", "unidade", "ambiente"],
      movimentacao_type: [
        "entrada",
        "saida",
        "transferencia_entrada",
        "transferencia_saida",
        "devolucao",
        "ajuste_inventario",
        "exclusao_global",
      ],
      obra_status: ["ativa", "concluida", "pausada", "arquivada"],
      tipo_laudo: ["global", "por_lote", "nao_controlado"],
    },
  },
} as const
