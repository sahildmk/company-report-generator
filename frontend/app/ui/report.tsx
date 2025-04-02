"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useMutation } from "@tanstack/react-query";
import { useState } from "react";
import {
  ResponseScheamWithSearchItems,
  responseSchemaWithSearchItems,
} from "../shared/reportResponse";
import { toast } from "sonner";
import { ExternalLink, Loader2, LoaderCircle } from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export function Report() {
  const [url, setUrl] = useState("");
  const [reportData, setReportData] = useState<ResponseScheamWithSearchItems>();

  const { mutate, isPending } = useMutation({
    mutationFn: async () => {
      const res = await fetch("api/generateReport", {
        method: "POST",
        body: JSON.stringify({
          url,
        }),
      });

      return res.json();
    },
    onSuccess(data) {
      console.log(data);
      const parsedDataResult = responseSchemaWithSearchItems.safeParse(data);
      if (parsedDataResult.success) {
        setReportData(parsedDataResult.data);
      } else {
        console.error(parsedDataResult.error);
      }
    },
  });

  return (
    <div className="w-full p-4 flex items-center flex-col gap-4">
      <div className="flex flex-col gap-2 border p-4 rounded-xl w-lg">
        <Input
          placeholder="Enter Company URL"
          onChange={(e) => setUrl(e.target.value)}
        />
        <Button
          onClick={() => {
            toast(<div>Generating Report</div>, {
              icon: <LoaderCircle className="size-4 animate-spin" />,
            });
            mutate();
          }}
        >
          Generate Report
        </Button>
      </div>
      {reportData && !isPending ? (
        <div className="grid grid-cols-4 w-4xl gap-4">
          <div className="col-span-4">
            <Card className="">
              <CardHeader>
                <CardTitle className="text-xl">
                  {reportData.companyName}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p>{reportData.summary}</p>
              </CardContent>
            </Card>
          </div>

          <div className="col-span-1">
            <Card className="">
              <CardHeader>
                <CardTitle>Socials</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {reportData.socials.map((social) => (
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
                These are the pillars and values that drive the direction and
                work done by this company
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {reportData.corePillars.map((pillar) => (
                  <div className="bg-stone-50 p-4 rounded-lg flex flex-col gap-2">
                    <div className="font-medium">{pillar.name}</div>
                    <div className="text-sm">{pillar.outline}</div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      ) : (
        <Loader2 className="animate-spin" />
      )}
    </div>
  );
}
