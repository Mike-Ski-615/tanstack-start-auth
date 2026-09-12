import { useHotkeys } from "react-hotkeys-hook";
import { createPreference } from "#provider/preference-provider";

type Theme = "dark" | "light";

type ThemeProviderProps = {
  children: React.ReactNode;
};

function applyTheme(theme: Theme) {
  const root = document.documentElement;
  root.classList.remove("light", "dark");
  root.classList.add(theme);
  root.style.colorScheme = theme;
}

const THEME_PRE_PAINT =
  "var r=document.documentElement;r.classList.remove('light','dark');r.classList.add(v);r.style.colorScheme=v;";

const theme = createPreference<Theme>({
  key: "theme",
  attribute: "data-theme",
  values: ["light", "dark"],
  fallback: "light",
  apply: applyTheme,
  prePaint: THEME_PRE_PAINT,
});

function ThemeHotkey({ children }: { children: React.ReactNode }) {
  const { value, setValue } = theme.usePreference();

  useHotkeys(
    "ctrl+j",
    () => {
      setValue(value === "dark" ? "light" : "dark");
    },
    { preventDefault: true },
  );

  return <>{children}</>;
}

export function ThemeProvider({ children }: ThemeProviderProps) {
  return (
    <theme.Provider>
      <ThemeHotkey>{children}</ThemeHotkey>
    </theme.Provider>
  );
}

export function useTheme() {
  const { value, setValue } = theme.usePreference();
  return { theme: value, setTheme: setValue };
}
