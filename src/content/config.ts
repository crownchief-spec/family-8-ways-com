import { defineCollection, z } from 'astro:content';
import { glob } from 'astro/loaders';

const portfolio = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './content/portfolio' }),
  schema: z.object({
    title: z.string(),
    slug: z.string().optional(),
    date: z.string(),
    location: z.string(),
    country: z.string().optional(),
    category: z.array(z.string()),
    tags: z.array(z.string()).default([]),
    cover: z.string(),
    gallery: z.array(z.string()).default([]),
    excerpt: z.string(),
    draft: z.boolean().default(false),
    featured: z.boolean().default(false),
    season: z.string().optional(),
  }),
});

const locations = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './content/locations' }),
  schema: z.object({
    title: z.string(),
    subtitle: z.string().optional(),
    region: z.enum(['taiwan', 'overseas']),
    sort: z.number().default(0),
    cover: z.string().optional(),
    why_great: z.array(z.string()).default([]),
    seasons: z.array(z.string()).default([]),
    family_types: z.array(z.string()).default([]),
    scenes: z.array(z.string()).default([]),
    local_faqs: z
      .array(
        z.object({
          q: z.string(),
          a: z.string(),
        }),
      )
      .default([]),
    /** 對應作品 frontmatter 的 location 欄位，用於嵌入區域作品 */
    portfolio_match: z.string().optional(),
    draft: z.boolean().default(false),
  }),
});

const clients = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './content/clients' }),
  schema: z.object({
    title: z.string(),
    slug: z.string().optional(),
    client_name: z.string(),
    project_type: z.string(),
    shoot_date: z.string(),
    status: z.string(),
    password_protected: z.boolean().default(false),
    /** 僅供開發／靜站示意；正式環境請改用更安全的存取控管。 */
    password: z.string().optional(),
    cover: z.string().optional(),
    gallery_link: z.string().optional(),
    download_link: z.string().optional(),
    video_link: z.string().optional(),
    proof_link: z.string().optional(),
    shoot_includes: z.array(z.string()).default([]),
    notes: z.string().optional(),
    estimated_delivery: z.string().optional(),
    draft: z.boolean().default(false),
  }),
});

const reviews = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './content/reviews' }),
  schema: z.object({
    title: z.string(),
    location: z.string(),
    type: z.string(),
    photo: z.string().optional(),
    excerpt: z.string().optional(),
    sort: z.number().default(0),
    draft: z.boolean().default(false),
  }),
});

const faq = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './content/faq' }),
  schema: z.object({
    title: z.string(),
    sort: z.number().default(0),
    draft: z.boolean().default(false),
  }),
});

export const collections = { portfolio, locations, clients, reviews, faq };
