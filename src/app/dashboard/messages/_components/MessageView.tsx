'use client';

import { useState, useEffect, useRef, useTransition } from 'react';
import { useAuth } from '@/hooks/use-auth';
import { useToast } from '@/hooks/use-toast';
import { db } from '@/lib/firebase/config';
import { doc, collection, query, orderBy, onSnapshot, getDoc } from 'firebase/firestore';
import { addMessageToConversationAction, markConversationAsReadAction } from '../actions';
import type { Message, UserProfile } from '@/types';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
import { Send, Loader2 } from 'lucide-react';

interface MessageViewProps {
  conversationId: string;
  currentUserId: string;
}

export function MessageView({ conversationId, currentUserId }: MessageViewProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [isPending, startTransition] = useTransition();
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [otherParticipant, setOtherParticipant] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const scrollAreaRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!conversationId) return;

    const getParticipantInfo = async () => {
      setLoading(true);
      const convoRef = doc(db, 'conversations', conversationId);
      const convoSnap = await getDoc(convoRef);

      if (convoSnap.exists()) {
        const convoData = convoSnap.data();
        const otherParticipantId = convoData.participants.find((p: string) => p !== currentUserId);
        if (otherParticipantId) {
          const userProfileSnap = await getDoc(doc(db, 'users', otherParticipantId));
          if (userProfileSnap.exists()) {
            setOtherParticipant(userProfileSnap.data() as UserProfile);
          }
        }
      }
      setLoading(false);
    };

    getParticipantInfo();
  }, [conversationId, currentUserId]);

  useEffect(() => {
    if (!conversationId) return;

    const messagesQuery = query(collection(db, 'conversations', conversationId, 'messages'), orderBy('timestamp', 'asc'));
    const unsubscribe = onSnapshot(messagesQuery, (querySnapshot) => {
      const newMessages = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        timestamp: doc.data().timestamp.toDate(),
      })) as Message[];
      setMessages(newMessages);
    });

    return () => unsubscribe();
  }, [conversationId]);

  useEffect(() => {
    if (scrollAreaRef.current) {
      scrollAreaRef.current.scrollTo({ top: scrollAreaRef.current.scrollHeight, behavior: 'smooth' });
    }
  }, [messages]);

  const handleSendMessage = () => {
    if (!user || !newMessage.trim()) return;
    startTransition(async () => {
      const idToken = await user.getIdToken();
      const result = await addMessageToConversationAction(idToken, conversationId, newMessage);
      if (result.success) {
        setNewMessage('');
      } else {
        toast({ title: 'Error', description: result.message, variant: 'destructive' });
      }
    });
  };

  // Efecto para marcar la conversación como leída cuando se abre
  useEffect(() => {
    if (conversationId && user) {
      const markAsRead = async () => {
        const idToken = await user.getIdToken();
        await markConversationAsReadAction(idToken, conversationId);
      };
      markAsRead();
    }
  }, [conversationId, user]);

  if (loading) {
    return (
      <div className="flex flex-col h-full p-4 space-y-4">
        <Skeleton className="h-10 w-3/4" />
        <Skeleton className="h-10 w-3/4 ml-auto" />
        <Skeleton className="h-10 w-1/2" />
      </div>
    );
  }

  if (!otherParticipant) {
    return <div className="flex items-center justify-center h-full">No se pudo cargar la conversación.</div>;
  }

  return (
    <div className="flex flex-col h-full">
      <header className="flex items-center p-4 border-b">
        <Avatar>
          <AvatarImage src={otherParticipant.photoURL} />
          <AvatarFallback>{otherParticipant.displayName?.charAt(0) ?? 'U'}</AvatarFallback>
        </Avatar>
        <p className="ml-4 font-semibold">{otherParticipant.displayName ?? 'Usuario'}</p>
      </header>

      <ScrollArea className="flex-grow p-4" ref={scrollAreaRef}>
        <div className="space-y-4">
          {messages.map((message) => (
            <div key={message.id} className={cn('flex items-end gap-2', message.senderId === currentUserId ? 'justify-end' : 'justify-start')}>
              {message.senderId !== currentUserId && (
                <Avatar className="h-8 w-8">
                  <AvatarImage src={otherParticipant.photoURL} />
                  <AvatarFallback>{otherParticipant.displayName?.charAt(0) ?? 'U'}</AvatarFallback>
                </Avatar>
              )}
              <div className={cn('max-w-xs md:max-w-md p-3 rounded-lg', message.senderId === currentUserId ? 'bg-primary text-primary-foreground' : 'bg-muted')}>
                <p className="text-sm">{message.text}</p>
                <p className="text-xs text-right mt-1 opacity-70">{format(new Date(message.timestamp), 'p', { locale: es })}</p>
              </div>
            </div>
          ))}
        </div>
      </ScrollArea>

      <footer className="p-4 border-t">
        <div className="relative">
          <Textarea
            placeholder="Escribe un mensaje..."
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSendMessage(); } }}
            rows={1}
            className="pr-20 min-h-[40px] resize-none"
          />
          <Button type="submit" size="icon" className="absolute top-1/2 right-2 -translate-y-1/2" onClick={handleSendMessage} disabled={isPending || !newMessage.trim()}>
            {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
            <span className="sr-only">Enviar Mensaje</span>
          </Button>
        </div>
      </footer>
    </div>
  );
}