/**
 * Compares dotted numeric versions (e.g. "2026.6.1"). Returns true when
 * `current` is lower than `minimum` (i.e. the app must be updated).
 */
export function isVersionOutdated(current: string, minimum: string): boolean {
  const c = String(current).split('.').map((n) => Number(n) || 0);
  const m = String(minimum).split('.').map((n) => Number(n) || 0);
  for (let i = 0; i < Math.max(c.length, m.length); i++) {
    const a = c[i] || 0;
    const b = m[i] || 0;
    if (a < b) return true;
    if (a > b) return false;
  }
  return false;
}

export function validateNIF(value: string) {
  // has 9 digits?
  if (/^[0-9]{9}$/.test(value) === false) return false

  // starts with 5 (Pessoa coletiva)
  if(!['1', '2', '3', '5', '6', '8'].includes(value.substring(0,1)) && 
  !['45', '70', '71', '72', '77', '79', '90', '91', '98', '99'].includes(value.substring(0,2)))
   return false

  const total =
    Number(value[0]) * 9 +
    Number(value[1]) * 8 +
    Number(value[2]) * 7 +
    Number(value[3]) * 6 +
    Number(value[4]) * 5 +
    Number(value[5]) * 4 +
    Number(value[6]) * 3 +
    Number(value[7]) * 2

  const module11 = total - Math.floor(total / 11) * 11
  const comparison = module11 === 1 || module11 === 0 ? 0 : 11 - module11

  return Number(value[8]) === comparison
}

export function orderByAlphaOrder<T>(list: T[] | null | undefined, criteria: keyof T): T[] {
  if (!Array.isArray(list) || list.length === 0) return [];

  return [...list].sort((a, b) => {
    const aVal = typeof a[criteria] === 'string' ? (a[criteria] as string).trim().toUpperCase() : '';
    const bVal = typeof b[criteria] === 'string' ? (b[criteria] as string).trim().toUpperCase() : '';
    return aVal < bVal ? -1 : aVal > bVal ? 1 : 0;
  });
}

export const commonPasswords = [
  'Password123!', 'Qwerty123!', 'Welcome123!', 'Admin123!', 'User123!', 
  'Test123!', 'Example123!', 'Sample123!', 'Demo123!', 'Temp123!',
  'password', '123456', 'qwerty', 'abc123', 'letmein', 'monkey', 
  'football', 'iloveyou', 'admin', 'welcome',
  '123456', 'password', '123456789', '12345', '12345678', 'qwerty', 
  '1234567', '111111', '1234567890', '123123', 'abc123', '1234', 
  'password1', 'iloveyou', '1q2w3e4r', '000000', 'qwerty123', 'zaq12wsx', 
  'dragon', 'sunshine', 'princess', 'letmein', '654321', 'monkey', 
  '27653', '1qaz2wsx', '123321', 'qwertyuiop', 'superman', 'asdfghjkl'
];