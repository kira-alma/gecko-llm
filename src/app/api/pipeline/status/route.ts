import { NextRequest } from "next/server";
import { getAnalysis } from "@/lib/db";
import { getPipelineEvents } from "../start/route";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const analysisId = request.nextUrl.searchParams.get("analysisId");

  if (!analysisId) {
    return new Response("analysisId required", { status: 400 });
  }

  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      let lastEventIndex = 0;
      let closed = false;

      const send = (data: string) => {
        if (closed) return;
        try {
          controller.enqueue(encoder.encode(`data: ${data}\n\n`));
        } catch {
          closed = true;
        }
      };

      const poll = () => {
        if (closed) return;

        const events = getPipelineEvents(analysisId);
        const analysis = getAnalysis(analysisId);

        // Send any new events
        while (lastEventIndex < events.length) {
          send(JSON.stringify(events[lastEventIndex]));
          lastEventIndex++;
        }

        // Check if we should close the stream
        if (
          analysis?.status === "completed" ||
          analysis?.status === "failed"
        ) {
          // Send a final status event if no events exist
          if (events.length === 0) {
            send(
              JSON.stringify({
                type: analysis.status === "completed" ? "complete" : "error",
                stage: "pipeline",
                message:
                  analysis.status === "completed"
                    ? "Analysis complete"
                    : analysis.errorMessage ?? "Pipeline failed",
                progress: analysis.status === "completed" ? 100 : -1,
                timestamp: new Date().toISOString(),
              })
            );
          }

          try {
            controller.close();
          } catch {
            // already closed
          }
          closed = true;
          return;
        }

        // Poll again
        setTimeout(poll, 1500);
      };

      // Start polling
      poll();

      // Safety timeout: close after 10 minutes
      setTimeout(() => {
        if (!closed) {
          closed = true;
          try {
            controller.close();
          } catch {
            // already closed
          }
        }
      }, 10 * 60 * 1000);
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  });
}
