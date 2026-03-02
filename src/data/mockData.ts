import type { Obra, Insumo, Fornecedor, EstoqueItem, EntradaEstoque, SaidaEstoque, Transferencia, Devolucao, Movimentacao, FVM, AvaliacaoFornecedor } from "@/types/inventory";

export const mockObras: Obra[] = [
  { id: "o1", code: "VR-2024-001", name: "Residencial Primavera", address: "Rua das Flores, 123 - São Paulo", status: "ativa" },
  { id: "o2", code: "VR-2024-002", name: "Edifício Aurora", address: "Av. Brasil, 456 - Campinas", status: "ativa" },
  { id: "o3", code: "VR-2023-015", name: "Condomínio Solar", address: "Rua do Sol, 789 - Ribeirão Preto", status: "pausada" },
];

export const mockInsumos: Insumo[] = [
  { id: "i1", code: "CIM-001", name: "Cimento CP-II 50kg", unit: "saco", category: "Cimento" },
  { id: "i2", code: "ACO-001", name: "Aço CA-50 10mm", unit: "barra", category: "Aço" },
  { id: "i3", code: "ARE-001", name: "Areia Média", unit: "m³", category: "Agregados" },
  { id: "i4", code: "BRI-001", name: "Tijolo Cerâmico 9 furos", unit: "milheiro", category: "Alvenaria" },
  { id: "i5", code: "TUB-001", name: "Tubo PVC 100mm", unit: "barra", category: "Hidráulica" },
  { id: "i6", code: "FIO-001", name: "Fio 2.5mm²", unit: "rolo", category: "Elétrica" },
  { id: "i7", code: "TIN-001", name: "Tinta Acrílica 18L", unit: "lata", category: "Pintura" },
  { id: "i8", code: "MAD-001", name: "Tábua Pinus 3m", unit: "unidade", category: "Madeira" },
];

export const mockFornecedores: Fornecedor[] = [
  { id: "f1", name: "Votorantim Cimentos", cnpj: "01.637.895/0001-32", contact: "(11) 3333-0001" },
  { id: "f2", name: "Gerdau Aços", cnpj: "33.611.500/0001-19", contact: "(11) 3333-0002" },
  { id: "f3", name: "Concremix Agregados", cnpj: "04.732.456/0001-50", contact: "(19) 3333-0003" },
  { id: "f4", name: "Cerâmica Nacional", cnpj: "12.345.678/0001-99", contact: "(16) 3333-0004" },
];

export const mockEstoque: EstoqueItem[] = [
  { insumoId: "i1", obraId: "o1", quantity: 200, averageUnitCost: 38.5, totalValue: 7700 },
  { insumoId: "i2", obraId: "o1", quantity: 150, averageUnitCost: 42.0, totalValue: 6300 },
  { insumoId: "i3", obraId: "o1", quantity: 30, averageUnitCost: 120.0, totalValue: 3600 },
  { insumoId: "i4", obraId: "o1", quantity: 8, averageUnitCost: 850.0, totalValue: 6800 },
  { insumoId: "i1", obraId: "o2", quantity: 350, averageUnitCost: 37.0, totalValue: 12950 },
  { insumoId: "i5", obraId: "o2", quantity: 60, averageUnitCost: 28.5, totalValue: 1710 },
  { insumoId: "i6", obraId: "o2", quantity: 25, averageUnitCost: 95.0, totalValue: 2375 },
  { insumoId: "i7", obraId: "o2", quantity: 12, averageUnitCost: 280.0, totalValue: 3360 },
  { insumoId: "i2", obraId: "o3", quantity: 80, averageUnitCost: 41.5, totalValue: 3320 },
  { insumoId: "i8", obraId: "o3", quantity: 100, averageUnitCost: 18.0, totalValue: 1800 },
];

export const mockEntradas: EntradaEstoque[] = [
  { id: "e1", obraId: "o1", insumoId: "i1", notaFiscal: "NF-2024-001", fornecedorId: "f1", quantity: 200, unitValue: 38.5, totalValue: 7700, date: "2024-11-15", fvmId: "fvm1", avaliacaoId: "av1", createdAt: "2024-11-15T10:00:00" },
  { id: "e2", obraId: "o1", insumoId: "i2", notaFiscal: "NF-2024-002", fornecedorId: "f2", quantity: 150, unitValue: 42.0, totalValue: 6300, date: "2024-11-20", fvmId: "fvm2", avaliacaoId: "av2", createdAt: "2024-11-20T14:00:00" },
];

export const mockSaidas: SaidaEstoque[] = [
  { id: "s1", obraId: "o1", insumoId: "i1", quantity: 50, date: "2024-12-01", localAplicacao: "Bloco A - Fundação", responsavel: "João Silva", createdAt: "2024-12-01T08:00:00" },
];

export const mockTransferencias: Transferencia[] = [];
export const mockDevolucoes: Devolucao[] = [];

export const mockMovimentacoes: Movimentacao[] = [
  { id: "m1", obraId: "o1", insumoId: "i1", type: "entrada", quantity: 200, date: "2024-11-15", description: "Entrada NF-2024-001", referenceId: "e1", createdAt: "2024-11-15T10:00:00" },
  { id: "m2", obraId: "o1", insumoId: "i2", type: "entrada", quantity: 150, date: "2024-11-20", description: "Entrada NF-2024-002", referenceId: "e2", createdAt: "2024-11-20T14:00:00" },
  { id: "m3", obraId: "o1", insumoId: "i1", type: "saida", quantity: 50, date: "2024-12-01", description: "Saída - Bloco A Fundação", referenceId: "s1", createdAt: "2024-12-01T08:00:00" },
];

export const mockFVMs: FVM[] = [
  { id: "fvm1", obraId: "o1", notaFiscal: "NF-2024-001", fornecedorId: "f1", date: "2024-11-15", quantidadeConferida: true, qualidadeMaterial: true, documentacaoOk: true, observacoes: "Material conforme", status: "aprovada", createdAt: "2024-11-15T10:00:00" },
];

export const mockAvaliacoes: AvaliacaoFornecedor[] = [
  { id: "av1", obraId: "o1", fornecedorId: "f1", notaFiscal: "NF-2024-001", pontualidade: 5, qualidade: 4, atendimento: 5, documentacao: 5, observacoes: "Excelente fornecedor", date: "2024-11-15", createdAt: "2024-11-15T10:00:00" },
];
