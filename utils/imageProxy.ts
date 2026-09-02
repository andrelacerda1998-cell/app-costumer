/**
 * Redimensiona imagens remotas via proxy público (images.weserv.nl) para não
 * descarregar originais gigantes (ex.: 1254×1254) em miniaturas de 50–180 px.
 *
 * STOPGAP: enquanto o backend não gera uma conversão pequena (ver
 * BACKEND_PENDENCIAS nº 8). URLs locais/asset não passam pelo proxy.
 */
export function proxiedImage(url?: string | null, width: number = 200): string | undefined {
  if (!url || typeof url !== "string") return undefined;
  if (!url.startsWith("http")) return url; // require() local ou file:// → devolve tal como está

  // weserv: fontes https usam o prefixo "ssl:"; o URL de origem (com
  // ?expires&signature) é codificado inteiro para não colidir com a query do proxy.
  const scheme = url.startsWith("https") ? "ssl:" : "";
  const withoutScheme = url.replace(/^https?:\/\//, "");
  const src = encodeURIComponent(scheme + withoutScheme);
  return `https://images.weserv.nl/?url=${src}&w=${width}&output=webp&q=80`;
}
