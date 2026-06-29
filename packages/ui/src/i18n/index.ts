import type { Locale } from "@dentalos/core/constants";
import en from "../../messages/en.json";
import fr from "../../messages/fr.json";

export type Dictionary = typeof en;

const dictionaries: Record<Locale, Dictionary> = {
  en,
  fr: fr as Dictionary,
};

export function getDictionary(locale: Locale): Dictionary {
  return dictionaries[locale] ?? en;
}
