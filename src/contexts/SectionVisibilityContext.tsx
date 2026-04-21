import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, ReactNode } from 'react';
import { useSyncedPreference } from '@/contexts/PreferencesContext';

interface RegisteredSection {
  id: string;
  title: string;
}

interface SectionVisibilityContextType {
  pageKey: string;
  hiddenIds: string[];
  registered: RegisteredSection[];
  isHidden: (id: string) => boolean;
  hide: (id: string) => void;
  show: (id: string) => void;
  toggle: (id: string) => void;
  showAll: () => void;
  register: (id: string, title: string) => void;
  unregister: (id: string) => void;
}

const SectionVisibilityContext = createContext<SectionVisibilityContextType | undefined>(undefined);

export function SectionVisibilityProvider({
  pageKey,
  children,
}: {
  pageKey: string;
  children: ReactNode;
}) {
  const [hiddenIds, setHiddenIds] = useSyncedPreference<string[]>(`hidden.${pageKey}`, []);
  // We use ref + state so register() during render doesn't cause loops
  const registryRef = useRef<Map<string, string>>(new Map());
  const [registryVersion, setRegistryVersion] = useState(0);

  const register = useCallback((id: string, title: string) => {
    const existing = registryRef.current.get(id);
    if (existing !== title) {
      registryRef.current.set(id, title);
      // Schedule update outside of render
      queueMicrotask(() => setRegistryVersion(v => v + 1));
    }
  }, []);

  const unregister = useCallback((id: string) => {
    if (registryRef.current.has(id)) {
      registryRef.current.delete(id);
      queueMicrotask(() => setRegistryVersion(v => v + 1));
    }
  }, []);

  const hide = useCallback((id: string) => {
    setHiddenIds(prev => (prev.includes(id) ? prev : [...prev, id]));
  }, [setHiddenIds]);

  const show = useCallback((id: string) => {
    setHiddenIds(prev => prev.filter(x => x !== id));
  }, [setHiddenIds]);

  const toggle = useCallback((id: string) => {
    setHiddenIds(prev => (prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]));
  }, [setHiddenIds]);

  const showAll = useCallback(() => {
    setHiddenIds([]);
  }, [setHiddenIds]);

  const isHidden = useCallback((id: string) => hiddenIds.includes(id), [hiddenIds]);

  const registered = useMemo<RegisteredSection[]>(() => {
    void registryVersion;
    return Array.from(registryRef.current.entries()).map(([id, title]) => ({ id, title }));
  }, [registryVersion]);

  const value = useMemo<SectionVisibilityContextType>(() => ({
    pageKey,
    hiddenIds,
    registered,
    isHidden,
    hide,
    show,
    toggle,
    showAll,
    register,
    unregister,
  }), [pageKey, hiddenIds, registered, isHidden, hide, show, toggle, showAll, register, unregister]);

  return (
    <SectionVisibilityContext.Provider value={value}>
      {children}
    </SectionVisibilityContext.Provider>
  );
}

export function useSectionVisibility() {
  const ctx = useContext(SectionVisibilityContext);
  return ctx; // may be undefined — components should handle gracefully
}
