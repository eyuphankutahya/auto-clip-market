type LinkedAccount = { user_id: string | null };

export function customerType(isAdmin: boolean, userId: string | undefined, account: LinkedAccount | null) {
  if (isAdmin) return "superadmin";
  if (userId && account?.user_id === userId) return "special";
  return "regular";
}

export function canCreateLinkedAccount(userId: string, companyName: string, used: Set<string | null>) {
  return Boolean(userId && companyName.trim() && !used.has(userId));
}