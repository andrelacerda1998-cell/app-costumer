import * as React from 'react';
import renderer, { act } from 'react-test-renderer';

import { ThemedText } from '../ThemedText';

it(`renders correctly`, () => {
  // O React 19 exige que o render aconteca dentro de `act`.
  let r: renderer.ReactTestRenderer;
  act(() => {
    r = renderer.create(<ThemedText color="#1B1B1B">Snapshot test!</ThemedText>);
  });
  const tree = r!.toJSON();

  expect(tree).toMatchSnapshot();
});
