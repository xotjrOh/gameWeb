'use client';

import { useEffect, useState } from 'react';
import io from 'socket.io-client';
import { authOptions } from "@/pages/api/auth/[...nextauth]";
import { getServerSession } from "next-auth/next";
import LogOutBtn from "@/components/LogOutBtn";
import { signOut } from "next-auth/react";
import SignInPage from "./auth/signin/page";
import { redirect } from 'next/navigation';

export default async function Page() {
  const session = await getServerSession(authOptions);
  console.log("session : ", session);
  // signOut({ callbackUrl: '/' });
  if (!session) {
    redirect('/auth/signin');
  }

  redirect('/room');
}
