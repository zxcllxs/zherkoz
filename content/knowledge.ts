// База знаний бота. Контент предоставляет пользователь (команда проекта).
// НЕ дописывать сюда факты о законах и процедурах РК без источника.
import type { ProcedureId } from "@/lib/types";

export interface KnowledgeLink {
  title: string;
  url: string;
}

export interface KnowledgeEntry {
  id: ProcedureId;
  title: string;
  steps: string[];
  documents: string[];
  timing: string;
  links: KnowledgeLink[];
  checkedAt: string; // дата проверки актуальности, ДД.ММ.ГГГГ
}

export const KNOWLEDGE_STUB_TEXT = "Раздел наполняется. Актуальная информация — на портале egov.kz";
export const KNOWLEDGE_STUB_LINK: KnowledgeLink = { title: "Портал egov.kz", url: "https://egov.kz" };

export const KNOWLEDGE: KnowledgeEntry[] = [
  {
    id: "izhs",
    title: "Участок под ИЖС",
    steps: [],
    documents: [],
    timing: "",
    links: [],
    checkedAt: "",
  },
  {
    id: "purpose_change",
    title: "Изменение целевого назначения",
    steps: [],
    documents: [],
    timing: "",
    links: [],
    checkedAt: "",
  },
  {
    id: "lease_extension",
    title: "Продление аренды",
    steps: [],
    documents: [],
    timing: "",
    links: [],
    checkedAt: "",
  },
];

export function isFilled(e: KnowledgeEntry): boolean {
  return e.steps.length > 0 || e.documents.length > 0 || e.timing.trim() !== "";
}
