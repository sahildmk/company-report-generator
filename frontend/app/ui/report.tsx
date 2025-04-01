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
import { LoaderCircle } from "lucide-react";

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
    <div className="flex flex-col gap-2 w-md">
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
      {isPending ? null : (
        <div>
          {reportData?.companyName}
          <br />
          {reportData?.summary}
        </div>
      )}
    </div>
  );
}
