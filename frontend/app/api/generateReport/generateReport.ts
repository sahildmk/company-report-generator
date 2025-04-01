import puppeteer from "puppeteer";
import * as cheerio from "cheerio";
import { generateObject } from "ai";
import { google } from "@ai-sdk/google";
import customSearchSchema from "../../shared/customSearchResultSchema";
import { responseSchema } from "@/app/shared/reportResponse";

const SERVICE_URL = "https://www.googleapis.com/";

export const generateReport = async (url: string) => {
  console.log("> launching browser");
  const browser = await puppeteer.launch();
  const page = await browser.newPage();

  console.log(`> navigating to ${url}`);
  const result = await page.goto(url);

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

  const newsSerach = await searchCompanyNews(response.object.companyName, url);

  console.log(newsSerach);

  return {
    ...response.object,
    searchResults: newsSerach,
  };
};

const searchCompanyNews = async (companyName: string, url: string) => {
  console.log(`> searching for ${companyName} news`);

  const searchUrlWithUrl = getSearchUrl(
    SERVICE_URL,
    `latest ${companyName} news`
  );
  console.log(`> ${searchUrlWithUrl}`);

  const searchRes = await fetch(searchUrlWithUrl);

  const json = await searchRes.json();

  const searchResult = customSearchSchema.parse(json);

  return searchResult.items;
};

const getSearchUrl = (url: string, query: string) => {
  const searchUrl = new URL("/customsearch/v1", url);
  searchUrl.searchParams.append("q", query);
  searchUrl.searchParams.append(
    "key",
    process.env.GOOGLE_CUSTOM_SEARCH_API_KEY!
  );
  searchUrl.searchParams.append("cx", process.env.GOOGLE_CUSTOM_SEARCH_CSE_ID!);
  searchUrl.searchParams.append("num", "10");

  return searchUrl.toString();
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
