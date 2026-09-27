import { KNOWLEDGE, KNOWLEDGE_STUB_TEXT, isFilled, knowledgeFooter, localizeEntry } from "@/content/knowledge";
import { tx, type BotContext } from "../context";
import { knowledgeEntryKeyboard, knowledgeListKeyboard } from "../keyboards";
import { escapeHtml, type Lang, type Texts } from "../texts";

type Entry = ReturnType<typeof localizeEntry>;

function formatEntry(t: Texts, lang: Lang, e: Entry): string {
  const out = [`<b>${escapeHtml(e.title)}</b>`];
  if (!isFilled(e)) {
    out.push("", KNOWLEDGE_STUB_TEXT);
    return out.join("\n");
  }
  if (e.steps.length) {
    out.push("", `<b>${t.kbSteps}</b>`, ...e.steps.map((s, i) => `${i + 1}. ${escapeHtml(s)}`));
  }
  if (e.documents.length) {
    out.push("", `<b>${t.kbDocs}</b>`, ...e.documents.map((d) => `• ${escapeHtml(d)}`));
  }
  if (e.timing.trim()) out.push("", `<b>${t.kbTiming}</b>`, escapeHtml(e.timing));
  if (e.notes.length) {
    out.push("", `<b>${t.kbNotes}</b>`, ...e.notes.map((n) => `• ${escapeHtml(n)}`));
  }
  if (e.links.length) out.push("", `<b>${t.kbWhere}</b>: ${t.kbWhereButtons}`);
  if (e.checkedAt) out.push("", `<i>${escapeHtml(knowledgeFooter(e.checkedAt, lang))}</i>`);
  return out.join("\n");
}

export async function showKnowledgeList(ctx: BotContext, edit = false) {
  const t = tx(ctx);
  const opts = { reply_markup: knowledgeListKeyboard(ctx.lang) };
  if (edit) {
    await ctx.editMessageText(t.kbChoose, opts).catch(() => ctx.reply(t.kbChoose, opts));
  } else {
    await ctx.reply(t.kbChoose, opts);
  }
}

export async function showKnowledgeEntry(ctx: BotContext, id: string) {
  const t = tx(ctx);
  const found = KNOWLEDGE.find((k) => k.id === id);
  if (!found) return showKnowledgeList(ctx, true);
  const entry = localizeEntry(found, ctx.lang);
  const opts = {
    parse_mode: "HTML" as const,
    reply_markup: knowledgeEntryKeyboard(t, entry),
    link_preview_options: { is_disabled: true },
  };
  const text = formatEntry(t, ctx.lang, entry);
  await ctx.editMessageText(text, opts).catch(() => ctx.reply(text, opts));
}
