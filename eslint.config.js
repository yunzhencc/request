// @ts-check
import antfu from '@antfu/eslint-config';

export default antfu(
  {
    stylistic: {
      semi: true,
    },

    type: 'lib',
    pnpm: true,
  },
);
