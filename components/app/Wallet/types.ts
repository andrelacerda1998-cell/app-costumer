import { renderMoney } from "@/utils/money";

/**
 * Valores redondos sem cêntimos: "5 €" e não "5,00 €" — é como se diz o
 * prémio ("dá 5 €, ganha 5 €"). Com cêntimos, o formato normal.
 */
export const eurosCurto = (centimos: number) =>
  centimos % 100 === 0 ? `${centimos / 100} €` : (renderMoney(centimos) as string);

/** GET /customer/wallet */
export interface WalletMovement {
  id: number;
  tipo: "entrada" | "saida";
  parte: "saldo" | "convites";
  valor: number;
  descricao: string;
  service_id: number | null;
  data: string;
}

export interface WalletData {
  total: number;
  saldo: number;
  convites: number;
  convites_a_expirar: { amount: number; expires_at: string }[];
  movimentos: {
    items: WalletMovement[];
    meta: { current_page: number; last_page: number; per_page: number; total: number };
  };
}

/** GET /customer/referral */
export interface ReferralSummary {
  code: string;
  /** Link da mensagem: loja certa + código (servidores mais antigos não o mandam). */
  share_url?: string;
  can_invite: boolean;
  reward_amount: number;
  minimum_service_amount: number;
  friends_joined: number;
  friends_pending: number;
  friends_completed: number;
  earned: number;
  rewards_left_this_year: number;
  used_a_code: boolean;
}

export const cartao = {
  shadowColor: "#000",
  shadowOpacity: 0.05,
  shadowRadius: 12,
  shadowOffset: { width: 0, height: 4 },
  elevation: 2,
};

/**
 * "12/02" no idioma da app.
 *
 * O i18n da app usa "pt_PT"; o Intl só aceita "pt-PT" e rebenta com o outro
 * ("Invalid language tag"). Troca-se o separador e, se mesmo assim falhar,
 * cai-se para pt-PT em vez de derrubar o ecrã.
 */
export const dataCurta = (iso: string, locale: string) => {
  const opcoes = { day: "2-digit", month: "2-digit" } as const;
  try {
    return new Date(iso).toLocaleDateString(locale.replace("_", "-"), opcoes);
  } catch {
    return new Date(iso).toLocaleDateString("pt-PT", opcoes);
  }
};
