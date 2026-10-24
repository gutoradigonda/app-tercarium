// src/services/api.ts

const API_BASE_URL = 'https://api.tercarium.com.br/api';

// Helper para obter o token salvo no login
const getAuthHeaders = () => {
  const token = localStorage.getItem('tercarium_token');
  return {
    'Content-Type': 'application/json',
    ...(token ? { 'Authorization': `Bearer ${token}` } : {})
  };
};

// Tratamento padrão de erros das respostas da API
const handleResponse = async (response: Response) => {
  const data = await response.json().catch(() => ({}));
  
  if (!response.ok) {
    throw new Error(data.mensagem || data.error || 'Erro na comunicação com o servidor');
  }
  
  return data;
};

// Objeto central com os métodos de requisição
export const api = {
  get: async (endpoint: string) => {
    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      method: 'GET',
      headers: getAuthHeaders(),
    });
    return handleResponse(response);
  },

  post: async (endpoint: string, body: any) => {
    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(body),
    });
    return handleResponse(response);
  },

  put: async (endpoint: string, body: any) => {
    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      method: 'PUT',
      headers: getAuthHeaders(),
      body: JSON.stringify(body),
    });
    return handleResponse(response);
  },

  delete: async (endpoint: string) => {
    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      method: 'DELETE',
      headers: getAuthHeaders(),
    });
    return handleResponse(response);
  }
};