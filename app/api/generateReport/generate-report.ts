import puppeteer from "puppeteer";
import * as cheerio from "cheerio";
import { generateObject } from "ai";
import { google } from "@ai-sdk/google";
import customSearchSchema from "../../shared/custom-search-result-schema";
import { responseSchema } from "@/app/shared/report-response";
import { z } from "zod";

const SERVICE_URL = "https://www.googleapis.com/";

export const maxDuration = 30;

export const generateReport = async (url: string) => {
  console.log("> launching browser");
  const browser = await puppeteer.launch();

  const page = await browser.newPage();
  await page.setViewport({ width: 1920, height: 1080 });

  console.log(`> navigating to ${url}`);
  const result = await page.goto(url);

  console.log(`> getting url text`);
  const urlText = await result?.text();

  const extractDataResult = extractDataFromWebpage(urlText ?? "", url);

  if (!extractDataResult) {
    throw new Error("Could not sanitize page");
  }

  const { cleanedHtml, subpages } = extractDataResult;

  console.log(`> sending text to llm for summary`);
  const summaryResponse = await generateObject({
    model: google("gemini-2.0-flash-exp"),
    schema: responseSchema,
    prompt: `
  <task>
  You are an expert information extractor. Given the following content, extract all the information from the provided schema from this content.
  Also identify the core pillars of this company. These core pillars are similar to the values that this company uses for its direction.
  </task>
  <content>
  ${cleanedHtml}
  </content>
      `,
  });

  // console.log(`> identifiy next webpages to search`);
  // const subpagesResponse = await generateObject({
  //   model: google("gemini-2.0-flash-exp"),
  //   schema: responseSchema,
  //   prompt: `
  // <task>
  // You are an expert at understanding the information on a website. Given the following list of urls and titles, give me the top 3 pages that are most
  // likely to contain the requried information about the company.
  // </task>
  // <content>
  // ${cleanedHtml}
  // </content>
  //     `,
  // });

  console.log(`> searching for ${summaryResponse.object.companyName} news`);
  const newsSerach = await searchCompanyNews(
    summaryResponse.object.companyName,
    url
  );

  return {
    ...summaryResponse.object,
    searchResults: newsSerach,
  };
};

const pageSchema = z.object({
  title: z.string(),
  url: z.string(),
});

const searchCompanyNews = async (companyName: string, url: string) => {
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

function extractDataFromWebpage(text: string, baseUrl: string) {
  try {
    // Load HTML into cheerio
    const webpage = cheerio.load(text);

    cleanWebpage(webpage);

    const subpages = findSubLinks(webpage, baseUrl);

    // Get the HTML content
    let cleanedHtml = webpage.html();

    // Additional string-level minification if needed
    // Remove whitespace between HTML tags
    cleanedHtml = cleanedHtml.replace(/>\s+</g, "><");

    // Remove leading/trailing whitespace from lines
    cleanedHtml = cleanedHtml.replace(/^\s+|\s+$/gm, "");

    // Remove empty lines if not preserving newlines
    cleanedHtml = cleanedHtml.replace(/\n+/g, "");

    return {
      cleanedHtml,
      subpages,
    };
  } catch (error) {
    console.error("Error cleaning webpage:", error);
    return null;
  }
}

function cleanWebpage(webpage: cheerio.CheerioAPI) {
  webpage("style").remove();
  webpage('link[rel="stylesheet"]').remove();
  webpage("*[style]").removeAttr("style");
  webpage("*").removeAttr("class");

  // Remove script tags
  webpage("script").remove();
  webpage("noscript").remove();

  // Remove HTML comments
  webpage("*")
    .contents()
    .each(function () {
      if (this.type === "comment") {
        webpage(this).remove();
      }
    });

  // Remove inline event handlers (onclick, onload, etc.)
  webpage("*").each(function () {
    const el = webpage(this);
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

  webpage("*").each(function () {
    const el = webpage(this);
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
  webpage("*")
    .contents()
    .each(function () {
      if (this.type === "text") {
        let text = webpage(this).text();

        // Replace multiple spaces, tabs with a single space
        text = text.replace(/\s+/g, " ");

        // Remove newlines if specified
        text = text.replace(/\n/g, " ");

        // Trim leading/trailing spaces
        text = text.trim();

        // Update the text node
        if (this.data !== text) {
          webpage(this).replaceWith(text);
        }
      }
    });
}

function findSubLinks(webpage: cheerio.CheerioAPI, baseUrl: string) {
  const links: { text: string; href: string }[] = [];
  webpage("a").each((i, element) => {
    const href = webpage(element).attr("href");
    const text = webpage(element).text().trim();

    if (href) {
      try {
        // Resolve relative URLs to absolute URLs
        const absoluteUrl = new URL(href, baseUrl).href;
        links.push({
          text: text,
          href: absoluteUrl,
        });
      } catch (error) {
        console.warn(`Invalid URL: ${href}`);
      }
    }
  });

  // Process links to filter only subpages at one level depth
  const baseUrlObj = new URL(baseUrl);
  const subpages = links
    .filter((link) => {
      try {
        const linkUrl = new URL(link.href);

        // Ensure it's from the same domain
        if (linkUrl.hostname !== baseUrlObj.hostname) {
          return false;
        }

        // Extract the path parts
        const basePath = baseUrlObj.pathname.split("/").filter(Boolean);
        const linkPath = linkUrl.pathname.split("/").filter(Boolean);

        // Check if it's one level deeper than the base URL
        // For root domain, we want paths with just one segment
        if (basePath.length === 0) {
          return linkPath.length === 1;
        } else {
          // For non-root pages, we want exactly one more segment than the base
          return (
            linkPath.length === basePath.length + 1 &&
            linkPath.slice(0, basePath.length).join("/") === basePath.join("/")
          );
        }
      } catch (err) {
        console.error(`Error processing link: ${link.href}`, err);
        return false;
      }
    })
    .map((link) => {
      return {
        title: link.text,
        url: link.href,
      };
    });

  // Remove duplicates
  const uniqueSubpages = Array.from(
    new Map(subpages.map((page) => [page.url, page])).values()
  );

  console.log(`Found ${uniqueSubpages.length} unique subpages:`);
  console.table(uniqueSubpages);

  return uniqueSubpages;
}
