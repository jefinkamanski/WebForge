import type { ReactNode } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card.tsx';

// Moldura das telas sem menu (login, troca de senha): cartão central sobre fundo neutro
export function AuthCard({ title, children }: { title: string; children: ReactNode }) {
  return (
    <main className="bg-muted flex min-h-screen items-center justify-center px-4 py-10">
      <Card className="w-full max-w-[400px]">
        <CardHeader>
          <CardTitle className="text-xl" role="heading" aria-level={1}>
            {title}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">{children}</CardContent>
      </Card>
    </main>
  );
}
