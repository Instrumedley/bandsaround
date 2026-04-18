import { getServerSession, type NextAuthOptions } from "next-auth";
import Credentials from "next-auth/providers/credentials";
import Google from "next-auth/providers/google";

const demoEmail = process.env.AUTH_DEMO_EMAIL ?? "demo@bandsaround.app";
const demoPassword = process.env.AUTH_DEMO_PASSWORD ?? "demo-password-change-me";

export const authOptions: NextAuthOptions = {
  secret: process.env.AUTH_SECRET ?? "dev-only-secret-change-me",
  providers: [
    Google({
      clientId: process.env.AUTH_GOOGLE_ID ?? "",
      clientSecret: process.env.AUTH_GOOGLE_SECRET ?? "",
    }),
    Credentials({
      name: "Email and Password",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials) {
          return null;
        }

        const email = credentials.email?.toString().trim().toLowerCase();
        const password = credentials.password?.toString();

        if (!email || !password) {
          return null;
        }

        if (email !== demoEmail || password !== demoPassword) {
          return null;
        }

        return {
          id: "demo-user",
          name: "Demo User",
          email: demoEmail,
        };
      },
    }),
  ],
  session: {
    strategy: "jwt",
  },
  pages: {
    signIn: "/login",
  },
  callbacks: {
    jwt({ token, user }) {
      if (user?.id) {
        token.sub = user.id;
      }

      return token;
    },
    session({ session, token }) {
      if (session.user && token.sub) {
        session.user.id = token.sub;
      }

      return session;
    },
  },
};

export function getServerAuthSession() {
  return getServerSession(authOptions);
}
