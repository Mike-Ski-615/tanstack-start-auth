import { createContext, useCallback, useContext, useEffect, useState } from "react";
import { ScriptOnce } from "@tanstack/react-router";

export type PreferenceSpec<T extends string> = {
  key: string;
  attribute: string;
  values: readonly T[];
  fallback: T;
  apply: (value: T) => void;
  prePaint?: string;
};

export type PreferenceState<T extends string> = {
  value: T;
  setValue: (value: T) => void;
};

export function readPreference<T extends string>(spec: PreferenceSpec<T>): T {
  try {
    const stored = localStorage.getItem(spec.key);
    if (stored && (spec.values as readonly string[]).includes(stored)) return stored as T;
  } catch {}
  return spec.fallback;
}

export function createPreference<T extends string>(spec: PreferenceSpec<T>) {
  const Context = createContext<PreferenceState<T>>({
    value: spec.fallback,
    setValue: () => {},
  });

  const script = `(function(){var v;try{v=localStorage.getItem(${JSON.stringify(spec.key)})}catch(e){}if(${JSON.stringify(
    spec.values,
  )}.indexOf(v)<0){v=${JSON.stringify(spec.fallback)}}var d=document.documentElement;d.setAttribute(${JSON.stringify(
    spec.attribute,
  )},v);${spec.prePaint ?? ""}})();`;

  function Provider({ children }: { children: React.ReactNode }) {
    const [value, setValueState] = useState<T>(spec.fallback);

    useEffect(() => {
      const current = document.documentElement.getAttribute(spec.attribute);
      const stored = readPreference(spec);
      const next =
        current && (spec.values as readonly string[]).includes(current) ? (current as T) : stored;
      setValueState(next);
      spec.apply(next);
    }, []);

    const setValue = useCallback((next: T) => {
      setValueState(next);
      spec.apply(next);
      try {
        localStorage.setItem(spec.key, next);
      } catch {}
    }, []);

    return (
      <Context.Provider value={{ value, setValue }}>
        <ScriptOnce>{script}</ScriptOnce>
        {children}
      </Context.Provider>
    );
  }

  function usePreference() {
    return useContext(Context);
  }

  return { Provider, usePreference, spec };
}
