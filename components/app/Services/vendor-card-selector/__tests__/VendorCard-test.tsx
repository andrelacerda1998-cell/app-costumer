import React from 'react';
import renderer from 'react-test-renderer';
import VendorCard from '../index';

/**
 * Não consegui ver este cartão no simulador: o ambiente de testes não tem
 * técnicos na zona e o ecrã cai sempre no estado vazio. Estes testes verificam
 * o conteúdo — sobretudo que a nota nunca é inventada — e não o aspeto.
 */
const texts = (tree: renderer.ReactTestRenderer): string[] =>
  tree.root
    .findAll((node) => typeof node.props?.children === 'string')
    .map((node) => node.props.children as string);

const baseProps = {
  imgSrc: null,
  name: 'Rui Martins',
  onPress: () => {},
};

describe('VendorCard', () => {
  it('mostra nota e contagem quando o técnico já foi avaliado', () => {
    const tree = renderer.create(
      <VendorCard {...baseProps} rating={4.8} ratingsCount={23} distance={2.35} price={4000} />,
    );
    expect(texts(tree)).toEqual(expect.arrayContaining(['4,8', '(23)']));
  });

  it('não inventa nota quando o técnico ainda não tem avaliações', () => {
    // Era este o problema: o backend devolvia 5 por omissão e um técnico
    // acabado de entrar aparecia com nota máxima.
    const tree = renderer.create(
      <VendorCard {...baseProps} rating={null} ratingsCount={0} distance={1} price={4000} />,
    );
    const rendered = texts(tree);
    expect(rendered).toEqual(expect.arrayContaining(['Novo na Piquet']));
    expect(rendered).not.toContain('5,0');
  });

  it('esconde a contagem quando não há avaliações contadas', () => {
    const tree = renderer.create(
      <VendorCard {...baseProps} rating={4.5} ratingsCount={0} distance={1} price={4000} />,
    );
    expect(texts(tree)).not.toContain('(0)');
  });

  it('omite a distância quando o backend não a envia', () => {
    const tree = renderer.create(
      <VendorCard {...baseProps} rating={4.5} distance={null} price={4000} />,
    );
    expect(texts(tree).some((text) => text.includes('km'))).toBe(false);
  });

  it('mostra a poupança em euros em vez de uma percentagem abstrata', () => {
    const tree = renderer.create(
      <VendorCard {...baseProps} rating={4.5} distance={1} price={3756} originalPrice={5007} />,
    );
    // Intl usa espaço não-quebrável antes do € — normalizar antes de comparar.
    const normalized = texts(tree).map((text) => text.replace(/\u00a0/g, ' '));
    expect(normalized).toEqual(expect.arrayContaining(['Poupas 12,51 €']));
  });

  it('não mostra poupança quando não há preço anterior', () => {
    const tree = renderer.create(
      <VendorCard {...baseProps} rating={4.5} distance={1} price={3756} />,
    );
    expect(texts(tree).some((t) => t.startsWith('Poupas'))).toBe(false);
  });

  it('mostra a ação explícita de escolha', () => {
    const tree = renderer.create(
      <VendorCard {...baseProps} rating={4.5} distance={1} price={4000} />,
    );
    expect(texts(tree)).toEqual(expect.arrayContaining(['Escolher']));
  });

  it('só mostra o coração quando a listagem suporta favoritos', () => {
    const semFavoritos = renderer.create(
      <VendorCard {...baseProps} rating={4.5} distance={1} price={4000} />,
    );
    expect(
      semFavoritos.root.findAll((n) => n.props?.accessibilityLabel?.includes?.('favorito')).length,
    ).toBe(0);

    const comFavoritos = renderer.create(
      <VendorCard {...baseProps} rating={4.5} distance={1} price={4000} onToggleFavorite={() => {}} />,
    );
    expect(
      comFavoritos.root.findAll((n) => n.props?.accessibilityLabel?.includes?.('favorito')).length,
    ).toBeGreaterThan(0);
  });
});
