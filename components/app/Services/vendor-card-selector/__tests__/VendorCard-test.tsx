import React from 'react';
import renderer, { act } from 'react-test-renderer';
import VendorCard from '../index';

/**
 * Não consegui ver este cartão no simulador: o ambiente de testes não tem
 * técnicos na zona e o ecrã cai sempre no estado vazio. Estes testes verificam
 * o conteúdo — sobretudo que a nota nunca é inventada — e não o aspeto.
 */
// O React 19 so considera a arvore montada se o render acontecer dentro de
// `act`. Sem isto o `tree.root` rebenta com "Can't access .root on unmounted
// test renderer" e nenhum destes testes chega a olhar para o conteudo.
const render = (element: React.ReactElement<any>): renderer.ReactTestRenderer => {
  let tree: renderer.ReactTestRenderer;
  act(() => {
    tree = renderer.create(element);
  });
  return tree!;
};

const texts = (tree: renderer.ReactTestRenderer): string[] => [
  ...new Set(
    tree.root
      .findAll((node) => typeof node.props?.children === 'string')
      .map((node) => node.props.children as string),
  ),
];

const baseProps = {
  imgSrc: null,
  name: 'Rui Martins',
  onPress: () => {},
};

describe('VendorCard', () => {
  it('mostra nota e contagem quando o técnico já foi avaliado', () => {
    const tree = render(
      <VendorCard {...baseProps} rating={4.8} ratingsCount={23} distance={2.35} price={4000} />,
    );
    expect(texts(tree)).toEqual(expect.arrayContaining(['4,8', '(23 avaliações)']));
  });

  it('não inventa nota quando o técnico ainda não tem avaliações', () => {
    // Era este o problema: o backend devolvia 5 por omissão e um técnico
    // acabado de entrar aparecia com nota máxima.
    const tree = render(
      <VendorCard {...baseProps} rating={null} ratingsCount={0} distance={1} price={4000} />,
    );
    const rendered = texts(tree);
    expect(rendered).toEqual(expect.arrayContaining(['Novo na Piquet']));
    expect(rendered).not.toContain('5,0');
  });

  it('esconde a contagem quando não há avaliações contadas', () => {
    const tree = render(
      <VendorCard {...baseProps} rating={4.5} ratingsCount={0} distance={1} price={4000} />,
    );
    expect(texts(tree)).not.toContain('(0)');
  });

  it('omite a distância quando o backend não a envia', () => {
    const tree = render(
      <VendorCard {...baseProps} rating={4.5} distance={null} price={4000} />,
    );
    expect(texts(tree).some((text) => text.includes('km'))).toBe(false);
  });

  it('diz o que o valor alternativo é, e calcula a percentagem', () => {
    const tree = render(
      <VendorCard {...baseProps} rating={4.5} distance={1} price={3756} originalPrice={5007} />,
    );
    // Intl usa espaço não-quebrável antes do € — normalizar antes de comparar.
    const normalized = texts(tree).map((text) => text.replace(/\u00a0/g, ' '));

    // O número tem de vir com nome. Um preço riscado sozinho afirma "era este o
    // preço antes" — e não é: é o que o mesmo trabalho custaria pedido para
    // agora, que nunca foi cobrado a ninguém.
    expect(normalized).toEqual(
      expect.arrayContaining(['Se fosse agora: 50,07 € · poupas 25%']),
    );

    // E a percentagem sai da divisão, não de um texto fixo: 3756/5007 = 0,75.
    expect(normalized.some((text) => text.includes('25%'))).toBe(true);
  });

  it('acompanha o backend se o prémio de imediatismo mudar', () => {
    // Metade do preço: a linha tem de dizer 50%, não os 25% que o botão do
    // ecrã anterior tem escritos à mão.
    const tree = render(
      <VendorCard {...baseProps} rating={4.5} distance={1} price={2000} originalPrice={4000} />,
    );
    const normalized = texts(tree).map((text) => text.replace(/\u00a0/g, ' '));
    expect(normalized.some((text) => text.includes('poupas 50%'))).toBe(true);
  });

  it('não mostra poupança quando não há preço anterior', () => {
    const tree = render(
      <VendorCard {...baseProps} rating={4.5} distance={1} price={3756} />,
    );
    expect(texts(tree).some((t) => t.startsWith('Poupas'))).toBe(false);
  });

  it('mostra a ação explícita de escolha', () => {
    const tree = render(
      <VendorCard {...baseProps} rating={4.5} distance={1} price={4000} />,
    );
    expect(texts(tree)).toEqual(expect.arrayContaining(['Escolher']));
  });

  it('só mostra o coração quando a listagem suporta favoritos', () => {
    const semFavoritos = render(
      <VendorCard {...baseProps} rating={4.5} distance={1} price={4000} />,
    );
    expect(
      semFavoritos.root.findAll((n) => n.props?.accessibilityLabel?.includes?.('favorito')).length,
    ).toBe(0);

    const comFavoritos = render(
      <VendorCard {...baseProps} rating={4.5} distance={1} price={4000} onToggleFavorite={() => {}} />,
    );
    expect(
      comFavoritos.root.findAll((n) => n.props?.accessibilityLabel?.includes?.('favorito')).length,
    ).toBeGreaterThan(0);
  });
});
