import type { Metadata } from "next";
import "./globals.css";
import MobileGuard from "@/components/MobileGuard";

export const metadata: Metadata = {
  title: "PyCode - Learn Python & Data Science Sandbox",
  description: "Learn Python basics, NumPy, Pandas, Matplotlib, and Seaborn with interactive LeetCode-style exercises and instant visual plotting.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&family=JetBrains+Mono:wght@400;500;600&display=swap" rel="stylesheet" />
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function() {
                try {
                  const storedTheme = localStorage.getItem('theme');
                  if (storedTheme === 'light') {
                    document.documentElement.classList.remove('dark');
                  } else {
                    document.documentElement.classList.add('dark');
                  }
                } catch (e) {}
              })()
            `,
          }}
        />
      </head>
      <body className="min-h-screen bg-canvas text-ink antialiased select-none">
        <MobileGuard>
          {children}
        </MobileGuard>
      </body>
    </html>
  );
}
