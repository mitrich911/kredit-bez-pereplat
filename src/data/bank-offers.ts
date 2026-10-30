// Условия банков: с официальных сайтов, а где банк не публикует ставку на странице
// продукта — с его сервиса (Домклик у Сбера) или с banki.ru (по решению владельца,
// 29.10.2026). Источник каждой записи — sourceName; без него это сайт банка.
// Каждая цифра переписана со страницы-источника вручную; дата — день проверки.
// Если цифр нет ни там, ни там, поле остаётся null.
// Обновлять: открыть sourceUrl, сверить, поменять цифры и checkedAt.

export type Product = "mortgage" | "family" | "cash" | "auto";

export const PRODUCTS: { id: Product; title: string }[] = [
  { id: "mortgage", title: "Ипотека на вторичное жильё" },
  { id: "family", title: "Семейная ипотека" },
  { id: "cash", title: "Кредит наличными" },
  { id: "auto", title: "Автокредит" },
];

export interface BankOffer {
  id: string;
  bank: string;
  product: Product;
  title: string;
  /** Ставка, % годовых: от и до (null — банк не публикует) */
  rateMin: number | null;
  rateMax: number | null;
  /** Полная стоимость кредита, % годовых: диапазон со страницы */
  pskMin: number | null;
  pskMax: number | null;
  amountMax?: number;
  termMaxMonths?: number;
  downPaymentMinPercent?: number;
  /** От чего зависит ставка: надбавки, скидки, обязательные условия */
  conditions: string[];
  sourceUrl: string;
  /** Откуда цифры: сайт банка (по умолчанию), его сервис или агрегатор */
  sourceName?: string;
  checkedAt: string;
}

const CHECKED = "2026-10-29";
const BANKI = "banki.ru";

export const BANK_OFFERS: BankOffer[] = [
  // Ипотека на вторичное жильё
  {
    id: "vtb-mortgage", bank: "ВТБ", product: "mortgage", title: "Ипотека на вторичное жильё",
    rateMin: 18.0, rateMax: null, pskMin: 19.144, pskMax: 25.907,
    amountMax: 100_000_000, termMaxMonths: 360, downPaymentMinPercent: 20.1,
    conditions: ["Скидка 0,4 п. п. новым и текущим зарплатным клиентам"],
    sourceUrl: "https://www.vtb.ru/personal/ipoteka/vtorichnoe-zhile/", checkedAt: CHECKED,
  },
  {
    id: "tbank-mortgage", bank: "Т-Банк", product: "mortgage", title: "Ипотека на вторичное жильё",
    rateMin: 16.9, rateMax: null, pskMin: 17.016, pskMax: 24.135,
    amountMax: 50_000_000, termMaxMonths: 360,
    conditions: ["Оформление без справок с работы (по данным страницы)"],
    sourceUrl: "https://www.tbank.ru/mortgage/", checkedAt: CHECKED,
  },
  {
    id: "domrf-mortgage", bank: "Банк ДОМ.РФ", product: "mortgage", title: "Готовое жильё (вторичка)",
    rateMin: 17.8, rateMax: null, pskMin: 16.404, pskMax: 22.972,
    amountMax: 50_000_000, termMaxMonths: 360, downPaymentMinPercent: 20.01,
    conditions: ["−0,2 п. п. к ставке зарплатным клиентам банка"],
    sourceUrl: "https://domrfbank.ru/mortgage/", checkedAt: CHECKED,
  },
  {
    id: "psb-mortgage", bank: "ПСБ", product: "mortgage", title: "Вторичное жильё",
    rateMin: 17.89, rateMax: null, pskMin: 18.012, pskMax: 25.907,
    downPaymentMinPercent: 20.01,
    conditions: [],
    sourceUrl: "https://www.psbank.ru/personal/mortgage", checkedAt: CHECKED,
  },
  {
    id: "alfa-mortgage", bank: "Альфа-Банк", product: "mortgage", title: "Ипотека на вторичное жильё",
    rateMin: 17.59, rateMax: 19.39, pskMin: 16.763, pskMax: 26.267,
    downPaymentMinPercent: 20.1,
    conditions: [
      "Ставка — по данным banki.ru; на сайте банка «от» не указано",
      "Калькулятор банка для примера (5 млн ₽, взнос 20%, 15 лет): 19,39% без скидок, 16,99% со скидкой",
    ],
    sourceUrl: "https://www.banki.ru/products/hypothec/", sourceName: BANKI, checkedAt: CHECKED,
  },
  {
    id: "gpb-mortgage", bank: "Газпромбанк", product: "mortgage", title: "Ипотека на вторичное жильё",
    rateMin: null, rateMax: null, pskMin: 18.47, pskMax: 23.705,
    amountMax: 100_000_000, downPaymentMinPercent: 20.1,
    conditions: ["Ставка — в калькуляторе банка", "−0,5 п. п. при страховании жизни и здоровья"],
    sourceUrl: "https://www.gazprombank.ru/personal/take_credit/mortgage/6383789/", checkedAt: CHECKED,
  },
  {
    id: "sber-mortgage", bank: "Сбербанк", product: "mortgage", title: "Ипотека на вторичное жильё",
    rateMin: 15.5, rateMax: null, pskMin: 18.816, pskMax: 25.618,
    amountMax: 100_000_000, termMaxMonths: 360, downPaymentMinPercent: 20.1,
    conditions: [
      "«От 15,5%» — со всеми скидками Домклик; надбавки по данным сайта Сбербанка:",
      "+2 п. п. при взносе 20,1–30%, +1 п. п. при 30,1–50%; +1 п. п. без зарплаты в Сбере",
      "до +1,5 п. п. если жильё выбрано не на Домклик; +0,7 п. п. без «Сделки с гарантией»; +0,5 п. п. при сделке в офисе",
    ],
    sourceUrl: "https://domclick.ru/ipoteka/programs/onlajn-zayavka", sourceName: "Домклик (сервис Сбербанка)", checkedAt: CHECKED,
  },
  {
    id: "sovcom-mortgage", bank: "Совкомбанк", product: "mortgage", title: "Ипотека на вторичное жильё",
    rateMin: 16.99, rateMax: 18.99, pskMin: 19.48, pskMax: 23.836,
    downPaymentMinPercent: 15,
    conditions: ["Без подтверждения дохода (по данным banki.ru)"],
    sourceUrl: "https://www.banki.ru/products/hypothec/sovcombank/", sourceName: BANKI, checkedAt: CHECKED,
  },
  {
    id: "atb-mortgage", bank: "АТБ", product: "mortgage", title: "Готовое жильё",
    rateMin: 16.99, rateMax: null, pskMin: 22.476, pskMax: 23.987,
    downPaymentMinPercent: 20.1,
    conditions: [],
    sourceUrl: "https://www.banki.ru/products/hypothec/", sourceName: BANKI, checkedAt: CHECKED,
  },

  // Семейная ипотека (госпрограмма, условия 2026 года)
  {
    id: "vtb-family-capital", bank: "ВТБ", product: "family", title: "Семейная ипотека — Москва, СПб и их области",
    rateMin: 4, rateMax: 12, pskMin: 16.65, pskMax: 23.603,
    amountMax: 18_000_000, termMaxMonths: 360, downPaymentMinPercent: 20.1,
    conditions: [
      "Квартира: 1 ребёнок — 12%, 2 — 10%, 3 — 8%, 4 — 6%, 5 и более — 4%",
      "Лимит: 12 млн ₽ (1 ребёнок), 15 млн ₽ (2), 18 млн ₽ (3 и более)",
      "При взносе от 50,1% ставка 6%; льготная ставка действует не более 15 лет",
      "Только одна льготная ипотека по любой госпрограмме",
    ],
    sourceUrl: "https://www.vtb.ru/personal/ipoteka/dlya-semej-s-detmi/", checkedAt: CHECKED,
  },
  {
    id: "vtb-family-regions", bank: "ВТБ", product: "family", title: "Семейная ипотека — другие регионы",
    rateMin: 2, rateMax: 10, pskMin: 16.65, pskMax: 23.603,
    amountMax: 10_000_000, termMaxMonths: 360, downPaymentMinPercent: 20.1,
    conditions: [
      "Квартира: 1 ребёнок — 10%, 2 — 8%, 3 — 6%, 4 — 4%, 5 и более — 2%",
      "Лимит: 6 млн ₽ (1 ребёнок), 8 млн ₽ (2), 10 млн ₽ (3 и более)",
      "Льготная ставка действует не более 15 лет",
      "ПСК — диапазон со страницы банка для программы в целом",
    ],
    sourceUrl: "https://www.vtb.ru/personal/ipoteka/dlya-semej-s-detmi/", checkedAt: CHECKED,
  },

  {
    id: "domrf-family", bank: "Банк ДОМ.РФ", product: "family", title: "Семейная ипотека",
    rateMin: 2, rateMax: null, pskMin: 16.404, pskMax: 18.864,
    downPaymentMinPercent: 20.01,
    conditions: ["Ставка по госпрограмме зависит от числа детей и региона; «от 2%» — минимальная"],
    sourceUrl: "https://domrfbank.ru/mortgage/", checkedAt: CHECKED,
  },
  {
    id: "psb-family", bank: "ПСБ", product: "family", title: "Семейная ипотека",
    rateMin: 2, rateMax: null, pskMin: 16.101, pskMax: 25.584,
    downPaymentMinPercent: 20.01,
    conditions: ["Ставка по госпрограмме зависит от числа детей и региона; «от 2%» — минимальная"],
    sourceUrl: "https://www.psbank.ru/personal/mortgage", checkedAt: CHECKED,
  },
  {
    id: "alfa-family", bank: "Альфа-Банк", product: "family", title: "Семейная ипотека",
    rateMin: null, rateMax: null, pskMin: 16.483, pskMax: 25.584,
    conditions: ["Ставка «от» на странице не указана; калькулятор банка для семьи с одним ребёнком показывает 12%"],
    sourceUrl: "https://alfabank.ru/get-money/mortgage/family/", checkedAt: CHECKED,
  },
  {
    id: "sber-family", bank: "Сбербанк", product: "family", title: "Семейная ипотека",
    rateMin: 4, rateMax: null, pskMin: 17.571, pskMax: 17.847,
    amountMax: 18_000_000, termMaxMonths: 360, downPaymentMinPercent: 20.1,
    conditions: ["Ставка по госпрограмме зависит от числа детей и региона; «от 4%» — минимальная"],
    sourceUrl: "https://domclick.ru/ipoteka/programs/onlajn-zayavka", sourceName: "Домклик (сервис Сбербанка)", checkedAt: CHECKED,
  },
  {
    id: "sovcom-family", bank: "Совкомбанк", product: "family", title: "Ипотека для семей с детьми",
    rateMin: 3.99, rateMax: null, pskMin: 16.455, pskMax: 18.216,
    downPaymentMinPercent: 20.01,
    conditions: ["Ставка по госпрограмме зависит от числа детей и региона"],
    sourceUrl: "https://www.banki.ru/products/hypothec/sovcombank/", sourceName: BANKI, checkedAt: CHECKED,
  },

  // Кредит наличными
  {
    id: "vtb-cash", bank: "ВТБ", product: "cash", title: "Кредит наличными",
    // Берём ставку без платной услуги: её стоимость в опубликованных цифрах не раскрыта
    rateMin: 19.9, rateMax: 55.4, pskMin: 19.9, pskMax: 55.4,
    amountMax: 7_000_000, termMaxMonths: 60,
    conditions: [
      "Ставка 19,9–55,4% — без дополнительных услуг",
      "С платной услугой «Максимум выгоды» ставка 9,6–40,9%, но за услугу нужно платить",
    ],
    sourceUrl: "https://www.vtb.ru/personal/kredit/nalichnymi/", checkedAt: CHECKED,
  },
  {
    id: "alfa-cash", bank: "Альфа-Банк", product: "cash", title: "Кредит наличными",
    rateMin: 17.99, rateMax: 55.39, pskMin: 17.99, pskMax: 55.399,
    amountMax: 30_000_000, termMaxMonths: 180,
    conditions: [
      "Ставка определяется для каждого заёмщика индивидуально",
      "Минимальная ПСК — для кредита под залог недвижимости",
    ],
    sourceUrl: "https://alfabank.ru/get-money/credit/credit-cash/", checkedAt: CHECKED,
  },
  {
    id: "sber-cash", bank: "Сбербанк", product: "cash", title: "Кредит на любые цели",
    rateMin: 21.4, rateMax: 49.9, pskMin: 20.4, pskMax: 50.2,
    amountMax: 30_000_000, termMaxMonths: 60,
    conditions: ["На сайте банка ставка только в калькуляторе; цифры — по данным banki.ru"],
    sourceUrl: "https://www.banki.ru/products/credits/sberbank/", sourceName: BANKI, checkedAt: CHECKED,
  },
  {
    id: "tbank-cash", bank: "Т-Банк", product: "cash", title: "Кредит наличными",
    rateMin: 19.9, rateMax: 38.9, pskMin: 19.878, pskMax: 39.001,
    amountMax: 10_000_000, termMaxMonths: 60,
    conditions: [],
    sourceUrl: "https://www.banki.ru/products/credits/", sourceName: BANKI, checkedAt: CHECKED,
  },
  {
    id: "mts-cash", bank: "МТС Банк", product: "cash", title: "На любые цели без визита в банк",
    rateMin: 10.9, rateMax: 38.9, pskMin: 22.126, pskMax: 38.883,
    amountMax: 5_000_000, termMaxMonths: 60,
    conditions: ["Минимальная ставка ниже минимальной ПСК — вероятно, при подключении дополнительных услуг"],
    sourceUrl: "https://www.banki.ru/products/credits/", sourceName: BANKI, checkedAt: CHECKED,
  },
  {
    id: "rs-cash", bank: "Русский Стандарт", product: "cash", title: "Классика",
    rateMin: 16.9, rateMax: 51, pskMin: 16.9, pskMax: 50.992,
    amountMax: 3_000_000, termMaxMonths: 60,
    conditions: [],
    sourceUrl: "https://www.banki.ru/products/credits/", sourceName: BANKI, checkedAt: CHECKED,
  },
  {
    id: "psb-cash", bank: "ПСБ", product: "cash", title: "На любые цели",
    rateMin: 20.9, rateMax: 36.9, pskMin: 16.901, pskMax: 36.999,
    amountMax: 5_000_000, termMaxMonths: 60,
    conditions: [],
    sourceUrl: "https://www.banki.ru/products/credits/", sourceName: BANKI, checkedAt: CHECKED,
  },
  {
    id: "rossiya-cash", bank: "Банк «РОССИЯ»", product: "cash", title: "Деньги — возможности",
    rateMin: 20.5, rateMax: 30.5, pskMin: 19.486, pskMax: 36.488,
    amountMax: 5_000_000, termMaxMonths: 60,
    conditions: [],
    sourceUrl: "https://www.banki.ru/products/credits/", sourceName: BANKI, checkedAt: CHECKED,
  },
  {
    id: "wb-cash", bank: "WB Банк", product: "cash", title: "Кредит на любые цели",
    rateMin: 23, rateMax: 42.56, pskMin: 22.961, pskMax: 42.65,
    amountMax: 3_000_000, termMaxMonths: 60,
    conditions: ["На сайте банка ставка только в калькуляторе; цифры — по данным banki.ru"],
    sourceUrl: "https://www.banki.ru/products/credits/", sourceName: BANKI, checkedAt: CHECKED,
  },

  // Автокредит
  {
    id: "tbank-auto", bank: "Т-Банк", product: "auto", title: "Автокредит",
    rateMin: 10, rateMax: 30.9, pskMin: 9.899, pskMax: 31.739,
    amountMax: 8_000_000,
    conditions: ["Ставка рассчитывается индивидуально в пределах тарифа", "Регистрация залога — бесплатно"],
    sourceUrl: "https://www.tbank.ru/loans/auto-loan/tariffs/", checkedAt: CHECKED,
  },
  {
    id: "vtb-auto", bank: "ВТБ", product: "auto", title: "Автокредит наличными",
    rateMin: 16.6, rateMax: 24.0, pskMin: 11.5, pskMax: 25.239,
    amountMax: 10_000_000,
    conditions: [
      "Базовая ставка 16,6–24%; снижается: −3 п. п. за личное страхование, −10 п. п. за платную услугу «Автолюбитель», −0,4 п. п. за заявку онлайн",
      "Без залога автомобиля ставка выше на 11 п. п.",
    ],
    sourceUrl: "https://www.vtb.ru/personal/avtokredity/moskva/", checkedAt: CHECKED,
  },
  {
    id: "sber-auto", bank: "Сбербанк", product: "auto", title: "На автомобиль",
    rateMin: 23.9, rateMax: 41.9, pskMin: 16.26, pskMax: 44.2,
    amountMax: 5_000_000, termMaxMonths: 96,
    conditions: ["На сайте банка ставка только в калькуляторе; цифры — по данным banki.ru"],
    sourceUrl: "https://www.banki.ru/products/autocredits/", sourceName: BANKI, checkedAt: CHECKED,
  },
  {
    id: "psb-auto", bank: "ПСБ", product: "auto", title: "Автокредит",
    rateMin: null, rateMax: null, pskMin: null, pskMax: null,
    termMaxMonths: 84, downPaymentMinPercent: 10,
    conditions: ["Ставка на странице не опубликована — только в калькуляторе банка", "Срок 1–7 лет, взнос от 10%"],
    sourceUrl: "https://www.psbank.ru/personal/loans/auto", checkedAt: CHECKED,
  },
];

/** Не кредит, но важный пример «беспроцентного» продукта: для раздела покупок */
export const WB_CASH_NOTE = {
  bank: "WB Банк",
  title: "WB Кэш — «беспроцентный» кредитный лимит до 100 000 ₽",
  text: "Если не вернуть долг до конца месяца, комиссия — 50 ₽ за каждую полную и неполную 1 000 ₽ долга в месяц. Это 5% в месяц, около 60% годовых.",
  sourceUrl: "https://wb-bank.ru/cash",
  checkedAt: CHECKED,
};
