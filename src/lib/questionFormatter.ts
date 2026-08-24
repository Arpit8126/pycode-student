// questionFormatter.ts
// Renders the pre-built HTML description from localQuestions.ts (v2 format).
// Uses full element replacements (not partial class-attr swaps) for reliability.

export interface QuestionContent {
  problemStatement: string
  examples: { input: string; output: string; explanation?: string }[]
  constraints: string[]
}

export function enrichQuestionDetails(q: any): string {
  if (!q) return ''
  const desc = (q.description || '').trim()
  if (!desc) return ''

  // ── NEW FORMAT from our generator ────────────────────────────────────────────
  if (
    desc.includes('mb-4 leading-relaxed') ||
    desc.includes('border-l-2 border-primary') ||
    desc.includes('font-extrabold text-ink uppercase tracking-widest')
  ) {
    let html = desc

    // ① Fix paragraph text size
    html = html.replace(
      /class="mb-4 leading-relaxed text-sm font-normal text-ink font-sans"/g,
      'class="mb-4 text-[13.5px] text-ink/90 leading-[1.8] font-normal"'
    )

    // ② Replace EXAMPLE headings — extract the number and place it IN the circle
    html = html.replace(
      /<h3 class="text-xs font-extrabold text-ink uppercase tracking-widest mb-2 mt-6">Example (\d+)<\/h3>/g,
      (_: string, num: string) => `
<div class="flex items-center gap-2.5 mt-7 mb-2.5">
  <span class="inline-flex w-6 h-6 rounded-full bg-primary/20 border border-primary/30 text-primary text-[11px] font-black items-center justify-center font-mono shrink-0">${num}</span>
  <span class="text-[10px] font-black uppercase tracking-[0.18em] text-muted font-mono">Example ${num}</span>
</div>`
    )

    // ③ Replace Constraints / Edge Cases headings
    html = html.replace(
      /<h3 class="text-xs font-extrabold text-ink uppercase tracking-widest mb-2 mt-6">(Constraints.*?)<\/h3>/g,
      (_: string, label: string) => `
<div class="flex items-center gap-2.5 mt-7 mb-2.5">
  <span class="inline-flex w-6 h-6 rounded-full bg-surface-soft border border-hairline text-muted text-[11px] font-black items-center justify-center font-mono shrink-0">≡</span>
  <span class="text-[10px] font-black uppercase tracking-[0.18em] text-muted font-mono">${label}</span>
</div>`
    )

    // ④ Upgrade the example card outer container
    html = html.replace(
      /class="border-l-2 border-primary\/40 dark:border-primary\/50 pl-4 py-1\.5 space-y-1\.5 my-3\.5 font-mono text-xs text-ink font-normal"/g,
      'class="border border-hairline rounded-xl overflow-hidden my-3 divide-y divide-hairline/60"'
    )

    // ⑤ Style each Input row
    html = html.replace(
      /<div><span class="text-ink\/80 font-bold font-sans mr-2">Input:<\/span>/g,
      '<div class="flex items-baseline gap-3 px-4 py-2.5 bg-surface-soft/40 font-mono text-xs"><span class="text-[10px] font-black uppercase tracking-widest text-muted/80 font-sans w-24 shrink-0">Input</span>'
    )

    // ⑥ Style each Output row
    html = html.replace(
      /<div><span class="text-primary font-bold font-sans mr-2">Output:<\/span>/g,
      '<div class="flex items-baseline gap-3 px-4 py-2.5 font-mono text-xs"><span class="text-[10px] font-black uppercase tracking-widest text-primary font-sans w-24 shrink-0">Output</span>'
    )

    // ⑦ Style Explanation row
    html = html.replace(
      /<div><span class="text-ink\/80 font-bold font-sans mr-2">Explanation:<\/span>/g,
      '<div class="flex items-baseline gap-3 px-4 py-2.5 font-mono text-xs"><span class="text-[10px] font-black uppercase tracking-widest text-muted/80 font-sans w-24 shrink-0">Explanation</span>'
    )

    // ⑧ Style explanation text span
    html = html.replace(
      /class="text-ink font-normal font-sans"/g,
      'class="font-mono text-xs text-ink font-normal"'
    )

    // ⑨ Constraints list (isolated specifically to avoid clashing with normal list-disc items)
    html = html.replace(
      /<ul class="list-disc pl-5 text-xs text-ink space-y-1\.5 font-normal">([\s\S]*?)<\/ul>/g,
      (_: string, inner: string) => {
        const items = inner.replace(
          /<li><code>([\s\S]*?)<\/li>/g,
          '<li class="flex items-center gap-2 text-[12px] text-muted font-sans"><span class="text-primary/60 text-[9px]">▸</span><code class="font-mono text-[11px] text-ink/70">$1</li>'
        )
        return `<ul class="list-none space-y-1.5 mt-1">${items}</ul>`
      }
    )

    return html
  }

  return desc
}
