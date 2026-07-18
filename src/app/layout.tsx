import type { Metadata } from "next";
import type { ReactNode } from "react";

import { AuthProvider } from "../auth/auth-provider";
import "./globals.css";

export const metadata: Metadata = {
  title: "Article Zero",
  description: "Author, test, and enforce AI-agent policy with a deterministic boundary and an audit trail.",
  icons: {
    icon: "/icon.svg",
    shortcut: "/icon.svg",
  },
};

export default function RootLayout({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <html lang="en">
      <body><AuthProvider>{children}</AuthProvider></body>
    </html>
  );
}
