import './globals.css';
import './improvements.css';
export const metadata = {
  title: 'GM Fisio Care | Gestão da clínica',
  description: 'Atendimentos, pacientes e gestão financeira da GM Fisio Care.',
  manifest: '/manifest.webmanifest',
  icons: { icon: '/icon-192.png', apple: '/icon-192.png' },
  appleWebApp: { capable: true, title: 'GM Fisio Care', statusBarStyle: 'default' }
};
export const viewport = { width: 'device-width', initialScale: 1, themeColor: '#176B3A' };
export default function Layout({ children }) {
  return <html lang="pt-BR"><body>{children}</body></html>;
}
