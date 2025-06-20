'use client';

import { useState, useEffect, useTransition } from 'react';
import { useAuth } from '@/hooks/use-auth';
import { useToast } from '@/hooks/use-toast';
import { getUserProfile } from '@/lib/firebase/firestore';
import { unblockUserAction } from './../blocking-actions';
import type { UserProfile } from '@/types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Loader2, UserX, ShieldCheck } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';

export default function BlockedUsersPage() {
  const { user, userProfile } = useAuth();
  const { toast } = useToast();
  const [blockedUsersProfiles, setBlockedUsersProfiles] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    if (userProfile?.blockedUsers && userProfile.blockedUsers.length > 0) {
      Promise.all(
        userProfile.blockedUsers.map(uid => getUserProfile(uid))
      ).then(profiles => {
        setBlockedUsersProfiles(profiles.filter(p => p !== null) as UserProfile[]);
      }).finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, [userProfile]);

  const handleUnblock = (userToUnblockId: string) => {
    startTransition(async () => {
      if (!user) return;
      const idToken = await user.getIdToken();
      const result = await unblockUserAction(idToken, userToUnblockId);
      if (result.success) {
        toast({ title: 'Success', description: result.message });
        // Optimistically update UI
        setBlockedUsersProfiles(prev => prev.filter(p => p.uid !== userToUnblockId));
      } else {
        toast({ title: 'Error', description: result.message, variant: 'destructive' });
      }
    });
  };

  if (loading) {
    return <div className="flex justify-center items-center h-64"><Loader2 className="h-8 w-8 animate-spin" /></div>;
  }

  return (
    <Card className="max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center"><UserX className="mr-2 h-6 w-6 text-destructive"/>Blocked Users</CardTitle>
        <CardDescription>Manage users you have blocked. They cannot send you messages.</CardDescription>
      </CardHeader>
      <CardContent>
        {blockedUsersProfiles.length > 0 ? (
          <ul className="space-y-4">
            {blockedUsersProfiles.map(profile => (
              <li key={profile.uid} className="flex items-center justify-between p-3 bg-muted rounded-lg">
                <div className="flex items-center gap-3">
                  <Avatar>
                    <AvatarImage src={profile.photoURL} alt={profile.displayName} />
                    <AvatarFallback>{profile.displayName.charAt(0)}</AvatarFallback>
                  </Avatar>
                  <span className="font-medium">{profile.displayName}</span>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleUnblock(profile.uid)}
                  disabled={isPending}
                >
                  <ShieldCheck className="mr-2 h-4 w-4" />
                  Unblock
                </Button>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-center text-muted-foreground py-8">You haven't blocked any users.</p>
        )}
      </CardContent>
    </Card>
  );
}