/**
 * Configuração centralizada de API
 * 
 * Usa URLs relativas para evitar problemas com troca de domínio no preview.
 * O proxy do React Dev Server ou o mesmo domínio em produção fará o roteamento.
 */

// URL base da API - usa caminho relativo para funcionar em qualquer domínio
export const API_BASE = '/api';

// Helper para construir URLs da API
export const apiUrl = (path) => `${API_BASE}${path.startsWith('/') ? path : '/' + path}`;

// Configuração do axios com base URL relativa
export const axiosConfig = {
  baseURL: API_BASE,
  headers: {
    'Content-Type': 'application/json',
  },
};

export default API_BASE;
