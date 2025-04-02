"use client";

import { ResponseScheamWithSearchItems } from "../shared/report-response";
import { ExternalLink } from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export function Report({ report }: { report: ResponseScheamWithSearchItems }) {
  const relevantNews = report.searchResults.filter((result) => {
    const url = new URL(result.link);
    return url.hostname
      .toLowerCase()
      .includes(report.companyName.toLowerCase());
  });

  const otherNews = report.searchResults.filter((result) => {
    const url = new URL(result.link);
    return !url.hostname
      .toLowerCase()
      .includes(report.companyName.toLowerCase());
  });

  const news = [...relevantNews, ...otherNews];

  return (
    <div className="grid grid-cols-4 w-4xl gap-4">
      <div className="col-span-4">
        <Card className="">
          <CardHeader>
            <CardTitle className="text-xl">{report.companyName}</CardTitle>
          </CardHeader>
          <CardContent>
            <p>{report.summary}</p>
          </CardContent>
        </Card>
      </div>

      <div className="col-span-1">
        <Card className="h-full">
          <CardHeader>
            <CardTitle>Socials</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {report.socials.map((social) => (
                <div
                  key={social.name}
                  className="flex bg-stone-50 hover:bg-stone-100 transition-all py-2 px-3 rounded-lg"
                >
                  <a
                    href={social.link}
                    target="_blank"
                    className="text-blue-500 hover:underline flex items-center gap-2 truncate"
                  >
                    <ExternalLink className="size-4 shrink-0" />
                    {social.name}
                  </a>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
      <Card className="col-span-3">
        <CardHeader>
          <CardTitle>Core Pillars</CardTitle>
          <CardDescription>
            These are the pillars and values that drive the direction and work
            done by this company
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {report.corePillars.map((pillar) => (
              <div
                key={pillar.name}
                className="bg-stone-50 p-4 rounded-lg flex flex-col gap-2"
              >
                <div className="font-medium">{pillar.name}</div>
                <div className="text-sm">{pillar.outline}</div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
      <div className="col-span-4">
        <Card className="">
          <CardHeader>
            <CardTitle>News</CardTitle>
            <CardDescription>
              News related to {report.companyName}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {news.map((result) => {
                return (
                  <div
                    key={result.title}
                    onClick={() => {
                      window.open(result.link, "_blank");
                    }}
                    className="relative hover:cursor-pointer bg-stone-50 p-4 rounded-lg flex gap-4 transition-all hover:scale-101 hover:bg-stone-100"
                  >
                    <div className="bg-stone-800 w-30 shrink-0 rounded-sm overflow-hidden">
                      <img
                        src={result.pagemap?.cse_image?.[0]?.src}
                        className="ratio object-cover rounded-sm h-full"
                      />
                    </div>
                    <div className="space-y-2">
                      <div className="font-medium">{result.title}</div>
                      <div className="text-sm">{result.snippet}</div>
                    </div>
                    <ExternalLink className="text-stone-500 absolute size-4 bottom-4 right-4" />
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
