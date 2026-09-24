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

  it('diz quanto do preço é estrada, numa linha', () => {
    const tree = render(
      <VendorCard {...baseProps} rating={4.5} distance={13} price={3559} travelAmount={1706} />,
    );
    // Intl usa espaço não-quebrável antes do € — normalizar antes de comparar.
    const normalized = texts(tree).map((text) => text.replace(/\u00a0/g, ' '));
    expect(normalized).toEqual(expect.arrayContaining(['inclui 17,06 € de deslocação']));
  });

  it('não diz nada da estrada quando a listagem não sabe o valor', () => {
    const tree = render(
      <VendorCard {...baseProps} rating={4.5} distance={13} price={3559} />,
    );
    // Sem o número não se inventa: `preço/km × km` na app daria um valor
    // diferente do total, porque a app não conhece a comissão nem o IVA.
    expect(texts(tree).some((t) => t.includes('deslocação'))).toBe(false);
  });

  it('diz quanto se poupa, em euros, ao lado do preço', () => {
    const tree = render(
      <VendorCard {...baseProps} rating={4.5} distance={1} price={3756} originalPrice={5007} travelAmount={200} />,
    );
    const normalized = texts(tree).map((text) => text.replace(/\u00a0/g, ' '));
    // Quem carregou em "Poupa 25%" no ecrã anterior precisa de ver que o
    // desconto chegou ao SEU preço. A percentagem no cabeçalho diz por que há
    // desconto; isto diz que ele foi aplicado.
    expect(normalized.some((t) => t.includes('poupas 12,51 €'))).toBe(true);
  });

  it('não repete a percentagem: essa é do modo, e está no cabeçalho', () => {
    const tree = render(
      <VendorCard {...baseProps} rating={4.5} distance={1} price={3756} originalPrice={5007} />,
    );
    const normalized = texts(tree).map((text) => text.replace(/\u00a0/g, ' '));
    // Os 25% são iguais nos três cartões — repeti-los em cada um era mostrar
    // uma constante onde o cliente procura diferenças.
    expect(normalized.some((t) => t.includes('%'))).toBe(false);
  });

  it('não inventa poupança quando não há preço alternativo', () => {
    const tree = render(
      <VendorCard {...baseProps} rating={4.5} distance={1} price={3756} travelAmount={200} />,
    );
    const normalized = texts(tree).map((text) => text.replace(/\u00a0/g, ' '));
    expect(normalized.some((t) => t.includes('poupas'))).toBe(false);
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
