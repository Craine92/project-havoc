export function serviceDiagnosis(label: string, lanReachable: boolean, localReachable: boolean, listening: boolean): string {
  if (lanReachable) return 'über LAN erreichbar'
  if (localReachable) return 'nur lokal erreichbar – LAN-Bindung oder Windows-Firewall prüfen'
  if (listening) return `Port belegt, aber ${label} antwortet nicht wie erwartet`
  return `${label} nicht gestartet`
}
