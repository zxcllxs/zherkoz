import { InlineKeyboard, Keyboard } from "grammy";
import { KNOWLEDGE, KNOWLEDGE_STUB_LINK, isFilled, type KnowledgeEntry } from "@/content/knowledge";
import { BTN, T } from "./texts";

// callback_data
export const CB = {
  statusExample: "st:ex",
  statusRetry: "st:retry",
  menu: "menu",
  kbList: "kb:list",
  kbPrefix: "kb:",
} as const;

export function mainMenu() {
  return new Keyboard().text(BTN.status).text(BTN.knowledge).row().text(BTN.report).resized();
}

export function askTrackKeyboard() {
  return new InlineKeyboard().text(T.showExample, CB.statusExample);
}

export function notFoundKeyboard() {
  return new InlineKeyboard().text(T.retry, CB.statusRetry).text(T.toMenu, CB.menu);
}

export function knowledgeListKeyboard() {
  return InlineKeyboard.from(KNOWLEDGE.map((e) => [InlineKeyboard.text(e.title, CB.kbPrefix + e.id)]));
}

export function knowledgeEntryKeyboard(e: KnowledgeEntry) {
  const kb = new InlineKeyboard();
  const links = isFilled(e) ? e.links : [KNOWLEDGE_STUB_LINK];
  for (const l of links) kb.url(l.title, l.url).row();
  return kb.text(T.kbBack, CB.kbList);
}
