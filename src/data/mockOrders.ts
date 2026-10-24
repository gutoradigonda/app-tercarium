import { Order, Client } from '../types/erp';

// Base de Clientes iniciada estritamente zerada para inserção de dados reais
export const INITIAL_CLIENTS: Client[] = [];

// O sistema inicia com a lista de Pedidos completamente vazia (R$ 0,00),
// pronta para ser alimentada por novos pedidos ou pela ferramenta de Importação de Histórico.
export const INITIAL_ORDERS: Order[] = [];
