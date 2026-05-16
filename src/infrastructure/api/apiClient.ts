import { API_BASE_URL } from '../config/api';

class ApiClient {
  private static async refreshAccessToken(): Promise<string | null> {
    const refreshToken = localStorage.getItem('@OdonTech:refreshToken');
    if (!refreshToken) return null;

    try {
      const response = await fetch(`${API_BASE_URL}/auth/refresh`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refreshToken })
      });

      if (!response.ok) throw new Error('Refresh failed');

      const data = await response.json();
      localStorage.setItem('@OdonTech:token', data.accessToken);
      localStorage.setItem('@OdonTech:refreshToken', data.refreshToken);
      localStorage.setItem('@OdonTech:expiresAt', data.expiresAt);
      
      return data.accessToken;
    } catch (error) {
      console.error('API Client: Refresh error', error);
      return null;
    }
  }

  public static async request(endpoint: string, options: RequestInit = {}): Promise<Response> {
    let token = localStorage.getItem('@OdonTech:token');

    // Pre-request check (optional but good)
    // If we have a token, we could check if it's about to expire here, 
    // but reactive 401 handling is more standard.

    const url = endpoint.startsWith('http') ? endpoint : `${API_BASE_URL}${endpoint.startsWith('/') ? '' : '/'}${endpoint}`;

    const headers = {
      ...options.headers,
      'Authorization': `Bearer ${token}`
    };

    let response = await fetch(url, { ...options, headers });

    // Se 401, tenta o refresh e repete a chamada
    if (response.status === 401) {
      const newToken = await this.refreshAccessToken();
      if (newToken) {
        const retryHeaders = {
          ...options.headers,
          'Authorization': `Bearer ${newToken}`
        };
        response = await fetch(url, { ...options, headers: retryHeaders });
      } else {
        // Se falhou o refresh, redireciona pro login ou emite evento de logout
        // Aqui podemos forçar um evento de window para o AuthContext captar
        window.dispatchEvent(new CustomEvent('unauthorized'));
      }
    }

    return response;
  }

  public static async get(endpoint: string, options: RequestInit = {}) {
    return this.request(endpoint, { ...options, method: 'GET' });
  }

  public static async post(endpoint: string, data?: any, options: RequestInit = {}) {
    return this.request(endpoint, {
      ...options,
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...options.headers },
      body: data ? JSON.stringify(data) : undefined
    });
  }

  public static async put(endpoint: string, data?: any, options: RequestInit = {}) {
    return this.request(endpoint, {
      ...options,
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', ...options.headers },
      body: data ? JSON.stringify(data) : undefined
    });
  }

  public static async patch(endpoint: string, data?: any, options: RequestInit = {}) {
    return this.request(endpoint, {
      ...options,
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', ...options.headers },
      body: data ? JSON.stringify(data) : undefined
    });
  }

  public static async delete(endpoint: string, options: RequestInit = {}) {
    return this.request(endpoint, { ...options, method: 'DELETE' });
  }
}

export default ApiClient;
