import './globals.css';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Immigration Agency Visa Payment Portal',
  description: 'Secure payment portal for visa-related and immigration cases.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="bg-white min-h-screen text-slate-900 antialiased">{children}</body>
    </html>
  );
}
