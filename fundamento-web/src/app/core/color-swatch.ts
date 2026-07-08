// Mapa de nomes de cor em português (como o admin digita) para um valor CSS exibível.
const COLOR_NAMES: Record<string, string> = {
  vermelho: '#e0483e',
  azul: '#3e7fe0',
  verde: '#3ea562',
  amarelo: '#f2c53d',
  laranja: '#f0883e',
  roxo: '#8a5cd6',
  rosa: '#e874b0',
  preto: '#2e2350',
  branco: '#f7f3ea',
  cinza: '#9a94a8',
  marrom: '#8a5a3c',
  dourado: '#d4af37',
  prateado: '#c0c0c8'
};

// Paleta de reserva para nomes não reconhecidos, escolhida de forma determinística pelo texto.
const FALLBACK_PALETTE = ['#e0483e', '#3e7fe0', '#3ea562', '#f2c53d', '#8a5cd6', '#f0883e'];

export function colorSwatch(name: string): string {
  const key = name.trim().toLowerCase();
  if (COLOR_NAMES[key]) return COLOR_NAMES[key];

  // Se o admin já digitou uma cor CSS válida (ex: "red", "#ff0000"), usa direto.
  if (CSS.supports('color', name)) return name;

  let hash = 0;
  for (let i = 0; i < key.length; i++) hash = (hash * 31 + key.charCodeAt(i)) >>> 0;
  return FALLBACK_PALETTE[hash % FALLBACK_PALETTE.length];
}
