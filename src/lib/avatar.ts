export const USER_AVATAR_POPULATE_SELECT = 'fullName profileImage avatarUrl role email'

export function resolveAvatarUrl(
  user?: { avatarUrl?: string | null; profileImage?: string | null } | null,
): string | undefined {
  const url = user?.avatarUrl?.trim() || user?.profileImage?.trim()
  return url || undefined
}

/** Apply Cloudinary resize/crop transforms for avatar thumbnails. */
export function withCloudinaryAvatarTransform(url: string, size: number): string {
  if (!url.includes('res.cloudinary.com') || !url.includes('/upload/')) {
    return url
  }
  if (/\/upload\/[^/]*c_fill/.test(url)) {
    return url
  }
  const transform = `c_fill,w_${size},h_${size},f_auto,q_auto`
  return url.replace('/upload/', `/upload/${transform}/`)
}

export function withResolvedAvatar<T extends { avatarUrl?: string | null; profileImage?: string | null }>(
  user: T,
): T & { avatarUrl: string; profileImage: string } {
  const resolved = resolveAvatarUrl(user) || ''
  return {
    ...user,
    avatarUrl: resolved,
    profileImage: resolved || user.profileImage || '',
  }
}
