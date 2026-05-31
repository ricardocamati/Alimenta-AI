const ERROR_MESSAGES: Record<string, string> = {
  '401': 'Sessão expirada. Faça login novamente.',
  '403': 'Você não tem permissão para esta ação.',
  '404': 'Registro não encontrado.',
  '500': 'Erro interno do servidor. Tente novamente.',
  'NETWORK_ERROR': 'Sem conexão com o servidor. Verifique sua internet.',
};

export function handleApiError(error: unknown): string {
  if (error && typeof error === 'object' && 'response' in error) {
    const axiosError = error as { response?: { status?: number; data?: { detail?: string | { msg: string }[] } } };

    if (axiosError.response) {
      const status = axiosError.response.status;
      const data = axiosError.response.data;

      if (status === 422 && data?.detail && Array.isArray(data.detail)) {
        const first = data.detail[0];
        if (first && typeof first === 'object' && 'msg' in first) {
          return `${first.loc?.[first.loc.length - 1] || 'Campo'}: ${first.msg}`;
        }
      }

      if (status === 422 && data?.detail && typeof data.detail === 'string') {
        return data.detail;
      }

      if (status === 409 && data?.detail && typeof data.detail === 'string') {
        return data.detail;
      }

      if (status && ERROR_MESSAGES[String(status)]) {
        return ERROR_MESSAGES[String(status)];
      }

      if (data?.detail && typeof data.detail === 'string') {
        return data.detail;
      }

      return `Erro inesperado (${status || 'desconhecido'}). Tente novamente.`;
    }
  }

  if (error && typeof error === 'object' && 'code' in error) {
    const err = error as { code: string };
    if (err.code === 'ERR_NETWORK' || err.code === 'ECONNABORTED') {
      return ERROR_MESSAGES['NETWORK_ERROR'];
    }
  }

  if (error && typeof error === 'object' && 'message' in error) {
    const err = error as { message: string };
    if (err.message === 'Network Error') {
      return ERROR_MESSAGES['NETWORK_ERROR'];
    }
    return err.message;
  }

  return 'Ocorreu um erro inesperado. Tente novamente.';
}
