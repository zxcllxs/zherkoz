import { InlineKeyboard, Keyboard } from "grammy";
import { KNOWLEDGE, KNOWLEDGE_STUB_LINK, isFilled, localizeEntry, type KnowledgeLink } from "@/content/knowledge";
import { LANGS, LANG_BUTTONS, type Lang, type Texts } from "./texts";

// callback_data
export const CB = {
  langPrefix: "lang:",
  statusExample: "st:ex",
  statusRetry: "st:retry",
  menu: "menu",
  kbList: "kb:list",
  kbPrefix: "kb:",
  repHintPrefix: "rep:h:",
  repSend: "rep:send",
  repCancel: "rep:cancel",
} as const;

export function langKeyboard() {
  return InlineKeyboard.from([LANGS.map((l) => InlineKeyboard.text(LANG_BUTTONS[l], CB.langPrefix + l))]);
}

export function mainMenu(t: Texts) {
  return new Keyboard().text(t.btn.status).text(t.btn.knowledge).row().text(t.btn.report).resized();
}

export function askTrackKeyboard(t: Texts) {
  return new InlineKeyboard().text(t.showExample, CB.statusExample);
}

export function notFoundKeyboard(t: Texts) {
  return new InlineKeyboard().text(t.retry, CB.statusRetry).text(t.toMenu, CB.menu);
}

export function knowledgeListKeyboard(lang: Lang) {
  return InlineKeyboard.from(
    KNOWLEDGE.map((e) => [InlineKeyboard.text(localizeEntry(e, lang).title, CB.kbPrefix + e.id)]),
  );
}

export function knowledgeEntryKeyboard(t: Texts, e: { links: KnowledgeLink[]; steps: string[]; documents: string[]; timing: string }) {
  const kb = new InlineKeyboard();
  const links = isFilled(e) ? e.links : [KNOWLEDGE_STUB_LINK];
  for (const l of links) kb.url(l.title, l.url).row();
  return kb.text(t.kbBack, CB.kbList);
}

export function locationKeyboard(t: Texts) {
  return new Keyboard().requestLocation(t.btn.sendLocation).row().text(t.btn.cancel).resized();
}

export function cancelKeyboard(t: Texts) {
  return new Keyboard().text(t.btn.cancel).resized();
}

export function hintsKeyboard(t: Texts) {
  return InlineKeyboard.from(t.hints.map((h, i) => [InlineKeyboard.text(h, CB.repHintPrefix + i)]));
}

export function confirmKeyboard(t: Texts) {
  return new InlineKeyboard().text(t.repSend, CB.repSend).text(t.repCancelBtn, CB.repCancel);
}
