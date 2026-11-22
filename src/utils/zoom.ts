/** Pan and zoom of an image inside a fixed frame. Offsets are measured from the frame centre, in screen pixels. */
export interface View {
  scale: number;
  x: number;
  y: number;
}

export interface Size {
  width: number;
  height: number;
}

export const IDENTITY: View = { scale: 1, x: 0, y: 0 };
export const MAX_SCALE = 5;

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

export function clampView(view: View, size: Size): View {
  const scale = clamp(view.scale, 1, MAX_SCALE);
  if (scale === 1) return { ...IDENTITY };
  const maxX = ((scale - 1) * size.width) / 2;
  const maxY = ((scale - 1) * size.height) / 2;
  return { scale, x: clamp(view.x, -maxX, maxX), y: clamp(view.y, -maxY, maxY) };
}

/** Multiply the scale by `factor`, keeping `point` (relative to the frame centre) over the same image spot. */
export function zoomAt(view: View, factor: number, point: { x: number; y: number }, size: Size): View {
  const scale = clamp(view.scale * factor, 1, MAX_SCALE);
  const ratio = scale / view.scale;
  return clampView(
    { scale, x: point.x - (point.x - view.x) * ratio, y: point.y - (point.y - view.y) * ratio },
    size,
  );
}

export function panBy(view: View, dx: number, dy: number, size: Size): View {
  return clampView({ ...view, x: view.x + dx, y: view.y + dy }, size);
}

export function toggleZoom(view: View, point: { x: number; y: number }, size: Size): View {
  return view.scale > 1 ? { ...IDENTITY } : zoomAt(view, 2, point, size);
}
