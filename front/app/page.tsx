import fs from "node:fs/promises";
import path from "node:path";

type Foundation = {
  rank: number;
  name: string;
  assets: string;
  annualGrant: string;
  established: string;
  agency: string;
};

async function loadFoundations(): Promise<Foundation[]> {
  const filePath = path.join(process.cwd(), "app", "text.txt");
  const raw = await fs.readFile(filePath, "utf-8");
  const lines = raw.split("\n");

  // 「先頭が数字+タブ」の行を新レコード開始とみなし、そうでない行は前レコードへ連結する
  const records: string[] = [];
  let current: string[] = [];
  for (const line of lines) {
    if (!line.trim()) continue;
    if (line.startsWith("財団名")) continue;
    if (/^\d+\t/.test(line)) {
      if (current.length > 0) records.push(current.join("\t"));
      current = [line];
    } else if (current.length > 0) {
      current.push(line);
    }
  }
  if (current.length > 0) records.push(current.join("\t"));

  const numericPattern = /^[\d,]+$/;
  const foundations: Foundation[] = [];

  for (const record of records) {
    const cols = record.split("\t").map((c) => c.trim());
    const rank = parseInt(cols[0] ?? "", 10);
    if (!Number.isFinite(rank)) continue;

    // 資産総額・年間助成額・設立年は連続する 3 つの数値列。後ろから探す
    const numericIdx: number[] = [];
    cols.forEach((c, i) => {
      if (numericPattern.test(c)) numericIdx.push(i);
    });
    let assetsIdx = -1;
    for (let i = numericIdx.length - 3; i >= 0; i--) {
      if (
        numericIdx[i] + 1 === numericIdx[i + 1] &&
        numericIdx[i + 1] + 1 === numericIdx[i + 2]
      ) {
        assetsIdx = numericIdx[i];
        break;
      }
    }
    if (assetsIdx === -1) continue;

    foundations.push({
      rank,
      name: cols.slice(1, assetsIdx).filter(Boolean).join(" "),
      assets: cols[assetsIdx],
      annualGrant: cols[assetsIdx + 1],
      established: cols[assetsIdx + 2],
      agency: cols.slice(assetsIdx + 3).filter(Boolean).join(" "),
    });
  }

  return foundations;
}

function googleSearchUrl(name: string, suffix: string): string {
  const query = `${name} ${suffix}`;
  return `https://www.google.com/search?q=${encodeURIComponent(query)}`;
}

export default async function Home() {
  const foundations = await loadFoundations();

  return (
    <div className="min-h-full bg-zinc-50 font-sans dark:bg-zinc-950">
      <main className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
        <header className="mb-8 border-b border-zinc-200 pb-6 dark:border-zinc-800">
          <h1 className="text-3xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50">
            助成財団 Google 検索ランチャー
          </h1>
          <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
            資産総額上位 {foundations.length} 法人。各法人について「+奨学金」「+研究助成金」の
            Google 検索結果を新規タブで開きます。
          </p>
        </header>

        <div className="overflow-hidden rounded-xl border border-zinc-200 bg-white shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
          <table className="w-full text-sm">
            <thead className="bg-zinc-100 text-left text-xs font-semibold uppercase tracking-wide text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300">
              <tr>
                <th className="w-12 px-3 py-3">#</th>
                <th className="px-3 py-3">法人名</th>

                <th className="w-[36rem] px-3 py-3 text-center">Google 検索</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
              {foundations.map((f) => (
                <tr
                  key={f.rank}
                  className="hover:bg-zinc-50 dark:hover:bg-zinc-800/50"
                >
                  <td className="px-3 py-3 text-zinc-500 tabular-nums">
                    {f.rank}
                  </td>
                  <td className="px-3 py-3">
                    <div className="font-medium text-zinc-900 dark:text-zinc-100">
                      {f.name}
                    </div>
                    <div className="mt-0.5 flex flex-wrap gap-x-3 text-xs text-zinc-500">
                      <span>設立 {f.established}</span>
                      {f.agency && <span>{f.agency}</span>}
                      <span className="md:hidden">
                        年間 {f.annualGrant} 百万円
                      </span>
                    </div>
                  </td>
                  <td className="px-3 py-3">
                    <div className="flex flex-col gap-2 sm:flex-row sm:justify-stretch">
                      <a
                        href={googleSearchUrl(f.name, "奨学金")}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex flex-1 items-center justify-center rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-blue-700"
                      >
                        +奨学金
                      </a>
                      <a
                        href={googleSearchUrl(f.name, "研究助成金")}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex flex-1 items-center justify-center rounded-md bg-emerald-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-emerald-700"
                      >
                        +研究助成金
                      </a>
                      <a
                        href={googleSearchUrl(f.name, "国際奨学金")}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex flex-1 items-center justify-center rounded-md bg-amber-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-amber-700"
                      >
                        +国際奨学金
                      </a>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <footer className="mt-6 text-center text-xs text-zinc-500">
          データ出典: (公益法人協会 資産総額上位 100 法人)
        </footer>
      </main>
    </div>
  );
}
