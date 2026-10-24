export type StatusCopy={featured:string;dealer:string;private:string;used:string;new:string};
const ru:StatusCopy={featured:"Рекомендуемое",dealer:"Дилер",private:"Частный продавец",used:"С пробегом",new:"Новый"};
const kk:StatusCopy={featured:"Ұсынылған",dealer:"Дилер",private:"Жеке сатушы",used:"Жүрілген",new:"Жаңа"};
const en:StatusCopy={featured:"Featured",dealer:"Dealer",private:"Private seller",used:"Used",new:"New"};
const zhCN:StatusCopy={featured:"精选",dealer:"经销商",private:"个人卖家",used:"二手",new:"新车"};
export function getStatusCopy(locale?:string|null):StatusCopy{switch(locale?.toLowerCase().replace("_","-")){case"kk":return kk;case"en":case"en-us":return en;case"zh":case"zh-cn":return zhCN;case"ru":case"ru-ru":default:return ru;}}
