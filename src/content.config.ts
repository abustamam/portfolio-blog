import { defineCollection, z } from 'astro:content';
import { glob } from 'astro/loaders';

const writing = defineCollection({
	// Load Markdown and MDX files in the `src/content/writing/` directory.
	loader: glob({ base: './src/content/writing', pattern: '**/*.{md,mdx}' }),
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

const work = defineCollection({
	loader: glob({ base: './src/content/work', pattern: '**/*.{md,mdx}' }),
	schema: ({ image }) =>
		z.object({
			// Core identity
			company:     z.string(),
			projectName: z.string().optional(),
			role:        z.string(),
			type:        z.enum(['consulting', 'employment']),

			// Dates — store ISO strings, coerce to Date for sorting
			startDate: z.coerce.date(),
			endDate:   z.coerce.date().optional(), // omit = present
			period:    z.string(), // human-readable: "Aug 2023 – Present"

			// Employment-only
			location: z.string().optional(),

			// companyMission renders separately from body
			companyMission: z.string().optional(),

			// Skills
			skills: z.array(z.string()).default([]),

			// Branding
			logo:     image().optional(),
			darkLogo: z.boolean().default(false),

			// Badges
			badges: z.array(z.enum(['acquired', 'zeroToOne'])).default([]),

			// Multi-role (employment only)
			additionalRoles: z
				.array(z.object({
					role:        z.string(),
					period:      z.string(),
					description: z.string(),
				}))
				.optional(),

			// Display controls
			order:    z.number().optional(),
			featured: z.boolean().default(false),
			draft:    z.boolean().default(false),
		}),
});

export const collections = { writing, series, work };
