import { z } from "zod";
import { searchResultItemSchema } from "./customSearchResultSchema";

export const responseSchema = z.object({
  companyName: z.string(),
  summary: z.string(),
  socials: z.array(
    z.object({
      name: z.string(),
      link: z.string(),
    })
  ),
  corePillars: z.array(
    z.object({
      name: z.string(),
      outline: z.string(),
    })
  ),
  news: z.array(
    z.object({
      title: z.string(),
      url: z.string(),
    })
  ),
});

export const responseSchemaWithSearchItems = responseSchema.extend({
  searchResults: searchResultItemSchema,
});

export type ResponseScheamWithSearchItems = z.infer<
  typeof responseSchemaWithSearchItems
>;
