import { redirect } from 'next/navigation';
import { currentUser } from '@/lib/auth';
import { hasMentor } from '@/lib/team';

export const dynamic = 'force-dynamic';
export default async function Root() {
  if (!(await hasMentor())) redirect('/setup');
  const u = await currentUser();
  if (!u) redirect('/login');
  redirect(u.status === 'active' ? '/hub' : '/pending');
}
