/**
 * Auth helpers using User table with roles
 */

export interface User {
  id: string;
  email: string;
  firstName: string | null;
  lastName: string | null;
  role: "ADMIN" | "RECRUITER" | "CANDIDATE";
  avatarUrl: string | null;
  loginTime: string;
}

const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:9999";

/**
 * Login with email and password
 */
export const login = async (email: string, password: string): Promise<{ success: boolean; user?: User; message?: string }> => {
  try {
    const response = await fetch(`${API_BASE}/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });

    const data = await response.json();

    if (data.success && data.user) {
      // Store user with login time
      const user: User = {
        ...data.user,
        loginTime: new Date().toISOString(),
      };
      localStorage.setItem("user_session", JSON.stringify(user));
      
      // Dispatch custom event to notify components of auth change
      window.dispatchEvent(new Event("auth_changed"));
      
      return { success: true, user };
    }

    return { success: false, message: data.message || "Login failed" };
  } catch (error) {
    console.error("Login error:", error);
    return { success: false, message: "Network error" };
  }
};

/**
 * Get current logged in user
 */
export const getCurrentUser = (): User | null => {
  try {
    const session = localStorage.getItem("user_session");
    if (!session) return null;
    
    const user = JSON.parse(session) as User;
    
    // Check if session is less than 24 hours old
    const loginTime = new Date(user.loginTime);
    const now = new Date();
    const hours = (now.getTime() - loginTime.getTime()) / (1000 * 60 * 60);
    
    if (hours >= 24) {
      localStorage.removeItem("user_session");
      return null;
    }
    
    return user;
  } catch {
    return null;
  }
};

/**
 * Check if user is logged in
 */
export const isLoggedIn = (): boolean => {
  return getCurrentUser() !== null;
};

/**
 * Check if user has admin role
 */
export const isAdminLoggedIn = (): boolean => {
  const user = getCurrentUser();
  return user?.role === "ADMIN";
};

/**
 * Check if user has recruiter role
 */
export const isRecruiterLoggedIn = (): boolean => {
  const user = getCurrentUser();
  return user?.role === "RECRUITER";
};

/**
 * Logout current user
 */
export const logout = () => {
  localStorage.removeItem("user_session");
  // Dispatch custom event to notify components of auth change
  window.dispatchEvent(new Event("auth_changed"));
};

/**
 * Logout admin (alias for logout)
 */
export const logoutAdmin = logout;

/**
 * Logout recruiter (alias for logout)
 */
export const logoutRecruiter = logout;
