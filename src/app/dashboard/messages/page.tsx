import { getConversationsForUser } from '@/lib/firebase/firestore-admin';
import { redirect } from 'next/navigation';
import { MessageCircle } from 'lucide-react';
import { getSession } from '@/lib/session';

import { ConversationList } from './_components/ConversationList';
import { MessageView } from './_components/MessageView'; // Descomenta esta línea

export default async function MessagesPage({ searchParams }: { searchParams: { conversationId?: string }}) {
  const session = await getSession();
  if (!session) {
    redirect('/login');
  }
  const userId = session.uid;

  // --- CORRECCIÓN: Elimina el mapeo redundante ---
  // La función getConversationsForUser ya serializa los datos.
  const conversations = await getConversationsForUser(userId);

  const selectedConversationId = searchParams.conversationId;

  return (
    <div className="h-[calc(100vh-150px)] border rounded-lg flex">
      <aside className="w-1/3 border-r">
        <ConversationList conversations={conversations} currentUserId={userId} />
      </aside>
      <main className="w-2/3 flex flex-col">
        {selectedConversationId ? (
          // Usa el componente MessageView aquí
          <MessageView conversationId={selectedConversationId} currentUserId={userId} />
        ) : (
          <div className="flex-grow flex flex-col items-center justify-center text-muted-foreground">
            <MessageCircle size={48} />
            <p className="mt-4 text-lg">Selecciona una conversación para empezar a chatear</p>
          </div>
        )}
      </main>
    </div>
  );
}