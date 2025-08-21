import antfu from '@antfu/eslint-config';
import pluginQuery from '@tanstack/eslint-plugin-query';

export default antfu(
  {
    stylistic: {
      semi: true,
    },
    
    ignores: [
      'dist',
    ],
  },
);
