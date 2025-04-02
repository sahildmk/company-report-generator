"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useMutation } from "@tanstack/react-query";
import { Loader2, LoaderCircle } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import {
  ResponseScheamWithSearchItems,
  responseSchemaWithSearchItems,
} from "../shared/report-response";
import { Report } from "./report";

export function GenerateReportPage() {
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
      <div className="flex flex-col gap-4 border p-4 rounded-xl w-lg">
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
      {isPending ? (
        <Loader2 className="animate-spin" />
      ) : reportData ? (
        <Report report={reportData} />
      ) : null}
    </div>
  );
}
