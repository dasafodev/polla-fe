export const env = {
  useMocks: import.meta.env.VITE_USE_MOCKS === 'true',
  apiBaseUrl: (import.meta.env.VITE_API_BASE_URL as string | undefined) ?? '/api',
  googleClientId: (import.meta.env.VITE_GOOGLE_CLIENT_ID as string | undefined) ?? '',
  isDev: import.meta.env.DEV,
}
