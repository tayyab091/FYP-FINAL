export function normalizedName(value: string) {
  return value.normalize('NFKC').trim().toLowerCase().replace(/\s+/g, ' ')
}

export function namePattern(value: string) {
  const escaped = value.normalize('NFKC').trim().split(/\s+/)
    .map(word => word.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'))
  return new RegExp('^\\s*' + escaped.join('\\s+') + '\\s*$', 'i')
}
