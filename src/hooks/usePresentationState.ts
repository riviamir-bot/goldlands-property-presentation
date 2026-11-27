import { useCallback, useEffect, useState } from "react";
import { MAX_COMPARE } from "../screens/ApartmentsScreen";

/** Meeting state for one project: apartments chosen for the client, and the comparison. */
export function usePresentationState(projectId: string) {
  const [selection, setSelection] = useState<Set<string>>(() => new Set());
  const [compare, setCompare] = useState<string[]>([]);

  useEffect(() => {
    setSelection(new Set());
    setCompare([]);
  }, [projectId]);

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
    /** Prices are always shown in the meeting. */
    showPrices: true,
    selection,
    toggleSelection,
    clearSelection: useCallback(() => setSelection(new Set()), []),
    compare,
    toggleCompare,
    clearCompare: useCallback(() => setCompare([]), []),
  };
}
