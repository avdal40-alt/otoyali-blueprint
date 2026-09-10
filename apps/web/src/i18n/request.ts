import { getRequestConfig } from "next-intl/server";
import { getDictionary } from "./get-dictionary";
import { getRequestLocale } from "./server";

export default getRequestConfig(async () => {
  const locale = await getRequestLocale();

  return {
    locale,
    messages: getDictionary(locale)
  };
});
