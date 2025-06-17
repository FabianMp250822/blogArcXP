
'use client';

import { useAuth } from '@/hooks/use-auth';
import JournalistDashboard from '@/components/dashboards/JournalistDashboard';
import AdminDashboard from '@/components/dashboards/AdminDashboard';
import { Loader2 } from 'lucide-react';

export default function DashboardPage() {
  const { role, loading, user } = useAuth();

  if (loading || !user) {
    return (
      <div className="flex justify-center items-center min-h-[300px]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (role === 'journalist') {
    return <JournalistDashboard />;
  }

  if (role === 'admin') {
    return <AdminDashboard />;
  }

  return (
    <div className="text-center py-10">
      <h1 className="text-2xl font-bold text-destructive">Access Error</h1>
      <p className="text-muted-foreground">Could not determine your role or you do not have access.</p>
    </div>
  );
}
