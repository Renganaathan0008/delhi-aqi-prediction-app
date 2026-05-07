import { createContext, useContext, useState } from "react";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user] = useState({ id: "local", name: "Local User", role: "admin" });
  return (
    <AuthContext.Provider value={{ isAuthenticated: true, user, isLoadingAuth: false }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() { return useContext(AuthContext); }
export default AuthContext;
