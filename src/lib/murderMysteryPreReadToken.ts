import crypto from 'crypto';

export interface MurderMysteryPreReadTokenPayload {
  scenarioId: string;
  roleId: string;
  issuedAt: number;
}

const getShareSecret = () =>
  process.env.NEXTAUTH_SECRET ?? process.env.MURDER_MYSTERY_SHARE_SECRET ?? '';

const toBase64Url = (value: string | Buffer) =>
  Buffer.from(value).toString('base64url');

const fromBase64Url = (value: string) =>
  Buffer.from(value, 'base64url').toString('utf8');

const signPayload = (encodedPayload: string, secret: string) =>
  crypto
    .createHmac('sha256', secret)
    .update(encodedPayload)
    .digest('base64url');

const isValidPayload = (
  value: unknown
): value is MurderMysteryPreReadTokenPayload => {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return false;
  }

  const payload = value as Record<string, unknown>;
  return (
    typeof payload.scenarioId === 'string' &&
    payload.scenarioId.length > 0 &&
    typeof payload.roleId === 'string' &&
    payload.roleId.length > 0 &&
    typeof payload.issuedAt === 'number' &&
    Number.isFinite(payload.issuedAt)
  );
};

export const createMurderMysteryPreReadToken = (
  payload: MurderMysteryPreReadTokenPayload
) => {
  const secret = getShareSecret();
  if (!secret) {
    throw new Error('사전 룰지 공유 secret이 설정되지 않았습니다.');
  }

  const encodedPayload = toBase64Url(JSON.stringify(payload));
  const signature = signPayload(encodedPayload, secret);
  return `${encodedPayload}.${signature}`;
};

export const verifyMurderMysteryPreReadToken = (
  token: string
): MurderMysteryPreReadTokenPayload | null => {
  const secret = getShareSecret();
  if (!secret) {
    return null;
  }

  const [encodedPayload, signature, extra] = token.split('.');
  if (!encodedPayload || !signature || extra !== undefined) {
    return null;
  }

  const expectedSignature = signPayload(encodedPayload, secret);
  const expectedBuffer = Buffer.from(expectedSignature);
  const actualBuffer = Buffer.from(signature);
  if (
    expectedBuffer.length !== actualBuffer.length ||
    !crypto.timingSafeEqual(expectedBuffer, actualBuffer)
  ) {
    return null;
  }

  try {
    const payload = JSON.parse(fromBase64Url(encodedPayload)) as unknown;
    return isValidPayload(payload) ? payload : null;
  } catch {
    return null;
  }
};
