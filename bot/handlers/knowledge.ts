import type { Context } from "grammy";
import { KNOWLEDGE, KNOWLEDGE_STUB_TEXT, isFilled, type KnowledgeEntry } from "@/content/knowledge";
import { knowledgeEntryKeyboard, knowledgeListKeyboard } from "../keyboards";
import { T, escapeHtml } from "../texts";

function formatEntry(e: KnowledgeEntry): string {
  const out = [`<b>${escapeHtml(e.title)}</b>`];
  if (!isFilled(e)) {
    out.push("", KNOWLEDGE_STUB_TEXT);
    return out.join("\n");
  }
  if (e.steps.length) {
    out.push("", `<b>${T.kbSteps}</b>`, ...e.steps.map((s, i) => `${i + 1}. ${escapeHtml(s)}`));
  }
  if (e.documents.length) {
    out.push("", `<b>${T.kbDocs}</b>`, ...e.documents.map((d) => `• ${escapeHtml(d)}`));
  }
  if (e.timing.trim()) out.push("", `<b>${T.kbTiming}</b>`, escapeHtml(e.timing));
  if (e.links.length) out.push("", `<b>${T.kbWhere}</b>: ${T.kbWhereButtons}`);
  if (e.checkedAt) out.push("", `<i>${T.kbChecked} ${escapeHtml(e.checkedAt)}</i>`);
  return out.join("\n");
}

export async function showKnowledgeList(ctx: Context, edit = false) {
  const opts = { reply_markup: knowledgeListKeyboard() };
  if (edit) {
    await ctx.editMessageText(T.kbChoose, opts).catch(() => ctx.reply(T.kbChoose, opts));
  } else {
    await ctx.reply(T.kbChoose, opts);
  }
}

export async function showKnowledgeEntry(ctx: Context, id: string) {
  const entry = KNOWLEDGE.find((k) => k.id === id);
  if (!entry) return showKnowledgeList(ctx, true);
  const opts = {
    parse_mode: "HTML" as const,
    reply_markup: knowledgeEntryKeyboard(entry),
    link_preview_options: { is_disabled: true },
  };
  const text = formatEntry(entry);
  await ctx.editMessageText(text, opts).catch(() => ctx.reply(text, opts));
}
