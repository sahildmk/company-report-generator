import { generateReport } from "./generate-report";

export async function POST(request: Request) {
  const data = await request.json();
  const result = await generateReport(data.url);

  return Response.json(result);
}
