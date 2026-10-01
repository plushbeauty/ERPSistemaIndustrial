export type PermissionOverride = 'allow' | 'deny' | null

export function resolveEffectivePermission(input: {
  roleGranted: boolean
  departmentGranted: boolean
  userOverride: PermissionOverride
  isMaster?: boolean
}): boolean {
  if (input.isMaster) return true
  if (input.userOverride === 'allow') return true
  if (input.userOverride === 'deny') return false
  return input.roleGranted || input.departmentGranted
}
