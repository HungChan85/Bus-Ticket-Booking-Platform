export function getAuthHeaders(contentType) {
  const headers = {};
  try {
    const stored = JSON.parse(localStorage.getItem("auth") || "{}");
    if (stored.token) {
      headers.Authorization = `Bearer ${stored.token}`;
    }
  } catch (_) {
    // ignore parse errors and return empty headers
  }

  if (contentType) {
    headers["Content-Type"] = contentType;
  }

  return headers;
}

export function getStoredUser() {
  try {
    // Try to get from 'auth' first (contains user object from login)
    const stored = JSON.parse(localStorage.getItem("auth") || "{}");
    if (stored.user) {
      return stored.user;
    }
    
    // Fallback to 'user' key (for backward compatibility)
    const userStored = localStorage.getItem("user");
    if (userStored) {
      return JSON.parse(userStored);
    }
    
    return null;
  } catch (_) {
    return null;
  }
}

export function getAuthToken() {
  try {
    const stored = JSON.parse(localStorage.getItem("auth") || "{}");
    return stored.token || null;
  } catch (_) {
    return null;
  }
}
