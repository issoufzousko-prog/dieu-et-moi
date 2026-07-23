export const BACKEND_API_URL = process.env.EXPO_PUBLIC_BACKEND_URL || 'https://dieu-et-moi-api.onrender.com';

export async function apiClient(endpoint, options = {}) {
  const url = endpoint.startsWith('http') ? endpoint : ${BACKEND_API_URL};
  const defaultHeaders = {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
  };
  const config = {
    ...options,
    headers: {
      ...defaultHeaders,
      ...options.headers,
    },
  };
  try {
    const response = await fetch(url, config);
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(API Error []: );
    }
    return await response.json();
  } catch (error) {
    console.error([API Client Error] :, error.message);
    throw error;
  }
}

export default apiClient;
