export type Code21Request = { id: string; status: string; latitude: number; longitude: number };
export function orderCode21(items: Code21Request[]) { return [...items].sort((a,b)=>a.status.localeCompare(b.status)); }
