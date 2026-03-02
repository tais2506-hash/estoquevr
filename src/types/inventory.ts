export type UserRole = "almoxarifado" | "admin";

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
}

export interface Obra {
  id: string;
  code: string; // internal code - never shown in UI
  name: string;
  address: string;
  status: "ativa" | "concluida" | "pausada";
}

export interface Insumo {
  id: string;
  code: string;
  name: string;
  unit: string;
  category: string;
}

export interface EstoqueItem {
  insumoId: string;
  obraId: string;
  quantity: number;
  averageUnitCost: number;
  totalValue: number;
}

export interface Fornecedor {
  id: string;
  name: string;
  cnpj: string;
  contact?: string;
}

export interface EntradaEstoque {
  id: string;
  obraId: string;
  insumoId: string;
  notaFiscal: string;
  fornecedorId: string;
  quantity: number;
  unitValue: number;
  totalValue: number;
  date: string;
  fvmId: string;
  avaliacaoId?: string;
  createdAt: string;
}

export interface SaidaEstoque {
  id: string;
  obraId: string;
  insumoId: string;
  quantity: number;
  date: string;
  localAplicacao: string;
  responsavel: string;
  createdAt: string;
  editedAt?: string;
  editReason?: string;
}

export interface Transferencia {
  id: string;
  obraOrigemId: string;
  obraDestinoId: string;
  insumoId: string;
  quantity: number;
  date: string;
  createdAt: string;
}

export interface Devolucao {
  id: string;
  obraId: string;
  entradaId: string;
  insumoId: string;
  fornecedorId: string;
  quantity: number;
  motivo: string;
  date: string;
  createdAt: string;
}

export interface InventarioItem {
  id: string;
  obraId: string;
  insumoId: string;
  quantidadeSistema: number;
  quantidadeFisica: number;
  diferenca: number;
  justificativa: string;
  date: string;
  createdAt: string;
}

export interface FVM {
  id: string;
  obraId: string;
  notaFiscal: string;
  fornecedorId: string;
  date: string;
  quantidadeConferida: boolean;
  qualidadeMaterial: boolean;
  documentacaoOk: boolean;
  observacoes: string;
  status: "pendente" | "aprovada" | "reprovada";
  createdAt: string;
}

export interface AvaliacaoFornecedor {
  id: string;
  obraId: string;
  fornecedorId: string;
  notaFiscal: string;
  pontualidade: number; // 1-5
  qualidade: number; // 1-5
  atendimento: number; // 1-5
  documentacao: number; // 1-5
  observacoes: string;
  date: string;
  createdAt: string;
}

export type MovimentationType = "entrada" | "saida" | "transferencia_entrada" | "transferencia_saida" | "devolucao" | "ajuste_inventario";

export interface Movimentacao {
  id: string;
  obraId: string;
  insumoId: string;
  type: MovimentationType;
  quantity: number;
  date: string;
  description: string;
  referenceId: string;
  createdAt: string;
}
