import type { Metadata } from "next";

// Login page carries no indexable content — it's private app infrastructure
export const metadata: Metadata = {
  title: "Sign In",
  robots: {
    index: false,
    follow: false,
  },
};

export default function LoginLayout({ children }: { children: React.ReactNode }) {
  return children;
}
