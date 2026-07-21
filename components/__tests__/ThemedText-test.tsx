import * as React from 'react';
import renderer from 'react-test-renderer';

import { ThemedText } from '../ThemedText';

it(`renders correctly`, () => {
  const tree = renderer.create(<ThemedText color="#1B1B1B">Snapshot test!</ThemedText>).toJSON();

  expect(tree).toMatchSnapshot();
});
