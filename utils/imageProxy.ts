/**
 * Redimensiona imagens remotas via proxy público (images.weserv.nl) para não
 * descarregar originais gigantes (ex.: 1254×1254) em miniaturas de 50–180 px.
 *
 * STOPGAP: enquanto o backend não gera uma conversão pequena (ver
 * BACKEND_PENDENCIAS nº 8). URLs locais/asset não passam pelo proxy.
 */

/**
 * Endereços que só existem dentro da máquina ou da rede de quem desenvolve.
 *
 * O proxy é um serviço PÚBLICO: vai buscar a imagem a partir da internet, não
 * do telemóvel. Um `http://localhost:8000/...` não lhe diz nada — ele tenta
 * resolver o SEU próprio localhost e falha. Resultado: contra um backend local
 * TODAS as imagens do catálogo caíam no ícone genérico, e parecia que o
 * backoffice estava sem fotografias quando o problema era só o caminho.
 */
const HOST_LOCAL = /^(localhost|127\.\d+\.\d+\.\d+|\[?::1\]?|10\.\d+\.\d+\.\d+|192\.168\.\d+\.\d+|172\.(1[6-9]|2\d|3[01])\.\d+\.\d+|.+\.local)$/i;

function isLocalHost(url: string): boolean {
  try {
    // O host sem a porta: o URL local traz :8000 e o padrão não o espera.
    return HOST_LOCAL.test(new URL(url).hostname);
  } catch {
    return false;
  }
}

export function proxiedImage(url?: string | null, width: number = 200): string | undefined {
  if (!url || typeof url !== "string") return undefined;
  if (!url.startsWith("http")) return url; // require() local ou file:// → devolve tal como está

  // Sem proxy no que é local. O comentário no topo já dizia que os URLs locais
  // não passavam por aqui, mas a única verificação era o `startsWith("http")` —
  // e um backend de desenvolvimento serve por http. Passavam todos.
  if (isLocalHost(url)) return url;

  // weserv: fontes https usam o prefixo "ssl:"; o URL de origem (com
  // ?expires&signature) é codificado inteiro para não colidir com a query do proxy.
  const scheme = url.startsWith("https") ? "ssl:" : "";
  const withoutScheme = url.replace(/^https?:\/\//, "");
  const src = encodeURIComponent(scheme + withoutScheme);
  return `https://images.weserv.nl/?url=${src}&w=${width}&output=webp&q=80`;
}
