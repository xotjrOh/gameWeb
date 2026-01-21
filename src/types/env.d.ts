namespace NodeJS {
  interface ProcessEnv {
    KAKAO_CLIENT_ID: string;
    KAKAO_CLIENT_SECRET: string;
    GOOGLE_CLIENT_ID: string;
    GOOGLE_CLIENT_SECRET: string;
    NEXTAUTH_SECRET: string;
    NEXTAUTH_URL: string;
    NEXT_PUBLIC_SITE_URL: string;
    OPENDICT_API_KEY?: string;
    DICT_API_KEY?: string;
  }
}
