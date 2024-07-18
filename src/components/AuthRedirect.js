'use client';

import { useEffect } from "react";
import { signIn } from "next-auth/react";

export default function AuthRedirect() {
  useEffect(() => {
    signIn()
  }, []);

  return null;
}