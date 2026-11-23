/**
 * UUIDv7 (RNF-SYN-02): 48 bits de milissegundos + versão 7 + variante RFC 9562 + aleatório.
 * Ordena por criação e permite criar offline sem colisão. Relógio e aleatoriedade entram como
 * parâmetro: quem chama (app ou API) é o adaptador.
 */
export function uuidv7(now: number, random: Uint8Array): string {
  const bytes = new Uint8Array(16);
  let time = now;
  for (let index = 5; index >= 0; index -= 1) {
    bytes[index] = time % 256;
    time = Math.floor(time / 256);
  }
  bytes.set(random.subarray(0, 10), 6);
  bytes[6] = 0x70 | ((bytes[6] ?? 0) & 0x0f);
  bytes[8] = 0x80 | ((bytes[8] ?? 0) & 0x3f);
  const hex = Array.from(bytes, (byte) => byte.toString(16).padStart(2, '0')).join('');
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}
