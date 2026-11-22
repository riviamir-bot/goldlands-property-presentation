import { useCallback, useEffect, useState } from "react";
import { MAX_COMPARE } from "../screens/ApartmentsScreen";

const PRICES_KEY = "goldlands-presentation-show-prices";

function readShowPrices() {
  try {
    return window.localStorage.getItem(PRICES_KEY) !== "false";
  } catch {
    return true;
  }
}

/** Meeting state for one project: price visibility, apartments chosen for the client, and the comparison. */
export function usePresentationState(projectId: string) {
  const [showPrices, setShowPrices] = useState(readShowPrices);
  const [selection, setSelection] = useState<Set<string>>(() => new Set());
  const [compare, setCompare] = useState<string[]>([]);

  useEffect(() => {
    setSelection(new Set());
    setCompare([]);
  }, [projectId]);

  const togglePrices = useCallback(() => {
    setShowPrices((current) => {
      const next = !current;
      try {
        window.localStorage.setItem(PRICES_KEY, String(next));
      } catch {
        // not persisted
      }
      return next;
    });
  }, []);

  const toggleSelection = useCallback((apartmentId: string) => {
    setSelection((current) => {
      const next = new Set(current);
      if (next.has(apartmentId)) next.delete(apartmentId);
      else next.add(apartmentId);
      return next;
    });
  }, []);

  const toggleCompare = useCallback((apartmentId: string) => {
    setCompare((current) => {
      if (current.includes(apartmentId)) return current.filter((id) => id !== apartmentId);
      return current.length >= MAX_COMPARE ? current : [...current, apartmentId];
    });
  }, []);

  return {
    showPrices,
    togglePrices,
    selection,
    toggleSelection,
    clearSelection: useCallback(() => setSelection(new Set()), []),
    compare,
    toggleCompare,
    clearCompare: useCallback(() => setCompare([]), []),
  };
}
