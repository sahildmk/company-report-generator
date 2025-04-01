"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useMutation } from "@tanstack/react-query";
import { useState } from "react";
import {
  ResponseScheamWithSearchItems,
  responseSchemaWithSearchItems,
} from "../shared/reportResponse";

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
  });

  return (
    <div className="flex flex-col gap-2 w-md">
      <Input
        placeholder="Enter Company URL"
        onChange={(e) => setUrl(e.target.value)}
      />
      <Button
        onClick={() => {
          mutate(undefined, {
            onSuccess(data) {
              console.log(data);
              setReportData(responseSchemaWithSearchItems.parse(data));
            },
          });
        }}
      >
        Generate Report
      </Button>
      {isPending ? (
        "Loading..."
      ) : (
        <div>
          {reportData?.companyName}
          <br />
          {reportData?.summary}
        </div>
      )}
    </div>
  );
}
