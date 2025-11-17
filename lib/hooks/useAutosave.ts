'use client';

import { useEffect, useRef, useState } from 'react';
import type { AutosaveData, AutosaveKey } from '@/types';

const AUTOSAVE_INTERVAL = 30000; // 30 seconds
const AUTOSAVE_EXPIRY = 24 * 60 * 60 * 1000; // 24 hours

function getAutosaveKey(key: AutosaveKey): string {
  return `autosave:${key.project}:${key.language}:${key.filename}`;
}

function generateFileHash(content: string): string {
  // Simple hash function for content comparison
  let hash = 0;
  for (let i = 0; i < content.length; i++) {
    const char = content.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash = hash & hash; // Convert to 32-bit integer
  }
  return hash.toString(36);
}

export function saveToLocalStorage(key: AutosaveKey, content: string): void {
  try {
    const data: AutosaveData = {
      content,
      timestamp: new Date().toISOString(),
      fileHash: generateFileHash(content),
    };

    localStorage.setItem(getAutosaveKey(key), JSON.stringify(data));
  } catch (error) {
    console.error('Failed to save to localStorage:', error);
  }
}

export function loadFromLocalStorage(key: AutosaveKey): AutosaveData | null {
  try {
    const stored = localStorage.getItem(getAutosaveKey(key));
    if (!stored) return null;

    const data: AutosaveData = JSON.parse(stored);

    // Check if expired
    const age = Date.now() - new Date(data.timestamp).getTime();
    if (age > AUTOSAVE_EXPIRY) {
      clearLocalStorage(key);
      return null;
    }

    return data;
  } catch (error) {
    console.error('Failed to load from localStorage:', error);
    return null;
  }
}

export function clearLocalStorage(key: AutosaveKey): void {
  try {
    localStorage.removeItem(getAutosaveKey(key));
  } catch (error) {
    console.error('Failed to clear localStorage:', error);
  }
}

export function hasNewerLocalVersion(
  key: AutosaveKey,
  serverContent: string,
  serverTimestamp?: string
): boolean {
  const saved = loadFromLocalStorage(key);
  if (!saved) return false;

  // If server has no timestamp, local version is newer
  if (!serverTimestamp) return true;

  // Compare timestamps
  const localTime = new Date(saved.timestamp).getTime();
  const serverTime = new Date(serverTimestamp).getTime();

  return localTime > serverTime;
}

export function useAutosave(
  key: AutosaveKey,
  content: string,
  enabled: boolean = true
) {
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [isDirty, setIsDirty] = useState(false);

  // Use refs to access latest values without recreating interval
  const contentRef = useRef(content);
  const keyRef = useRef(key);
  const lastSavedContentRef = useRef(content);
  const isSavingRef = useRef(false);

  // Update refs when values change
  useEffect(() => {
    contentRef.current = content;
    keyRef.current = key;
  }, [content, key]);

  // Track if content has changed
  useEffect(() => {
    if (enabled && content !== lastSavedContentRef.current) {
      setIsDirty(true);
    }
  }, [content, enabled]);

  // Set up autosave interval (only recreate when enabled changes)
  useEffect(() => {
    if (!enabled) {
      return;
    }

    const interval = setInterval(() => {
      // Use refs to access latest values
      const currentContent = contentRef.current;
      const currentKey = keyRef.current;

      // Only save if content has changed and we're not already saving
      if (
        currentContent !== lastSavedContentRef.current &&
        !isSavingRef.current
      ) {
        isSavingRef.current = true;

        try {
          saveToLocalStorage(currentKey, currentContent);
          lastSavedContentRef.current = currentContent;
          setLastSaved(new Date());
          setIsDirty(false);
        } catch (error) {
          console.error('Autosave failed:', error);
        } finally {
          isSavingRef.current = false;
        }
      }
    }, AUTOSAVE_INTERVAL);

    return () => clearInterval(interval);
  }, [enabled]); // Only recreate interval if enabled changes

  const manualSave = () => {
    if (isSavingRef.current) {
      console.warn('Save already in progress');
      return;
    }

    isSavingRef.current = true;

    try {
      saveToLocalStorage(keyRef.current, contentRef.current);
      lastSavedContentRef.current = contentRef.current;
      setLastSaved(new Date());
      setIsDirty(false);
    } catch (error) {
      console.error('Manual save failed:', error);
    } finally {
      isSavingRef.current = false;
    }
  };

  const clear = () => {
    clearLocalStorage(keyRef.current);
    lastSavedContentRef.current = contentRef.current;
    setLastSaved(null);
    setIsDirty(false);
  };

  return {
    lastSaved,
    isDirty,
    manualSave,
    clear,
  };
}
