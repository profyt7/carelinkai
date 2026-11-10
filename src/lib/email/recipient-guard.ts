/**
 * Send-guard: never email an address on a domain CareLinkAI does not own or that cannot receive mail.
 *   - *.test (RFC 2606 reserved — every seed/demo/e2e account lives here)
 *   - carelinkai.com and its subdomains (not ours; ours is getcarelinkai.com)
 *   - carelinkai.system (the unclaimed-directory sentinel operator)
 * Applied at the Resend client (createGuardedResend), so every send path — guardedResendSend and the
 * routes that build their own client — drops these recipients. If no `to` recipient is left, the send is
 * skipped and reads as a no-op success ({ data: null, error: null }).
 */
import { Resend } from 'resend';

function domainOf(address: string): string {
  const s = address.trim().replace(/^.*<([^>]*)>.*$/, '$1').trim().toLowerCase();
  const at = s.lastIndexOf('@');
  return at === -1 ? '' : s.slice(at + 1).replace(/\.$/, '');
}

export function isBlockedRecipient(address: string | null | undefined): boolean {
  if (typeof address !== 'string') return false;
  const d = domainOf(address);
  if (!d) return false;
  return (
    d === 'test' || d.endsWith('.test') ||
    d === 'carelinkai.com' || d.endsWith('.carelinkai.com') ||
    d === 'carelinkai.system' || d.endsWith('.carelinkai.system')
  );
}

type Recipients = string | string[] | undefined;
function keep(list: Recipients): { kept: string[]; blocked: string[] } {
  const arr = Array.isArray(list) ? list : list ? [list] : [];
  const kept: string[] = [];
  const blocked: string[] = [];
  for (const a of arr) (isBlockedRecipient(a) ? blocked : kept).push(a);
  return { kept, blocked };
}

/** Drops blocked to/cc/bcc recipients. Returns null when no `to` recipient is left (skip the send). */
export function guardRecipients<T extends { to?: Recipients; cc?: Recipients; bcc?: Recipients }>(args: T): { args: T | null; blocked: number } {
  const to = keep(args.to);
  const cc = keep(args.cc);
  const bcc = keep(args.bcc);
  const blocked = to.blocked.length + cc.blocked.length + bcc.blocked.length;
  if (blocked === 0) return { args, blocked };
  if (to.kept.length === 0) return { args: null, blocked };
  const out: T = { ...args, to: to.kept };
  if (args.cc !== undefined) out.cc = cc.kept;
  if (args.bcc !== undefined) out.bcc = bcc.kept;
  return { args: out, blocked };
}

/** A Resend client whose emails.send applies the recipient guard. Use instead of `new Resend(...)`. */
export function createGuardedResend(apiKey?: string): Resend {
  const client = new Resend(apiKey);
  if (typeof client.emails?.send !== 'function') return client; // nothing to guard (e.g. a webhook-only client)
  const send = client.emails.send.bind(client.emails);
  client.emails.send = (async (payload: Parameters<typeof send>[0], options?: Parameters<typeof send>[1]) => {
    const { args, blocked } = guardRecipients(payload as any);
    if (blocked > 0) {
      // Counts only — never the addresses.
      console.warn(`[email-guard] dropped ${blocked} recipient(s) on a blocked domain from "${String((payload as any)?.subject ?? '')}"`);
    }
    if (!args) return { data: null, error: null, headers: null } as unknown as Awaited<ReturnType<typeof send>>;
    return send(args as Parameters<typeof send>[0], options);
  }) as typeof client.emails.send;
  return client;
}
