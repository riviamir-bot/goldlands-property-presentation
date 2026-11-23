import { useEffect, useState } from "react";
import { ZoomableImage } from "./ZoomableImage";
import { useI18n } from "../i18n/LanguageContext";
import { pdfRenderScale } from "../utils/plans";

type State = { status: "loading" } | { status: "ready"; src: string } | { status: "failed" };

/**
 * Draws the first page of a PDF plan as a sharp image, so it zooms like a rendering
 * instead of opening in the browser's PDF viewer (often Adobe on Windows).
 * Falls back to the browser viewer only if drawing fails.
 */
export function PdfPlanImage({ url, alt }: { url: string; alt: string }) {
  const { t } = useI18n();
  const [state, setState] = useState<State>({ status: "loading" });

  useEffect(() => {
    let cancelled = false;
    let objectUrl = "";
    setState({ status: "loading" });

    (async () => {
      const pdfjs = await import("pdfjs-dist");
      const worker = await import("pdfjs-dist/build/pdf.worker.min.mjs?url");
      pdfjs.GlobalWorkerOptions.workerSrc = worker.default;
      const doc = await pdfjs.getDocument({ url }).promise;
      try {
        const page = await doc.getPage(1);
        const base = page.getViewport({ scale: 1 });
        const viewport = page.getViewport({ scale: pdfRenderScale(base.width) });
        const canvas = document.createElement("canvas");
        canvas.width = Math.floor(viewport.width);
        canvas.height = Math.floor(viewport.height);
        const context = canvas.getContext("2d");
        if (!context) throw new Error("no canvas");
        context.fillStyle = "#ffffff";
        context.fillRect(0, 0, canvas.width, canvas.height);
        // "print" draws without waiting for animation frames, so it also finishes in a background tab.
        await page.render({ canvasContext: context, viewport, intent: "print" }).promise;
        const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/png"));
        if (!blob) throw new Error("no image");
        objectUrl = URL.createObjectURL(blob);
        if (!cancelled) setState({ status: "ready", src: objectUrl });
      } finally {
        void doc.destroy();
      }
    })().catch(() => {
      if (!cancelled) setState({ status: "failed" });
    });

    return () => {
      cancelled = true;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [url]);

  if (state.status === "ready") return <ZoomableImage src={state.src} alt={alt} />;
  if (state.status === "failed") return <iframe src={`${url}#view=FitH`} title={alt} />;
  return <div className="plan-viewer__loading">{t("plan.loading")}</div>;
}
