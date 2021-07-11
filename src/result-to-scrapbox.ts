interface Entry {
  source: string;
  diagnostic: string[];
  title: string;
  assertedSource: string;
}
const json: Entry[] = require("../../z.json");
const groupBy = <K, V>(
  array: readonly V[],
  getKey: (cur: V, idx: number, src: readonly V[]) => K
): [K, V[]][] =>
  Array.from(
    array.reduce((map, cur, idx, src) => {
      const key = getKey(cur, idx, src);
      const list = map.get(key);
      if (list) list.push(cur);
      else map.set(key, [cur]);
      return map;
    }, new Map<K, V[]>())
  );
console.log(groupBy(json, e => e.title).map(([k, v]) => {
  const a = v.map(a => {
    const s = "```js\n" + a.source+"\n```";
    const s2 = "```ts\n" + a.assertedSource+"\n```";
    const s3 = a.diagnostic.map(e => `- ${e}`).join("\n");
    return [s, s2, s3].join("\n\n");

  }).join("\n\n***\n\n");
  return `# ${k} \n[${k}](https://scrapbox.io/discordjs-japan/${encodeURIComponent(k)}) \n${a}`;
}).join("\n\n"));