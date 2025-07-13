import type { Metadata } from 'next';
import './globals.css';
import { Toaster } from '@/components/ui/toaster';
import { AuthProvider } from '@/components/auth-provider';
import Navbar from '@/components/navbar';
import Footer from '@/components/footer';
import { DynamicMetadata } from '@/components/DynamicMetadata';
import { getSiteSettings } from '@/lib/firebase/firestore';
import { Inter, Roboto, Lato } from 'next/font/google'; // 1. Importa las fuentes
import { hexToHsl } from '@/lib/utils'; // 2. Importa la utilidad

// 3. Configura las fuentes que ofrecerás
const fontInter = Inter({ subsets: ['latin'], variable: '--font-sans' });
const fontRoboto = Roboto({ weight: ['400', '700'], subsets: ['latin'], variable: '--font-sans' });
const fontLato = Lato({ weight: ['400', '700'], subsets: ['latin'], variable: '--font-sans' });

const fontMap = {
  inter: fontInter,
  roboto: fontRoboto,
  lato: fontLato,
};

export const metadata = {
  title: "Surcos",
  description: "Todo sobre la Sociedad Colombiana de Urbanistas y Desarrolladores. Autor: Fabián Muñoz Puello. Diseño: Leidy Vega Anaya.",
  keywords: [
    "Sociedad Colombiana de Urbanistas",
    "Desarrolladores",
    "Urbanismo",
    "Fabián Muñoz Puello",
    "Leidy Vega Anaya",
    "Surcos",
    "Colombia"
  ],
  authors: [
    { name: "Fabián Muñoz Puello", url: "https://github.com/FabianMp250822" },
    { name: "Leidy Vega Anaya" }
  ]
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const siteSettings = await getSiteSettings();

  // 4. Selecciona la fuente basada en la configuración
  const activeFont = fontMap[siteSettings.fontFamily as keyof typeof fontMap || 'inter'];

  // 5. Genera las variables de color CSS
  const themeStyles = {
    '--primary': hexToHsl(siteSettings.primaryColor!),
    '--secondary': hexToHsl(siteSettings.secondaryColor!),
  } as React.CSSProperties;

  return (
    // 6. Aplica la fuente y los estilos
    <html lang="en" style={themeStyles} suppressHydrationWarning>
      <body className={`${activeFont.variable} font-sans antialiased flex flex-col min-h-screen`}>
        <AuthProvider>
          <DynamicMetadata siteSettings={siteSettings} />
          <Navbar siteSettings={siteSettings} />
          <main className="flex-grow container mx-auto px-4 py-8">
            {children}
          </main>
          <Footer siteSettings={siteSettings} />
          <Toaster />
        </AuthProvider>
      </body>
    </html>
  );
}
