// Altura determinística de "impressão concluída" usada nas miniaturas da marca (0.6–1.0).
export function printHeight(id: number): number {
  return 0.6 + ((id * 37) % 40) / 100;
}

// Cor de brinquedo que cada peça "sai da impressora", alternando pela paleta da loja.
const TOY_COLORS = ['var(--fl-roxo)', 'var(--fl-menta)', 'var(--fl-laranja)', 'var(--fl-sol)'];

export function toyColor(id: number): string {
  return TOY_COLORS[id % TOY_COLORS.length];
}
