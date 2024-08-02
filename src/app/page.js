// import { useEffect, useState } from 'react';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/pages/api/auth/[...nextauth]';
import Header from '@/components/Header';

export default async function HomePage() {
  console.log("start")
  const session = await getServerSession(authOptions);

  // useEffect(() => {
  //   console.log('useEffect is working');
  // }, []);

  return (
    <div>
      <Header session={session} />
    </div>
  );
}
