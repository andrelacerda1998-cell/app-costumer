import React, { useEffect, useMemo, useState } from 'react';
import { View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { CustomText } from '@/components/CustomText';
import { Colors } from '@/constants/Colors';

/** Último minuto: deixa de ser uma espera e passa a ser uma decisão a tomar já. */
export const SEGUNDOS_CRITICOS = 60;

/** Sem `startedAt` não há proporção honesta; assume-se a janela nominal. */
const JANELA_NOMINAL_MS = 5 * 60 * 1000;

/**
 * Dois relógios desde 06/10/2026 (decisão do André; backend:
 * MatchingService::customerDeadline): 3 minutos para ESCOLHER, a contar do
 * último técnico que aceitou, e 5 minutos para PAGAR, a contar da escolha.
 * A janela de cada fase dá a proporção da barra quando não se sabe o início.
 */
export type FaseDoPrazo = 'escolher' | 'pagar';

/** Pedir agora: 3 min para escolher. Agendado: 10 (sem urgência). Pagar: 5. */
export const JANELA_DA_FASE_MS: Record<FaseDoPrazo, number> = {
  escolher: 3 * 60 * 1000,
  pagar: 5 * 60 * 1000,
};

export const JANELA_ESCOLHER_AGENDADO_MS = 10 * 60 * 1000;

export const janelaNominal = (fase: FaseDoPrazo, agendado: boolean): number =>
  fase === 'escolher' && agendado ? JANELA_ESCOLHER_AGENDADO_MS : JANELA_DA_FASE_MS[fase];

export interface EstadoDoPrazo {
  /** Segundos que faltam, arredondados para cima. Nunca negativo. */
  restam: number;
  /** "4:07". Sem horas: estas janelas são sempre de minutos. */
  etiqueta: string;
  /** Último minuto — é o que pinta tudo de vermelho. */
  critico: boolean;
  /** Fração da janela que ainda falta, de 1 a 0. */
  fracao: number;
}

/**
 * A conta toda, separada do desenho — a mesma razão do `resolveProgressStep`.
 *
 * Um contador testa-se mal a partir da árvore renderizada (é preciso fingir
 * relógios e esperar por intervalos) e testa-se bem assim: dá-se-lhe um
 * instante e verifica-se o que devolve.
 */
export const estadoDoPrazo = (limite: number, agora: number, inicio = 0, janelaNominal = JANELA_NOMINAL_MS): EstadoDoPrazo => {
  const restamMs = Math.max(0, limite - agora);
  const restam = Math.ceil(restamMs / 1000);
  const janela = limite > inicio && inicio > 0 ? limite - inicio : janelaNominal;

  return {
    restam,
    etiqueta: `${Math.floor(restam / 60)}:${String(restam % 60).padStart(2, '0')}`,
    // `<=` e nao `<`: aos 60 segundos exactos ja e o ultimo minuto. Com `<` o
    // vermelho so entrava aos 59 e a fronteira ficava um segundo ao lado do
    // que a copy promete.
    critico: restam <= SEGUNDOS_CRITICOS,
    fracao: Math.max(0, Math.min(1, restamMs / janela)),
  };
};

interface Props {
  /** Instante-limite do SERVIDOR, ISO-8601. null = não há relógio a correr. */
  expiresAt?: string | null;
  /** A hora do servidor no momento da resposta, para corrigir o desvio do telemóvel. */
  serverTime?: string | null;
  /** Quando o relógio arrancou, se se souber: dá a proporção que a barra usa. */
  startedAt?: string | null;
  /** Que relógio é: muda o texto ("Para escolheres" / "Para pagares") e a janela. */
  fase?: FaseDoPrazo;
  /** Agendado: a janela de escolher é de 10 minutos, não de 3. */
  agendado?: boolean;
}

/**
 * O relógio dos cinco minutos, no topo e sempre à vista.
 *
 * O prazo existia no servidor e o cliente não o via em lado nenhum. Um prazo
 * invisível não é um prazo: é um pedido que morre sem aviso enquanto ele decide
 * com calma. No ecrã da escolha conta o relógio de escolher; no checkout, o de
 * pagar — cada um com o seu texto (`fase`).
 *
 * ÂNCORA NO INSTANTE, e não um número decrementado ao segundo. Ir a segundo
 * plano — que é exatamente o que ele faz para abrir a app do banco — estrangula
 * os temporizadores no iOS, e ao voltar o contador mostrava tempo que já não
 * existia. Aqui o valor é sempre `limite - agora`.
 *
 * DESVIO DO RELÓGIO: o limite é do servidor e o `Date.now()` é do telemóvel.
 * Num prazo de cinco minutos, trinta segundos de desvio são um décimo do tempo.
 * O `server_time` vem na mesma resposta precisamente para isto.
 *
 * Nunca mostra "4:32" como hora do dia por acidente: a etiqueta por baixo diz
 * sempre para que é o número.
 */
const MatchingDeadlineBar: React.FC<Props> = ({ expiresAt, serverTime, startedAt, fase = 'escolher', agendado = false }) => {
  const { t } = useTranslation();

  // Calculado uma só vez: recalcular a cada render fazia o contador saltar.
  const [desvio] = useState(() => {
    if (!serverTime) return 0;
    const servidor = new Date(serverTime).getTime();
    return Number.isFinite(servidor) ? servidor - Date.now() : 0;
  });

  const limite = useMemo(() => {
    if (!expiresAt) return 0;
    const parsed = new Date(expiresAt).getTime();
    return Number.isFinite(parsed) ? parsed : 0;
  }, [expiresAt]);

  const inicio = useMemo(() => {
    if (!startedAt) return 0;
    const parsed = new Date(startedAt).getTime();
    return Number.isFinite(parsed) ? parsed : 0;
  }, [startedAt]);

  const [agora, setAgora] = useState(() => Date.now() + desvio);

  useEffect(() => {
    if (!limite) return;
    const id = setInterval(() => setAgora(Date.now() + desvio), 1000);
    return () => clearInterval(id);
  }, [limite, desvio]);

  if (!limite) return null;

  const { etiqueta, critico, fracao } = estadoDoPrazo(limite, agora, inicio, janelaNominal(fase, agendado));
  const legenda = t(`matching.deadline.${fase}.caption`);
  const legendaUrgente = t(`matching.deadline.${fase}.caption_urgent`);
  const cor = critico ? Colors.error : Colors.secondary;

  return (
    <View
      accessibilityRole="progressbar"
      accessibilityLabel={`${etiqueta} ${legenda}`}
      className="px-5 pt-3 pb-3"
      style={{
        backgroundColor: critico ? 'rgba(237,73,73,0.10)' : 'rgba(250,187,91,0.22)',
        borderBottomWidth: 1,
        borderBottomColor: critico ? 'rgba(237,73,73,0.28)' : 'rgba(27,27,27,0.08)',
      }}
    >
      <View className="flex-row items-center justify-center">
        <Feather name={critico ? 'alert-circle' : 'clock'} size={16} color={cor} />
        <CustomText
          // 20 px e nao 24: a 24 o numero dominava a folha inteira e lia-se
          // como o titulo do ecra em vez de como um aviso. Continua a ser o
          // elemento maior da barra — o que muda e nao competir com o conteudo
          // que ele esta ali para decidir.
          size="extraLarge"
          boldness="bolder"
          color={critico ? 'error' : 'secondary'}
          classes="ml-2"
          style={{ fontVariant: ['tabular-nums'] }}
        >
          {etiqueta}
        </CustomText>
      </View>

      <CustomText
        size="small"
        boldness="medium"
        color={critico ? 'error' : 'secondary'}
        classes="text-center mt-1"
      >
        {critico ? legendaUrgente : legenda}
      </CustomText>

      {/* A proporção diz num relance o que o número sozinho não diz: "1:10" é
          muito ou pouco conforme a janela seja de cinco minutos ou de trinta. */}
      <View
        className="w-full rounded-full overflow-hidden mt-2"
        style={{ height: 4, backgroundColor: 'rgba(27,27,27,0.10)' }}
      >
        <View style={{ width: `${Math.round(fracao * 100)}%`, height: '100%', backgroundColor: cor }} />
      </View>
    </View>
  );
};

export default MatchingDeadlineBar;
