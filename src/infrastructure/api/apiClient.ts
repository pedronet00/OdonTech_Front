import { API_BASE_URL } from '../config/api';

export interface ApiErrorItem {
  code: string;
  message: string;
  /** Campo do formulário a que o erro se refere (ex.: "Email"), ou null para erros gerais. */
  target: string | null;
}

export interface ApiResponse<T> {
  isSuccess: boolean;
  isFailure: boolean;
  data: T;
  errors: ApiErrorItem[];
}

/**
 * Erro devolvido pela API no envelope padrão. `message` é a primeira mensagem (como antes);
 * `errors` traz a lista completa, com o `target` de cada uma.
 */
export class ApiError extends Error {
  readonly errors: ApiErrorItem[];
  readonly status: number;

  constructor(message: string, errors: ApiErrorItem[], status: number) {
    super(message);
    this.name = 'ApiError';
    this.errors = errors;
    this.status = status;
  }
}

class ApiClient {
  private static refreshPromise: Promise<string | null> | null = null;

  /**
   * Troca o refresh token por um novo access token, salva os tokens como o login faz e
   * dispara o evento `tokenUpdated` (o AuthContext escuta e atualiza o usuário).
   * Devolve o novo access token, ou null se o refresh falhar.
   */
  public static async refreshAccessToken(): Promise<string | null> {
    if (this.refreshPromise) return this.refreshPromise;

    this.refreshPromise = (async () => {
      const refreshToken = localStorage.getItem('@OdonTech:refreshToken');
      if (!refreshToken) return null;

      try {
        const response = await fetch(`${API_BASE_URL}/auth/refresh`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ refreshToken })
        });

        if (!response.ok) throw new Error('Refresh failed');

        const json = await response.json();
        if (!json.isSuccess || !json.data) throw new Error('Refresh failed');

        const responseData = json.data;
        localStorage.setItem('@OdonTech:token', responseData.accessToken);
        localStorage.setItem('@OdonTech:refreshToken', responseData.refreshToken);
        localStorage.setItem('@OdonTech:expiresAt', responseData.expiresAt);
        
        window.dispatchEvent(new CustomEvent('tokenUpdated'));
        
        return responseData.accessToken;
      } catch (error) {
        console.error('API Client: Refresh error', error);
        return null;
      } finally {
        this.refreshPromise = null;
      }
    })();

    return this.refreshPromise;
  }

  private static async handleResponse<T>(response: Response): Promise<T> {
    // Para respostas sem corpo (ex: 204 No Content)
    if (response.status === 204) {
      return {} as T;
    }

    let result: ApiResponse<T>;
    try {
      result = await response.json();
    } catch (e) {
      if (!response.ok) {
        throw new Error(`Erro na requisição: ${response.statusText}`);
      }
      return {} as T;
    }

    if (result.isSuccess) {
      return result.data;
    }

    const errors = Array.isArray(result.errors) ? result.errors : [];
    const errorMessage = errors.length > 0
      ? errors[0].message
      : 'Ocorreu um erro inesperado no processamento da requisição.';

    throw new ApiError(errorMessage, errors, response.status);
  }

  public static async request(endpoint: string, options: RequestInit = {}): Promise<Response> {
    let token = localStorage.getItem('@OdonTech:token');
    const url = endpoint.startsWith('http') ? endpoint : `${API_BASE_URL}${endpoint.startsWith('/') ? '' : '/'}${endpoint}`;

    const headers = {
      ...options.headers,
      'Authorization': `Bearer ${token}`
    };

    let response = await fetch(url, { ...options, headers });

    if (response.status === 401) {
      const newToken = await this.refreshAccessToken();
      if (newToken) {
        const retryHeaders = {
          ...options.headers,
          'Authorization': `Bearer ${newToken}`
        };
        response = await fetch(url, { ...options, headers: retryHeaders });
      } else {
        window.dispatchEvent(new CustomEvent('unauthorized'));
      }
    }

    return response;
  }

  public static async get<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const response = await this.request(endpoint, { ...options, method: 'GET' });
    return this.handleResponse<T>(response);
  }

  public static async post<T>(endpoint: string, data?: any, options: RequestInit = {}): Promise<T> {
    const isFormData = data instanceof FormData;
    const response = await this.request(endpoint, {
      ...options,
      method: 'POST',
      headers: isFormData ? options.headers : { 'Content-Type': 'application/json', ...options.headers },
      body: isFormData ? data : (data ? JSON.stringify(data) : undefined)
    });
    return this.handleResponse<T>(response);
  }

  public static async put<T>(endpoint: string, data?: any, options: RequestInit = {}): Promise<T> {
    const isFormData = data instanceof FormData;
    const response = await this.request(endpoint, {
      ...options,
      method: 'PUT',
      headers: isFormData ? options.headers : { 'Content-Type': 'application/json', ...options.headers },
      body: isFormData ? data : (data ? JSON.stringify(data) : undefined)
    });
    return this.handleResponse<T>(response);
  }

  public static async patch<T>(endpoint: string, data?: any, options: RequestInit = {}): Promise<T> {
    const isFormData = data instanceof FormData;
    const response = await this.request(endpoint, {
      ...options,
      method: 'PATCH',
      headers: isFormData ? options.headers : { 'Content-Type': 'application/json', ...options.headers },
      body: isFormData ? data : (data ? JSON.stringify(data) : undefined)
    });
    return this.handleResponse<T>(response);
  }

  public static async delete<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const response = await this.request(endpoint, { ...options, method: 'DELETE' });
    return this.handleResponse<T>(response);
  }

  /**
   * Mantido apenas para compatibilidade legada se necessário, 
   * mas o handleResponse agora centraliza isso.
   */
  public static async getErrorMessage(response: Response, defaultMessage: string): Promise<string> {
    try {
      const data = await response.clone().json();
      if (data.errors && Array.isArray(data.errors) && data.errors.length > 0) {
        return data.errors[0].message;
      }
    } catch (e) {}
    return defaultMessage;
  }
}

export default ApiClient;
