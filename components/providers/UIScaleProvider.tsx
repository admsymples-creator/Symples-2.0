"use client";

import React, { createContext, useContext, useEffect, useState, ReactNode } from "react";

type UIScale = 0.85 | 0.925 | 1 | 1.125;

interface UIContextType {
  scale: UIScale;
  setScale: (scale: UIScale) => void;
}

const UIContext = createContext<UIContextType | undefined>(undefined);

const STORAGE_KEY = "symples-ui-scale";

export function UIScaleProvider({ children }: { children: ReactNode }) {
  const [scale, setScaleState] = useState<UIScale>(1);

  useEffect(() => {
    const savedScale = localStorage.getItem(STORAGE_KEY);
    if (savedScale) {
      const parsed = parseFloat(savedScale) as UIScale;
      if ([0.85, 0.925, 1, 1.125].includes(parsed)) {
        setScaleState(parsed);
        document.documentElement.style.fontSize = `${parsed * 100}%`;
      }
    }
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
    throw new Error("useUI must be used within a UIScaleProvider");
  }
  return context;
}


