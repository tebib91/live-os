'use client';

import type { FileSystemItem } from '@/app/actions/filesystem';
import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react';
import type { ClipboardState } from './types';

const STORAGE_KEY = 'liveos-file-clipboard';

interface FileClipboardContextValue {
  clipboard: ClipboardState;
  cut: (items: FileSystemItem[]) => void;
  copy: (items: FileSystemItem[]) => void;
  clear: () => void;
  hasContent: boolean;
}

const defaultClipboard: ClipboardState = {
  items: [],
  operation: null,
};

// Load from localStorage during initialization (client-side only)
function getInitialClipboard(): ClipboardState {
  if (typeof window === 'undefined') return defaultClipboard;
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      const parsed = JSON.parse(stored) as ClipboardState;
      if (parsed.items && parsed.operation) {
        return parsed;
      }
    }
  } catch {
    // Ignore localStorage errors
  }
  return defaultClipboard;
}

const FileClipboardContext = createContext<FileClipboardContextValue | null>(null);

export function FileClipboardProvider({ children }: { children: ReactNode }) {
  const [clipboard, setClipboard] = useState<ClipboardState>(getInitialClipboard);

  // Save to localStorage on change
  useEffect(() => {
    try {
      if (clipboard.operation) {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(clipboard));
      } else {
        localStorage.removeItem(STORAGE_KEY);
      }
    } catch {
      // Ignore localStorage errors
    }
  }, [clipboard]);

  const cut = useCallback((items: FileSystemItem[]) => {
    setClipboard({ items, operation: 'cut' });
  }, []);

  const copy = useCallback((items: FileSystemItem[]) => {
    setClipboard({ items, operation: 'copy' });
  }, []);

  const clear = useCallback(() => {
    setClipboard(defaultClipboard);
  }, []);

  const hasContent = clipboard.items.length > 0 && clipboard.operation !== null;

  return (
    <FileClipboardContext.Provider value={{ clipboard, cut, copy, clear, hasContent }}>
      {children}
    </FileClipboardContext.Provider>
  );
}

export function useFileClipboard(): FileClipboardContextValue {
  const context = useContext(FileClipboardContext);
  if (!context) {
    throw new Error('useFileClipboard must be used within a FileClipboardProvider');
  }
  return context;
}
