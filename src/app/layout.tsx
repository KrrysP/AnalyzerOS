import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'AnalyzerOS — Know what changed. Understand why.',
  description: 'AI-powered Business Intelligence platform turning business data into interactive dashboards and causal diagnostic insights.',
  icons: {
    icon: "data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 32 32'><rect width='32' height='32' rx='8' fill='%236366F1'/><path d='M8 22L16 10L24 22' stroke='white' stroke-width='2.5' fill='none' stroke-linecap='round' stroke-linejoin='round'/><circle cx='16' cy='18' r='2' fill='white'/></svg>",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="antialiased selection:bg-brand-100 selection:text-brand-700">
        {children}
      </body>
    </html>
  );
}
