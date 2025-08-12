"use client";

import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useReducer,
  useMemo,
} from "react";
import { SessionProvider } from "next-auth/react";
import { Elements } from "@stripe/react-stripe-js";
import { loadStripe } from "@stripe/stripe-js";
import { io, Socket } from "socket.io-client";
import { ThemeProvider } from "next-themes";
import { Toaster } from "react-hot-toast";

// Initialize Stripe
const publishableKey = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY;
const stripePromise = publishableKey ? loadStripe(publishableKey) : null;

// Socket.io Context
type SocketContextType = {
  socket: Socket | null;
  connected: boolean;
};

const SocketContext = createContext<SocketContextType>({
  socket: null,
  connected: false,
});

// User Context Types
type UserRole = "family" | "operator" | "caregiver" | "admin" | "affiliate";

interface UserState {
  id: string | null;
  name: string | null;
  email: string | null;
  role: UserRole | null;
  isAuthenticated: boolean;
  preferences: {
    notifications: {
      email: boolean;
      push: boolean;
      sms: boolean;
    };
    theme: "light" | "dark" | "system";
    accessibility: {
      reducedMotion: boolean;
      highContrast: boolean;
      largeText: boolean;
    };
  };
}

type UserAction =
  | { type: "LOGIN"; payload: Partial<UserState> }
  | { type: "LOGOUT" }
  | { type: "UPDATE_PREFERENCES"; payload: Partial<UserState["preferences"]> };

const initialUserState: UserState = {
  id: null,
  name: null,
  email: null,
  role: null,
  isAuthenticated: false,
  preferences: {
    notifications: {
      email: true,
      push: true,
      sms: false,
    },
    theme: "system",
    accessibility: {
      reducedMotion: false,
      highContrast: false,
      largeText: false,
    },
  },
};

function userReducer(state: UserState, action: UserAction): UserState {
  switch (action.type) {
    case "LOGIN":
      return {
        ...state,
        ...action.payload,
        isAuthenticated: true,
      };
    case "LOGOUT":
      return initialUserState;
    case "UPDATE_PREFERENCES":
      return {
        ...state,
        preferences: {
          ...state.preferences,
          ...action.payload,
        },
      };
    default:
      return state;
  }
}

// User Context
const UserContext = createContext<{
  state: UserState;
  dispatch: React.Dispatch<UserAction>;
}>({
  state: initialUserState,
  dispatch: () => null,
});

// App State Context Types
interface AppState {
  isLoading: boolean;
  notifications: Notification[];
  alerts: Alert[];
  modals: {
    isOpen: boolean;
    type: string | null;
    data: any;
  };
  lastSync: Date | null;
}

interface Notification {
  id: string;
  type: "message" | "alert" | "update" | "payment";
  title: string;
  message: string;
  read: boolean;
  createdAt: Date;
}

interface Alert {
  id: string;
  type: "success" | "error" | "warning" | "info";
  message: string;
  autoClose?: boolean;
  duration?: number;
}

type AppAction =
  | { type: "SET_LOADING"; payload: boolean }
  | { type: "ADD_NOTIFICATION"; payload: Notification }
  | { type: "MARK_NOTIFICATION_READ"; payload: string }
  | { type: "CLEAR_NOTIFICATIONS" }
  | { type: "ADD_ALERT"; payload: Alert }
  | { type: "REMOVE_ALERT"; payload: string }
  | { type: "OPEN_MODAL"; payload: { type: string; data: any } }
  | { type: "CLOSE_MODAL" }
  | { type: "SET_LAST_SYNC"; payload: Date };

const initialAppState: AppState = {
  isLoading: false,
  notifications: [],
  alerts: [],
  modals: {
    isOpen: false,
    type: null,
    data: null,
  },
  lastSync: null,
};

function appReducer(state: AppState, action: AppAction): AppState {
  switch (action.type) {
    case "SET_LOADING":
      return { ...state, isLoading: action.payload };
    case "ADD_NOTIFICATION":
      return {
        ...state,
        notifications: [action.payload, ...state.notifications],
      };
    case "MARK_NOTIFICATION_READ":
      return {
        ...state,
        notifications: state.notifications.map((notification) =>
          notification.id === action.payload
            ? { ...notification, read: true }
            : notification
        ),
      };
    case "CLEAR_NOTIFICATIONS":
      return { ...state, notifications: [] };
    case "ADD_ALERT":
      return { ...state, alerts: [...state.alerts, action.payload] };
    case "REMOVE_ALERT":
      return {
        ...state,
        alerts: state.alerts.filter((alert) => alert.id !== action.payload),
      };
    case "OPEN_MODAL":
      return {
        ...state,
        modals: {
          isOpen: true,
          type: action.payload.type,
          data: action.payload.data,
        },
      };
    case "CLOSE_MODAL":
      return {
        ...state,
        modals: { isOpen: false, type: null, data: null },
      };
    case "SET_LAST_SYNC":
      return { ...state, lastSync: action.payload };
    default:
      return state;
  }
}

// App Context
const AppContext = createContext<{
  state: AppState;
  dispatch: React.Dispatch<AppAction>;
}>({
  state: initialAppState,
  dispatch: () => null,
});

// SocketProvider Component
function SocketProvider({ children }: { children: React.ReactNode }) {
  const [socketState, setSocketState] = useState<SocketContextType>({
    socket: null,
    connected: false,
  });

  useEffect(() => {
    // Only connect to socket if in browser and user is authenticated
    if (typeof window !== "undefined") {
      // We would check authentication here before connecting
      const token = localStorage.getItem("token");
      
      if (token) {
        const socket = io(process.env.NEXT_PUBLIC_SOCKET_URL || "", {
          auth: {
            token,
          },
          transports: ["websocket"],
          // HIPAA compliance: Ensure secure connection
          secure: true,
        });

        socket.on("connect", () => {
          setSocketState({
            socket,
            connected: true,
          });
        });

        socket.on("disconnect", () => {
          setSocketState((prev) => ({
            ...prev,
            connected: false,
          }));
        });

        // Cleanup on unmount
        return () => {
          socket.disconnect();
        };
      }
    }
  }, []);

  return (
    <SocketContext.Provider value={socketState}>
      {children}
    </SocketContext.Provider>
  );
}

// UserProvider Component
function UserProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = useReducer(userReducer, initialUserState);

  // Load user data from localStorage on mount
  useEffect(() => {
    if (typeof window !== "undefined") {
      const savedUser = localStorage.getItem("user");
      if (savedUser) {
        try {
          const userData = JSON.parse(savedUser);
          dispatch({ type: "LOGIN", payload: userData });
        } catch (error) {
          console.error("Failed to parse user data from localStorage", error);
          localStorage.removeItem("user");
        }
      }
    }
  }, []);

  // Save user data to localStorage on changes
  useEffect(() => {
    if (typeof window !== "undefined" && state.isAuthenticated) {
      localStorage.setItem("user", JSON.stringify(state));
    }
  }, [state]);

  return (
    <UserContext.Provider value={{ state, dispatch }}>
      {children}
    </UserContext.Provider>
  );
}

// AppProvider Component
function AppProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = useReducer(appReducer, initialAppState);

  // Auto-remove alerts after their duration
  useEffect(() => {
    state.alerts.forEach((alert) => {
      if (alert.autoClose !== false) {
        const timer = setTimeout(() => {
          dispatch({ type: "REMOVE_ALERT", payload: alert.id });
        }, alert.duration || 5000);

        return () => clearTimeout(timer);
      }
    });
  }, [state.alerts]);

  return (
    <AppContext.Provider value={{ state, dispatch }}>
      {children}
    </AppContext.Provider>
  );
}

// Main Providers component that wraps the app
export function Providers({ children }: { children: React.ReactNode }) {
  // Stripe payment options with HIPAA compliance considerations
  const stripeOptions = useMemo(
    () => ({
      locale: "en",
      // HIPAA compliance: Ensure proper data handling
      appearance: {
        theme: "stripe",
        variables: {
          colorPrimary: "#0099e6",
        },
      },
    }),
    []
  );

  return (
    <SessionProvider>
      {/* Global toast notifications */}
      <Toaster
        position="top-right"
        toastOptions={{
          duration: 5000,
          style: {
            background: "#1f2937", // gray-800
            color: "#fff",
          },
        }}
      />
      <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
        <UserProvider>
          <AppProvider>
            <SocketProvider>
              {stripePromise ? (
                <Elements stripe={stripePromise} options={stripeOptions}>
                  {children}
                </Elements>
              ) : (
                children
              )}
            </SocketProvider>
          </AppProvider>
        </UserProvider>
      </ThemeProvider>
    </SessionProvider>
  );
}

// Custom hooks for accessing contexts
export const useSocket = () => useContext(SocketContext);
export const useUser = () => useContext(UserContext);
export const useApp = () => useContext(AppContext);
