import puppeteer from "puppeteer";
import "dotenv/config";
import { config } from "dotenv";
import { z } from "zod";
import * as cheerio from "cheerio";
import { generateObject } from "ai";
import { google } from "@ai-sdk/google";

const SUBJECT_URL = "https://www.untilnow.com.au/";
const SERVICE_URL = "https://www.googleapis.com/";

const responseSchema = z.object({
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
});

const main = async () => {
  config();

  console.log("> launching browser");
  const browser = await puppeteer.launch();
  const page = await browser.newPage();

  console.log(`> navigating to ${SUBJECT_URL}`);
  const result = await page.goto(SUBJECT_URL);

  console.log(`> getting url text`);
  const urlText = await result?.text();

  const cleanUrlText = cleanWebpage(urlText ?? "");

  console.log(`> sending text to llm for summary`);
  const response = await generateObject({
    model: google("gemini-2.0-flash-exp"),
    schema: responseSchema,
    prompt: `
  <task>
  You are an expert information extractor. Given the following content, extract all the information from the provided schema from this content.
  Also identify the core pillars of this company. These core pillars are similar to the values that this company uses for its direction.
  </task>
  <content>
  ${cleanUrlText}
  </content>
      `,
  });

  console.log(response.object, response.usage.promptTokens);

  const newsSerach = await searchCompanyNews(response.object.companyName);

  console.log(newsSerach);
};

const searchCompanyNews = async (companyName: string) => {
  const searchUrl = new URL("/customsearch/v1", SERVICE_URL);
  searchUrl.searchParams.append("q", `news about company ${companyName}`);
  searchUrl.searchParams.append(
    "key",
    process.env.GOOGLE_CUSTOM_SEARCH_API_KEY!
  );
  searchUrl.searchParams.append("cx", process.env.GOOGLE_CUSTOM_SEARCH_CSE_ID!);
  searchUrl.searchParams.append("num", "10");

  console.log("> searching for until now news");
  console.log(`> ${searchUrl.toString()}`);

  const res = await fetch(searchUrl.toString());

  if (!res.ok) {
    throw new Error(`Search request failed with status: ${res.statusText}`);
  }

  const results = await res.json();

  return results;
};

/**
 * Cleans a scraped HTML page by removing unnecessary elements
 * @param {string} text - Path to the scraped HTML file
 * @param {Object} options - Optional configuration
 * @param {boolean} options.removeStyles - Whether to remove style tags and attributes (default: true)
 * @param {boolean} options.removeScripts - Whether to remove script tags (default: true)
 * @param {boolean} options.removeComments - Whether to remove HTML comments (default: true)
 * @param {boolean} options.removeInlineEvents - Whether to remove inline event handlers (default: true)
 * @param {boolean} options.removeNonContentAttributes - Whether to remove attributes not relevant to content (default: true)
 */
function cleanWebpage(text: string) {
  try {
    // Load HTML into cheerio
    const $ = cheerio.load(text);

    // Remove style tags and inline styles
    $("style").remove();
    $('link[rel="stylesheet"]').remove();
    $("*[style]").removeAttr("style");
    $("*").removeAttr("class");

    // Remove script tags
    $("script").remove();
    $("noscript").remove();

    // Remove HTML comments
    $("*")
      .contents()
      .each(function () {
        if (this.type === "comment") {
          $(this).remove();
        }
      });

    // Remove inline event handlers (onclick, onload, etc.)
    $("*").each(function () {
      const el = $(this);
      const attrs = el.attr();

      if (attrs) {
        Object.keys(attrs).forEach((attr) => {
          if (attr.startsWith("on")) {
            el.removeAttr(attr);
          }
        });
      }
    });

    // Remove non-content related attributes
    const preserveAttributes = ["href", "src", "alt", "title"];

    $("*").each(function () {
      const el = $(this);
      const attrs = el.attr();

      if (attrs) {
        Object.keys(attrs).forEach((attr) => {
          if (
            !preserveAttributes.includes(attr) &&
            !attr.startsWith("data-") &&
            attr !== "id"
          ) {
            el.removeAttr(attr);
          }
        });
      }
    });

    // Process text nodes to remove excessive whitespace
    $("*")
      .contents()
      .each(function () {
        if (this.type === "text") {
          let text = $(this).text();

          // Replace multiple spaces, tabs with a single space
          text = text.replace(/\s+/g, " ");

          // Remove newlines if specified
          text = text.replace(/\n/g, " ");

          // Trim leading/trailing spaces
          text = text.trim();

          // Update the text node
          if (this.data !== text) {
            $(this).replaceWith(text);
          }
        }
      });

    // Get the HTML content
    let cleanedHtml = $.html();

    // Additional string-level minification if needed
    // Remove whitespace between HTML tags
    cleanedHtml = cleanedHtml.replace(/>\s+</g, "><");

    // Remove leading/trailing whitespace from lines
    cleanedHtml = cleanedHtml.replace(/^\s+|\s+$/gm, "");

    // Remove empty lines if not preserving newlines
    cleanedHtml = cleanedHtml.replace(/\n+/g, "");

    return cleanedHtml;
  } catch (error) {
    console.error("Error cleaning webpage:", error);
    return null;
  }
}

await main();

process.exit();
