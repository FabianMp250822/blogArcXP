'use client';

import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { formatDistanceToNow } from 'date-fns';
import { es } from 'date-fns/locale';
import type { Conversation } from '@/types';
import { cn } from '@/lib/utils';

import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { NewMessageDialog } from './NewMessageDialog';

interface ConversationListProps {
  // Actualizamos el tipo para reflejar que el timestamp es ahora un string
  conversations: (Omit<Conversation, 'lastMessageTimestamp'> & { lastMessageTimestamp: string })[];
  currentUserId: string;
}

export function ConversationList({ conversations, currentUserId }: ConversationListProps) {
  const searchParams = useSearchParams();
  const selectedConversationId = searchParams.get('conversationId');

  return (
    <div className="flex flex-col h-full">
      <div className="p-4 border-b">
        <NewMessageDialog />
      </div>
      <ScrollArea className="flex-grow">
        {conversations.length > 0 ? (
          conversations.map((convo) => {
            const otherParticipant = convo.participantProfiles.find(p => p.uid !== currentUserId);
            if (!otherParticipant) return null;

            return (
              <Link
                key={convo.id}
                href={`/dashboard/messages?conversationId=${convo.id}`}
                className={cn(
                  'flex items-center p-4 border-b hover:bg-muted/50 transition-colors',
                  selectedConversationId === convo.id && 'bg-muted'
                )}
              >
                <Avatar className="mr-4">
                  <AvatarImage src={otherParticipant.photoURL} />
                  {/* --- SOLUCIÓN 2 (Parte A): Protección para displayName --- */}
                  <AvatarFallback>{otherParticipant.displayName?.charAt(0) ?? 'U'}</AvatarFallback>
                </Avatar>
                <div className="flex-grow overflow-hidden">
                  <div className="flex justify-between items-center">
                    <p className="font-semibold truncate">{otherParticipant.displayName ?? 'Usuario'}</p>
                    <p className="text-xs text-muted-foreground whitespace-nowrap">
                      {/* --- SOLUCIÓN 2 (Parte B): Convertir el string de vuelta a Date --- */}
                      {convo.lastMessageTimestamp && formatDistanceToNow(new Date(convo.lastMessageTimestamp), { addSuffix: true, locale: es })}
                    </p>
                  </div>
                  <p className="text-sm text-muted-foreground truncate">{convo.lastMessage}</p>
                </div>
              </Link>
            );
          })
        ) : (
          <div className="p-8 text-center text-muted-foreground">
            <p>No conversations yet.</p>
            <p className="text-sm">Start a new one!</p>
          </div>
        )}
      </ScrollArea>
    </div>
  );
}