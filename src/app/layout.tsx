import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Bearing — Technical Debt Assessment',
  description: 'ServiceNow technical debt assessment platform by Avennorth',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
