// Authentication service (placeholder)
export const authService = {
  login: async (_email: string, _password: string) => {
    // Implementation pending
    throw new Error('Auth service not implemented yet');
  },
  
  signup: async (_email: string, _password: string) => {
    // Implementation pending
    throw new Error('Auth service not implemented yet');
  },
  
  logout: () => {
    localStorage.removeItem('auth_token');
  },
  
  isAuthenticated: () => {
    return !!localStorage.getItem('auth_token');
  }
};