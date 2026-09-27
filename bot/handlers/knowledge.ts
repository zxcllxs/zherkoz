import { KNOWLEDGE, KNOWLEDGE_STUB_TEXT, isFilled, type KnowledgeEntry } from "@/content/knowledge";
import { tx, type BotContext } from "../context";
import { knowledgeEntryKeyboard, knowledgeListKeyboard } from "../keyboards";
import { escapeHtml, type Texts } from "../texts";

// Контент базы знаний пока только на русском: для казахского — русский текст + пометка (t.kbRuOnly).
function formatEntry(t: Texts, e: KnowledgeEntry): string {
  const out = [`<b>${escapeHtml(e.title)}</b>`];
  if (!isFilled(e)) {
    out.push("", KNOWLEDGE_STUB_TEXT);
  } else {
    if (e.steps.length) {
      out.push("", `<b>${t.kbSteps}</b>`, ...e.steps.map((s, i) => `${i + 1}. ${escapeHtml(s)}`));
    }
    if (e.documents.length) {
      out.push("", `<b>${t.kbDocs}</b>`, ...e.documents.map((d) => `• ${escapeHtml(d)}`));
    }
    if (e.timing.trim()) out.push("", `<b>${t.kbTiming}</b>`, escapeHtml(e.timing));
    if (e.links.length) out.push("", `<b>${t.kbWhere}</b>: ${t.kbWhereButtons}`);
    if (e.checkedAt) out.push("", `<i>${t.kbChecked} ${escapeHtml(e.checkedAt)}</i>`);
  }
  if (t.kbRuOnly) out.push("", `<i>${t.kbRuOnly}</i>`);
  return out.join("\n");
}

export async function showKnowledgeList(ctx: BotContext, edit = false) {
  const t = tx(ctx);
  const text = t.kbRuOnly ? `${t.kbChoose}\n\n<i>${t.kbRuOnly}</i>` : t.kbChoose;
  const opts = { parse_mode: "HTML" as const, reply_markup: knowledgeListKeyboard() };
  if (edit) {
    await ctx.editMessageText(text, opts).catch(() => ctx.reply(text, opts));
  } else {
    await ctx.reply(text, opts);
  }
}

export async function showKnowledgeEntry(ctx: BotContext, id: string) {
  const t = tx(ctx);
  const entry = KNOWLEDGE.find((k) => k.id === id);
  if (!entry) return showKnowledgeList(ctx, true);
  const opts = {
    parse_mode: "HTML" as const,
    reply_markup: knowledgeEntryKeyboard(t, entry),
    link_preview_options: { is_disabled: true },
  };
  const text = formatEntry(t, entry);
  await ctx.editMessageText(text, opts).catch(() => ctx.reply(text, opts));
}
