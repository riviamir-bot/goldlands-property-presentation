import { useCallback, useEffect, useRef, useState, type PointerEvent as ReactPointerEvent } from "react";
import { Minus, Plus, RotateCcw } from "lucide-react";
import { useI18n } from "../i18n/LanguageContext";
import { IDENTITY, panBy, toggleZoom, zoomAt, type View } from "../utils/zoom";

interface ZoomableImageProps {
  src: string;
  alt: string;
  className?: string;
}

type Point = { x: number; y: number };

/** An image that zooms with the wheel, double click or pinch, and pans by dragging when zoomed. */
export function ZoomableImage({ src, alt, className }: ZoomableImageProps) {
  const { t } = useI18n();
  const frameRef = useRef<HTMLDivElement>(null);
  const [view, setView] = useState<View>(IDENTITY);
  const pointers = useRef(new Map<number, Point>());
  const lastPinch = useRef<{ distance: number; center: Point } | null>(null);
  const lastDrag = useRef<Point | null>(null);

  useEffect(() => setView(IDENTITY), [src]);

  const size = () => {
    const rect = frameRef.current?.getBoundingClientRect();
    return { width: rect?.width ?? 1, height: rect?.height ?? 1 };
  };
  const fromCentre = (clientX: number, clientY: number): Point => {
    const rect = frameRef.current?.getBoundingClientRect();
    if (!rect) return { x: 0, y: 0 };
    return { x: clientX - rect.left - rect.width / 2, y: clientY - rect.top - rect.height / 2 };
  };

  // React's onWheel is passive, so preventDefault needs a native listener.
  useEffect(() => {
    const frame = frameRef.current;
    if (!frame) return undefined;
    const onWheel = (event: WheelEvent) => {
      event.preventDefault();
      const factor = Math.exp(-event.deltaY * 0.0015);
      setView((current) => zoomAt(current, factor, fromCentre(event.clientX, event.clientY), size()));
    };
    frame.addEventListener("wheel", onWheel, { passive: false });
    return () => frame.removeEventListener("wheel", onWheel);
  }, []);

  const onPointerDown = (event: ReactPointerEvent<HTMLDivElement>) => {
    event.currentTarget.setPointerCapture(event.pointerId);
    pointers.current.set(event.pointerId, { x: event.clientX, y: event.clientY });
    lastDrag.current = { x: event.clientX, y: event.clientY };
    lastPinch.current = null;
  };

  const onPointerMove = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (!pointers.current.has(event.pointerId)) return;
    pointers.current.set(event.pointerId, { x: event.clientX, y: event.clientY });
    const active = Array.from(pointers.current.values());

    if (active.length >= 2) {
      const [a, b] = active;
      const distance = Math.hypot(a.x - b.x, a.y - b.y);
      const center = fromCentre((a.x + b.x) / 2, (a.y + b.y) / 2);
      const previous = lastPinch.current;
      if (previous && previous.distance > 0) {
        setView((current) => {
          const zoomed = zoomAt(current, distance / previous.distance, center, size());
          return panBy(zoomed, center.x - previous.center.x, center.y - previous.center.y, size());
        });
      }
      lastPinch.current = { distance, center };
      return;
    }

    const last = lastDrag.current;
    if (last) setView((current) => panBy(current, event.clientX - last.x, event.clientY - last.y, size()));
    lastDrag.current = { x: event.clientX, y: event.clientY };
  };

  const onPointerUp = (event: ReactPointerEvent<HTMLDivElement>) => {
    pointers.current.delete(event.pointerId);
    lastPinch.current = null;
    const remaining = Array.from(pointers.current.values())[0];
    lastDrag.current = remaining ?? null;
  };

  const zoomBy = useCallback((factor: number) => setView((current) => zoomAt(current, factor, { x: 0, y: 0 }, size())), []);

  return (
    <div className={["zoomable", view.scale > 1 ? "zoomable--zoomed" : "", className ?? ""].join(" ")}>
      <div
        ref={frameRef}
        className="zoomable__frame"
        onDoubleClick={(event) => setView((current) => toggleZoom(current, fromCentre(event.clientX, event.clientY), size()))}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
      >
        <img
          src={src}
          alt={alt}
          draggable={false}
          style={{ transform: `translate(${view.x}px, ${view.y}px) scale(${view.scale})` }}
        />
      </div>
      <div className="zoomable__controls">
        <button type="button" onClick={() => zoomBy(1.5)} aria-label={t("gallery.zoomIn")} title={t("gallery.zoomIn")}>
          <Plus size={18} />
        </button>
        <button type="button" onClick={() => zoomBy(1 / 1.5)} aria-label={t("gallery.zoomOut")} title={t("gallery.zoomOut")} disabled={view.scale <= 1}>
          <Minus size={18} />
        </button>
        <button type="button" onClick={() => setView(IDENTITY)} aria-label={t("gallery.resetZoom")} title={t("gallery.resetZoom")} disabled={view.scale <= 1}>
          <RotateCcw size={16} />
        </button>
      </div>
    </div>
  );
}
