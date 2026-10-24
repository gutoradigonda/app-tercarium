import { Product } from '../types/erp';

export interface RawMockProduct {
  sku: string;
  categoria: string;
  linha: string;
  nome: string;
  custo: number;
  preco: number;
}

// Catálogo iniciado estritamente zerado para testes reais e cadastro autêntico de produtos
export const mockProdutos: RawMockProduct[] = [];

export const INITIAL_PRODUCTS: Product[] = [];
