import { isManagedRole, type ManagedRole } from "#lib/auth/current-user";

export const MAX_RECIPIENTS = 5000;

export type NotificationTarget = {
  all?: boolean;
  roles?: ManagedRole[];
  userIds?: string[];
};

export type AudienceCandidate = {
  id: string;
  role: string;
};

export type Audience = {
  recipientIds: string[];
  overLimit: boolean;
};

export function resolveAudience(
  candidates: readonly AudienceCandidate[],
  target: NotificationTarget,
  senderId?: string,
): Audience {
  const wantsAll = target.all === true;
  const wantedRoles = new Set<string>(wantsAll ? [] : (target.roles ?? []));
  const wantedIds = new Set<string>(wantsAll ? [] : (target.userIds ?? []));

  const recipientIds: string[] = [];
  const seen = new Set<string>();

  for (const candidate of candidates) {
    if (seen.has(candidate.id)) continue;
    if (!isManagedRole(candidate.role)) continue;
    if (candidate.id === senderId) continue;
    if (!wantsAll && !wantedRoles.has(candidate.role) && !wantedIds.has(candidate.id)) continue;

    seen.add(candidate.id);
    recipientIds.push(candidate.id);
  }

  return { recipientIds, overLimit: recipientIds.length > MAX_RECIPIENTS };
}
