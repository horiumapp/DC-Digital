/** Identity captured by each tab; reject writes after another tab switches accounts. */
let sessionOwner: string | null | undefined;
export function setOfflineOwner(owner: string | null): void { sessionOwner = owner; }
export function offlineOwner(): string | null {
  const stored = localStorage.getItem('dc_last_user_id');
  if (sessionOwner !== undefined && sessionOwner !== stored) return null;
  return sessionOwner === undefined ? stored : sessionOwner;
}
