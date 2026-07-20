// Tokens do design system novo (fonte: design/app-customer/ui.jsx — objeto P).
// Usados apenas nos ecrãs já migrados para o design novo (ex.: Histórico),
// para não alterar a paleta global (constants/Colors.ts) do resto da aplicação.
export const DesignTokens = {
    bg: '#FFFFFF',
    soft: '#FBF7EF', // superfícies muito suaves (cards de resumo, chips inativos)
    ink: '#1B1813', // texto primário (preto quente)
    ink2: '#4B463D',
    mut: '#8C867A', // texto secundário
    mut2: '#B8B2A6', // texto muito suave
    line: 'rgba(27,24,19,.09)',
    line2: 'rgba(27,24,19,.05)',

    // Ouro Piquet
    A: '#F4B740', // amarelo de marca
    AD: '#E39A17', // variante escura (ícones sobre tint)
    AT: '#FCF3DC', // tint claro (quadrados de ícone)
    AT2: '#FBEDC6',

    // semânticas
    green: '#2FA36B',
    greenSoft: 'rgba(47,163,107,.13)',
    red: '#E0503A',
    redSoft: 'rgba(224,80,58,.12)',

    // bolhas de contagem dos chips
    countOnActive: 'rgba(27,18,0,.16)',
    countOnIdle: 'rgba(27,24,19,.07)',
} as const;
