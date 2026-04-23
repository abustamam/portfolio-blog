import { defineCollection, z } from 'astro:content';
import { glob } from 'astro/loaders';

const blog = defineCollection({
	// Load Markdown and MDX files in the `src/content/blog/` directory.
	loader: glob({ base: './src/content/blog', pattern: '**/*.{md,mdx}' }),
	// Type-check frontmatter using a schema
	schema: ({ image }) =>
		z.object({
			title: z.string(),
			description: z.string(),
			// Transform string to Date object
			pubDate: z.coerce.date(),
			updatedDate: z.coerce.date().optional(),
			heroImage: image().optional(),
			series: z.string().optional(),
			seriesOrder: z.number().optional(),
			draft: z.boolean().optional(),
			// New Terminal Sharp fields
			dek: z.string().optional(),        // subtitle / pull quote
			tag: z.string().optional(),        // primary topic tag
			kind: z.string().optional(),       // Essay | Teardown | Case Study
			readMin: z.number().optional(),    // estimated reading time in minutes
			words: z.number().optional(),      // approximate word count
		}),
});

const series = defineCollection({
	loader: glob({ base: './src/content/series', pattern: '**/*.{md,mdx}' }),
	schema: ({ image }) =>
		z.object({
			title: z.string(),
			description: z.string(),
			heroImage: image().optional(),
			draft: z.boolean().optional(),
		}),
});

export const collections = { blog, series };
