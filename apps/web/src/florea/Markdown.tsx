import { Fragment } from "react";

/** Hiển thị nội dung bài viết đơn giản: "## Tiêu đề", danh sách "- mục", đoạn văn; chữ in đậm **như này** */
const inline = (t: string) => t.split(/(\*\*[^*]+\*\*)/g).map((x, i) => (x.startsWith("**") && x.endsWith("**") ? <b key={i}>{x.slice(2, -2)}</b> : <Fragment key={i}>{x}</Fragment>));

export function Markdown({ text }: { text: string }) {
  const blocks = text.replace(/\r/g, "").split(/\n{2,}/).map((b) => b.trim()).filter(Boolean);
  return (
    <div className="grid gap-4 text-[17px] leading-[1.85] font-medium text-ink-soft">
      {blocks.map((b, i) => {
        const lines = b.split("\n");
        const out: React.ReactNode[] = []; let list: string[] = [];
        const flush = () => { if (list.length) { out.push(<ul key={`l${out.length}`} className="grid list-disc gap-1.5 pl-6 marker:text-rose">{list.map((x, k) => <li key={k}>{inline(x)}</li>)}</ul>); list = []; } };
        for (const l of lines) {
          if (l.startsWith("## ")) { flush(); out.push(<h2 key={`h${out.length}`} className="mt-4 font-serif text-[26px] leading-tight font-extrabold text-ink">{l.slice(3)}</h2>); }
          else if (l.startsWith("- ")) list.push(l.slice(2));
          else { flush(); out.push(<p key={`p${out.length}`}>{inline(l)}</p>); }
        }
        flush();
        return <Fragment key={i}>{out}</Fragment>;
      })}
    </div>
  );
}
