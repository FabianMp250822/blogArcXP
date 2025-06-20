'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/use-auth';
import { useToast } from '@/hooks/use-toast';
import { sendMessageAction, searchUsersAction } from '../actions'; // Importa la nueva acción
import type { UserProfile } from '@/types';

import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Loader2, Send } from 'lucide-react';

export function NewMessageDialog() {
  const { user } = useAuth();
  const { toast } = useToast();
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [open, setOpen] = useState(false);
  const [searchResults, setSearchResults] = useState<UserProfile[]>([]);
  const [selectedUser, setSelectedUser] = useState<UserProfile | null>(null);
  const [message, setMessage] = useState('');

  const handleSearch = async (query: string) => {
    if (query.length < 2 || !user) {
      setSearchResults([]);
      return;
    }
    // Llama a la Server Action en lugar de la función directa
    const idToken = await user.getIdToken();
    const result = await searchUsersAction(query, idToken);
    
    if (result.success && result.users) {
        setSearchResults(result.users);
    } else {
        setSearchResults([]);
        toast({ title: 'Search Error', description: result.message, variant: 'destructive' });
    }
  };

  const handleSend = () => {
    if (!user || !selectedUser || !message.trim()) return;

    startTransition(async () => {
      const idToken = await user.getIdToken();
      const result = await sendMessageAction(idToken, selectedUser.uid, message);

      if (result.success && result.conversationId) {
        toast({ title: 'Message Sent!', description: 'Your conversation has started.' });
        setOpen(false);
        setSelectedUser(null);
        setMessage('');
        router.push(`/dashboard/messages?conversationId=${result.conversationId}`);
      } else {
        toast({ title: 'Error', description: result.message, variant: 'destructive' });
      }
    });
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>New Message</Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>New Message</DialogTitle>
        </DialogHeader>
        <Command className="rounded-lg border shadow-md">
          <CommandInput onValueChange={handleSearch} placeholder="Type a name to search..." />
          <CommandList>
            <CommandEmpty>No users found.</CommandEmpty>
            <CommandGroup>
              {searchResults.map((profile) => (
                <CommandItem key={profile.uid} onSelect={() => setSelectedUser(profile)}>
                  <Avatar className="mr-2 h-6 w-6">
                    <AvatarImage src={profile.photoURL} />
                    <AvatarFallback>{profile.displayName.charAt(0)}</AvatarFallback>
                  </Avatar>
                  <span>{profile.displayName}</span>
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>

        {selectedUser && (
          <div className="mt-4">
            <p className="text-sm font-medium mb-2">To: {selectedUser.displayName}</p>
            <Textarea
              placeholder={`Write your message to ${selectedUser.displayName}...`}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              rows={4}
            />
            <Button onClick={handleSend} disabled={isPending || !message.trim()} className="mt-2 w-full">
              {isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Send className="mr-2 h-4 w-4" />}
              Send
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}