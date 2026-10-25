export type LegalPageCopy = Readonly<{
  note: string;
  defaultDisclaimer: string;
}>;

const ru: LegalPageCopy = {
  note: "Примечание",
  defaultDisclaimer:
    "На этой странице приведена общая информация для запуска Jolmod. Перед публичным запуском её необходимо проверить с профессиональным юристом."
};

const kk: LegalPageCopy = {
  note: "Ескерту",
  defaultDisclaimer:
    "Бұл бетте Jolmod іске қосу үшін жалпы ақпарат берілген. Жария іске қосар алдында оны кәсіби заңгермен тексеру қажет."
};

const en: LegalPageCopy = {
  note: "Note",
  defaultDisclaimer:
    "This page contains general information for the Jolmod launch. It must be reviewed with professional legal counsel before public launch."
};

const zhCN: LegalPageCopy = {
  note: "说明",
  defaultDisclaimer:
    "本页包含 Jolmod 上线所需的一般信息。在公开上线前，必须由专业法律顾问审核。"
};

export function getLegalPageCopy(locale?: string | null): LegalPageCopy {
  switch (locale?.toLowerCase().replace("_", "-")) {
    case "kk":
      return kk;
    case "en":
    case "en-us":
      return en;
    case "zh":
    case "zh-cn":
      return zhCN;
    case "ru":
    case "ru-ru":
    default:
      return ru;
  }
}
