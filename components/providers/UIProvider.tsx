"use client";

import React, { createContext, useContext, useEffect, useState } from "react";

type UIScale = 0.875 | 1 | 1.125;

interface UIContextType {
  scale: UIScale;
  setScale: (scale: UIScale) => void;
}

const UIContext = createContext<UIContextType | undefined>(undefined);

const STORAGE_KEY = "symples-ui-scale";

export function UIProvider({ children }: { children: React.ReactNode }) {
  const [scale, setScaleState] = useState<UIScale>(1);
  const [isInitialized, setIsInitialized] = useState(false);

  useEffect(() => {
    // Initialize from localStorage on client mount
    const savedScale = localStorage.getItem(STORAGE_KEY);
    if (savedScale) {
      const parsed = parseFloat(savedScale) as UIScale;
      if ([0.875, 1, 1.125].includes(parsed)) {
        setScaleState(parsed);
        document.documentElement.style.fontSize = `${parsed * 100}%`;
      }
    }
    setIsInitialized(true);
  }, []);

  const setScale = (newScale: UIScale) => {
    setScaleState(newScale);
    localStorage.setItem(STORAGE_KEY, newScale.toString());
    document.documentElement.style.fontSize = `${newScale * 100}%`;
  };

  return (
    <UIContext.Provider value={{ scale, setScale }}>
      <script
        dangerouslySetInnerHTML={{
          __html: `
            (function() {
              try {
                var saved = localStorage.getItem('${STORAGE_KEY}');
                if (saved) {
                  var scale = parseFloat(saved);
                  document.documentElement.style.fontSize = (scale * 100) + '%';
                }
              } catch (e) {}
            })();
          `,
        }}
      />
      {children}
    </UIContext.Provider>
  );
}

export function useUI() {
  const context = useContext(UIContext);
  if (context === undefined) {
    throw new Error("useUI must be used within a UIProvider");
  }
  return context;
}

