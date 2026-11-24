// @ts-check

import mdx from '@astrojs/mdx';
import sitemap from '@astrojs/sitemap';
import { defineConfig } from 'astro/config';

import tailwindcss from '@tailwindcss/vite';

// https://astro.build/config
export default defineConfig({
  site: 'https://bustamam.tech',
  integrations: [
    mdx(),
    sitemap({
      // Redirect-only pages (harmless if they do not exist)
      filter: (page) =>
        !/\/work\/(cdk-global|embedded-insurance)\/?$/.test(page) &&
        !/\/ai-cohort\//.test(page), // unlisted cohort pages (noindex too)
    }),
  ],
  markdown: {
    shikiConfig: {
      themes: {
        light: 'github-light',
        dark: 'github-dark',
      },
      defaultColor: false,
    },
  },
  vite: {
    plugins: [tailwindcss()],
  },
});