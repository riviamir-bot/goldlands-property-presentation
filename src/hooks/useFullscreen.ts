import { useCallback, useEffect, useState } from "react";

/**
 * Full screen for a presentation element. Where the browser supports it the whole display is used;
 * elsewhere (iPhone) the element still fills the window through the `--fullscreen` CSS class.
 */
export function useFullscreen() {
  const [isFullscreen, setIsFullscreen] = useState(false);

  const exit = useCallback(() => {
    setIsFullscreen(false);
    if (document.fullscreenElement) void document.exitFullscreen?.().catch(() => undefined);
  }, []);

  const enter = useCallback(() => {
    setIsFullscreen(true);
    const root = document.documentElement;
    if (!document.fullscreenElement && root.requestFullscreen) void root.requestFullscreen().catch(() => undefined);
  }, []);

  useEffect(() => {
    if (!isFullscreen) return undefined;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") exit();
    };
    const onChange = () => {
      if (!document.fullscreenElement) setIsFullscreen(false);
    };
    window.addEventListener("keydown", onKey);
    document.addEventListener("fullscreenchange", onChange);
    document.body.classList.add("has-fullscreen-layer");
    return () => {
      window.removeEventListener("keydown", onKey);
      document.removeEventListener("fullscreenchange", onChange);
      document.body.classList.remove("has-fullscreen-layer");
    };
  }, [exit, isFullscreen]);

  return { isFullscreen, enter, exit, toggle: isFullscreen ? exit : enter };
}
