import { z } from "zod";

// Schema for URL
const urlSchema = z.object({
  type: z.string(),
  template: z.string(),
});

// Schema for page map (using unknown since the actual structure is collapsed in the JSON)
const pageMapSchema = z.record(z.unknown());

// Schema for search result items
const searchResultItemSchema = z.object({
  kind: z.string(),
  title: z.string(),
  htmlTitle: z.string(),
  link: z.string(),
  displayLink: z.string(),
  snippet: z.string(),
  htmlSnippet: z.string(),
  formattedUrl: z.string(),
  htmlFormattedUrl: z.string(),
  pagemap: pageMapSchema,
  mime: z.string().optional(),
  fileFormat: z.string().optional(),
});

// Schema for request and nextPage objects (simplified as they're just marked as [Object] in the JSON)
const queryObjectSchema = z.array(z.unknown());

// Schema for queries
const queriesSchema = z.object({
  request: queryObjectSchema,
  nextPage: queryObjectSchema,
});

// Schema for search information
const searchInformationSchema = z.object({
  searchTime: z.number(),
  formattedSearchTime: z.string(),
  totalResults: z.string(),
  formattedTotalResults: z.string(),
});

// Main schema for the entire custom search response
const customSearchSchema = z.object({
  kind: z.string(),
  url: urlSchema,
  queries: queriesSchema,
  context: z.object({
    title: z.string(),
  }),
  searchInformation: searchInformationSchema,
  items: z.array(searchResultItemSchema),
});

export type CustomSearchResponse = z.infer<typeof customSearchSchema>;

export default customSearchSchema;
