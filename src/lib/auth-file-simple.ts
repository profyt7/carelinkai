/**
 * File-Based NextAuth Configuration for CareLinkAI
 * 
 * This is a simplified version of the auth configuration that uses a JSON file
 * instead of a database for storing user credentials. This is intended for
 * development and testing purposes only.
 */

import type { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import fs from "fs";
import path from "path";
import type { UserRole, UserStatus } from "@prisma/client";

// Constants for security settings
const JWT_MAX_AGE = parseInt(process.env["JWT_EXPIRATION"] || "86400"); // 24 hours in seconds
const SESSION_MAX_AGE = parseInt(process.env["SESSION_EXPIRY"] || "86400"); // 24 hours in seconds

// Define the user data structure
interface FileUser {
  id: string;
  email: string;
  passwordHash: string;
  firstName: string;
  lastName: string;
  role: UserRole;
  status: UserStatus;
  profileImageUrl: string | null;
  lastLoginAt: string | null;
  createdAt: string;
  updatedAt: string;
}

// Default users file path
const DEFAULT_USERS_FILE_PATH = path.join(process.cwd(), "data", "dev-users.json");

// Get the users file path from environment or use default
const getUsersFilePath = () => {
  return process.env["AUTH_USERS_FILE"] || DEFAULT_USERS_FILE_PATH;
};

// Ensure the users file directory exists
const ensureUsersFileDirectory = () => {
  const filePath = getUsersFilePath();
  const dirPath = path.dirname(filePath);
  
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }
};

// Load users from file or create default if not exists
const loadUsers = (): FileUser[] => {
  const filePath = getUsersFilePath();
  
  // Create directory if it doesn't exist
  ensureUsersFileDirectory();
  
  // If file doesn't exist, create default users
  if (!fs.existsSync(filePath)) {
    const defaultUsers = createDefaultUsers();
    saveUsers(defaultUsers);
    return defaultUsers;
  }
  
  // Read and parse users file
  try {
    const fileContent = fs.readFileSync(filePath, "utf-8");
    return JSON.parse(fileContent);
  } catch (error) {
    console.error("Error reading users file:", error);
    const defaultUsers = createDefaultUsers();
    saveUsers(defaultUsers);
    return defaultUsers;
  }
};

// Save users to file
const saveUsers = (users: FileUser[]) => {
  const filePath = getUsersFilePath();
  
  // Create directory if it doesn't exist
  ensureUsersFileDirectory();
  
  // Write users to file
  try {
    fs.writeFileSync(filePath, JSON.stringify(users, null, 2));
  } catch (error) {
    console.error("Error writing users file:", error);
  }
};

// Create default test users (sync to keep loadUsers synchronous)
const createDefaultUsers = (): FileUser[] => {
  // Dynamically load bcryptjs only in the Node.js runtime
  let passwordHash = "";
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { hashSync } = require("bcryptjs") as typeof import("bcryptjs");
    passwordHash = hashSync("password123", 10);
  } catch (err) {
    // Fallback to plain text (NOT for production) to avoid crashing dev env
    console.warn(
      "[auth-file-simple] bcryptjs not available – using plain text dev password"
    );
    passwordHash = "password123";
  }
  const now = new Date().toISOString();
  
  return [
    {
      id: "1",
      email: "family1@example.com",
      passwordHash,
      firstName: "Family",
      lastName: "User",
      role: "FAMILY",
      status: "ACTIVE",
      profileImageUrl: null,
      lastLoginAt: null,
      createdAt: now,
      updatedAt: now
    },
    {
      id: "2",
      email: "operator1@example.com",
      passwordHash,
      firstName: "Operator",
      lastName: "User",
      role: "OPERATOR",
      status: "ACTIVE",
      profileImageUrl: null,
      lastLoginAt: null,
      createdAt: now,
      updatedAt: now
    },
    {
      id: "3",
      email: "caregiver1@example.com",
      passwordHash,
      firstName: "Caregiver",
      lastName: "User",
      role: "CAREGIVER",
      status: "ACTIVE",
      profileImageUrl: null,
      lastLoginAt: null,
      createdAt: now,
      updatedAt: now
    },
    {
      id: "4",
      email: "admin@example.com",
      passwordHash,
      firstName: "Admin",
      lastName: "User",
      role: "ADMIN",
      status: "ACTIVE",
      profileImageUrl: null,
      lastLoginAt: null,
      createdAt: now,
      updatedAt: now
    }
  ];
};

// Find user by email
const findUserByEmail = (email: string): FileUser | undefined => {
  const users = loadUsers();
  return users.find(user => user.email.toLowerCase() === email.toLowerCase());
};

// Find user by ID
const findUserById = (id: string): FileUser | undefined => {
  const users = loadUsers();
  return users.find(user => user.id === id);
};

// Update user
const updateUser = (id: string, data: Partial<FileUser>): FileUser | undefined => {
  const users = loadUsers();
  const userIndex = users.findIndex(user => user.id === id);
  
  if (userIndex === -1) {
    return undefined;
  }
  
  // Update user data
  users[userIndex] = {
    ...users[userIndex],
    ...data,
    // Ensure required immutable fields remain intact
    id: users[userIndex].id,
    updatedAt: new Date().toISOString(),
  } as FileUser;
  
  // Save updated users
  saveUsers(users);
  
  return users[userIndex];
};

/**
 * NextAuth configuration options - file-based for development
 */
export const authOptions: NextAuthOptions = {
  // Configure providers
  providers: [
    CredentialsProvider({
      id: "credentials",
      name: "Email & Password",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials, _req) {
        if (!credentials?.email || !credentials?.password) {
          throw new Error("Email and password are required");
        }

        // Normalize email to lowercase
        const email = credentials.email.toLowerCase();
        // -----------------------------------------------------------
        // DEBUG: Track every incoming authentication attempt
        // -----------------------------------------------------------
        if (process.env["NODE_ENV"] === "development") {
          console.log(
            "[auth-file-simple] 🔐 authorize() called – incoming request",
            "\n  ➜ email:", email
          );
        }
        
        try {
          // Find user by email
          const user = findUserByEmail(email);

          // User not found
          if (!user) {
            console.log("User not found:", email);
            throw new Error("Invalid email or password");
          }

          // Check if account is suspended
          if (user.status === "SUSPENDED") {
            console.log("Account suspended:", email);
            throw new Error("Your account has been suspended. Please contact support.");
          }

          // Verify password
          // Dynamically load bcryptjs only on the server to avoid client-side bundle issues.
          let passwordValid = false;
          try {
            const { compare } = await import("bcryptjs");
            // ------------ DEBUG LOGS ------------
            if (process.env["NODE_ENV"] === "development") {
              console.log(
                "[auth-file-simple] Comparing passwords (bcrypt)",
                "\n  ➜ entered:", credentials.password,
                "\n  ➜ storedHash:", user.passwordHash
              );
            }
            passwordValid = await compare(credentials.password, user.passwordHash);
            if (process.env["NODE_ENV"] === "development") {
              console.log(
                "[auth-file-simple] bcrypt comparison result:",
                passwordValid
              );
            }
          } catch (err) {
            // Fallback to plain-text comparison for dev if bcryptjs cannot be loaded
            console.warn(
              "[auth-file-simple] bcryptjs compare failed – falling back to plain-text check"
            );
            passwordValid = credentials.password === user.passwordHash;
              if (process.env["NODE_ENV"] === "development") {
                console.log(
                  "[auth-file-simple] Plain-text comparison result:",
                  passwordValid
                );
              }
          }
          if (!passwordValid) {
            console.log("Invalid password for:", email);
            throw new Error("Invalid email or password");
          }

          // Update last login time
          updateUser(user.id, { lastLoginAt: new Date().toISOString() });

          console.log("Login successful for:", email);
          
          // Return user object without sensitive data
          return {
            id: user.id,
            profileImageUrl: user.profileImageUrl,
            email: user.email,
            name: `${user.firstName} ${user.lastName}`,
            firstName: user.firstName,
            lastName: user.lastName,
            role: user.role,
            status: user.status,
          };
        } catch (error) {
          console.error("Auth error:", error);
          throw new Error(error instanceof Error ? error.message : "Authentication failed");
        }
      },
    }),
  ],
  
  // Configure session handling
  session: {
    strategy: "jwt", // Use JWT for session handling
    maxAge: SESSION_MAX_AGE, // How long session lasts
  },
  
  // Configure JWT
  jwt: {
    maxAge: JWT_MAX_AGE, // How long JWT tokens last
  },
  
  // Pages configuration
  pages: {
    signIn: "/auth/login",
    signOut: "/auth/logout",
    error: "/auth/error",
  },
  
  // Callbacks
  callbacks: {
    // JWT callback to customize token content
    async jwt({ token, user }) {
      /* ---------- DEBUG ---------- */
      if (process.env["NODE_ENV"] === "development") {
        console.log(
          "[auth] JWT callback – phase:",
          user ? "initial-signin" : "refresh",
          "\n current token.profileImageUrl:",
          token.profileImageUrl
        );
      }
      // 1) Initial sign-in: copy data from `user` object.
      if (user) {
        token.id = user.id;
        token.profileImageUrl = (user as any).profileImageUrl ?? null;
        token.role = user.role;
        token.status = user.status;
        token.firstName = user.firstName;
        token.lastName = user.lastName;
        token.email = user.email;
        return token;
      }

      // 2) Subsequent calls: fetch fresh data using token.id
      try {
        if (token.id) {
          const freshUser = findUserById(token.id as string);

          if (freshUser) {
            token.profileImageUrl = freshUser.profileImageUrl;
            token.role = freshUser.role;
            token.status = freshUser.status;
            token.firstName = freshUser.firstName;
            token.lastName = freshUser.lastName;
            token.email = freshUser.email;

            if (process.env["NODE_ENV"] === "development") {
              console.log("[auth] JWT callback – refreshed from file:", {
                id: token.id,
                profileImageUrl: token.profileImageUrl,
              });
            }
          }
        }
      } catch (err) {
        // Log in dev mode but never throw – falling back to existing token data.
          if (process.env["NODE_ENV"] === "development") {
            console.warn("[auth] JWT callback refresh failed:", err);
          }
      }

      return token;
    },
    
    // Session callback to pass data to client
    async session({ session, token }) {
      if (process.env["NODE_ENV"] === "development") {
        console.log("[auth] Session callback – incoming token:", {
          id: token.id,
          profileImageUrl: token.profileImageUrl,
        });
      }
      if (token) {
        session.user.id = token.id as string;
        session.user.profileImageUrl = token.profileImageUrl as
          | { thumbnail?: string; medium?: string; large?: string }
          | string
          | null;
        session.user.role = token.role as UserRole;
        session.user.status = token.status as UserStatus;
        session.user.firstName = token.firstName as string;
        session.user.lastName = token.lastName as string;
        session.user.email = token.email as string;
      }
      
      if (process.env["NODE_ENV"] === "development") {
        console.log("[auth] Session callback – outgoing session.user:", {
          id: session.user.id,
          profileImageUrl: session.user.profileImageUrl,
        });
      }
      return session;
    },
    
    // Redirect callback for custom redirect logic
    async redirect({ url, baseUrl }) {
      // Prevent redirect loops back to any auth route
      if (url.startsWith("/auth")) {
        return `${baseUrl}/dashboard`;
      }

      // Same-origin absolute URL – leave untouched
      if (url.startsWith(baseUrl)) {
        return url;
      }

      // Relative URL – prefix with baseUrl
      if (url.startsWith("/")) {
        return `${baseUrl}${url}`;
      }

      // Default fallback
      return baseUrl;
    },
  },
  
  // Debug mode (enable for development)
  debug: process.env["NODE_ENV"] === "development",
};

// Initialize by creating default users if needed
(async () => {
  try {
    if (process.env["NODE_ENV"] === "development") {
      console.log("[auth-file-simple] Initializing file-based auth system");
      loadUsers();
    }
  } catch (error) {
    console.error("[auth-file-simple] Initialization error:", error);
  }
})();
