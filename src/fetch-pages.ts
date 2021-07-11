import api, { ApiInstance } from "../api/$api";
import aspida from "@aspida/axios";
async function* fetchPages(api: ApiInstance, projectName: string) {
  let count;
  let fetched = 0;
  do {
    const result = await api.pages._projectName(projectName).$get(
      {
        query: {
          skip: fetched
        }
      }
    );
    fetched += result.pages.length;
    count = result.count;
    console.error(`fetched page lists ${fetched} of ${count}`);
    yield* result.pages;
  } while (fetched < count);
}
async function getPageText(api: ApiInstance, projectName: string, pageTitle: string) {
  return api.pages._projectName(projectName)._pageTitle(encodeURIComponent(pageTitle)).text.$get();
}
async function main() {
  const apiInstance = api(aspida()) as ApiInstance;
  const pages = [];
  const projectName = "discordjs-japan";
  for await (const page of fetchPages(apiInstance, projectName)) {
    try {
      const text = await getPageText(apiInstance, projectName, page.title);
      console.error(`fetched page ${page.title}`);
      pages.push({ page, text });
    } catch (err) {
      console.error(`skipped page ${page.title}`);
      console.error(err);
    }

  }
  console.log(JSON.stringify(pages));
}
main();