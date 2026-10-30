// Кредитные карты: условия с карточек продуктов на banki.ru (дата актуализации там —
// 29.10.2026). Главное здесь — «ловушки»: реальный льготный период, который часто
// короче рекламного, платные продления, ежедневные платы, минимальный платёж.
// Обновлять так же, как bank-offers.ts: открыть sourceUrl, сверить, поменять checkedAt.

export interface CreditCard {
  id: string;
  bank: string;
  name: string;
  rateMin: number;
  rateMax: number;
  pskMin: number;
  pskMax: number;
  limitMax: number;
  /** Льготный период из рекламы, дней */
  graceAdvertised: number;
  /** Обычный льготный период на покупки, без акций, подписок и особых условий, дней */
  graceRegular: number;
  /** Когда действует рекламный срок — простыми словами, для фразы «N дней дают только …» */
  graceAdvertisedWhen?: string;
  /** Минимальный платёж: % от долга, нижняя граница в рублях, плюс ли проценты сверху */
  minPayPercent: number;
  minPayMin: number;
  minPayPlusInterest: boolean;
  /** Скрытые и неочевидные условия — человеческим языком */
  traps: string[];
  sourceUrl: string;
  checkedAt: string;
}

const CHECKED = "2026-10-29";
const card = (id: number) => `https://www.banki.ru/products/creditcards/card/${id}/`;

export const CREDIT_CARDS: CreditCard[] = [
  {
    id: "sber", bank: "Сбербанк", name: "СберКарта",
    rateMin: 49.8, rateMax: 59.8, pskMin: 48.816, pskMax: 58.32, limitMax: 1_000_000,
    graceAdvertised: 120, graceRegular: 120, minPayPercent: 10, minPayMin: 0, minPayPlusInterest: true,
    traps: [
      "Льготный период — только на покупки; каждый месяц 1-го числа начинается новый период на 4 месяца",
      "Снятие наличных без комиссии — только 30 дней после оформления (акция до 31.12.2026)",
      "Минимальный платёж — до 10% долга плюс начисленные проценты",
    ],
    sourceUrl: card(8481), checkedAt: CHECKED,
  },
  {
    id: "tbank", bank: "Т-Банк", name: "Платинум",
    rateMin: 29.9, rateMax: 61.9, pskMin: 29.855, pskMax: 61.999, limitMax: 1_000_000,
    graceAdvertised: 120, graceRegular: 55, graceAdvertisedWhen: "на перевод долга с карт других банков", minPayPercent: 14, minPayMin: 600, minPayPlusInterest: false,
    traps: [
      "«До 120 дней» — только на перевод долга с карт других банков; на покупки — 55 дней",
      "180 дней — только с платной подпиской Pro",
      "Минимальный платёж до 14% долга, не меньше 600 ₽",
    ],
    sourceUrl: card(675), checkedAt: CHECKED,
  },
  {
    id: "ozon", bank: "Ozon Банк", name: "Ozon Карта",
    rateMin: 29.9, rateMax: 62.4, pskMin: 29.081, pskMax: 59.876, limitMax: 1_000_000,
    graceAdvertised: 140, graceRegular: 80, graceAdvertisedWhen: "на товары Ozon с пометкой «до 140 дней»", minPayPercent: 4, minPayMin: 400, minPayPlusInterest: false,
    traps: [
      "«До 140 дней» — только на товары Ozon с пометкой «до 140 дней»; на остальное — до 80 дней",
      "Переводы и снятие наличных без комиссии — по акции до 31.12.2026",
      "Минимальный платёж всего 4% — долг будет гаситься очень долго, если платить только его",
    ],
    sourceUrl: card(9137), checkedAt: CHECKED,
  },
  {
    id: "alfa", bank: "Альфа-Банк", name: "Кредитная карта",
    rateMin: 58.49, rateMax: 58.99, pskMin: 58.522, pskMax: 59.023, limitMax: 1_000_000,
    graceAdvertised: 150, graceRegular: 60, graceAdvertisedWhen: "при условии, что с 61-го дня вы платите банку 1,9% от долга каждый месяц", minPayPercent: 10, minPayMin: 300, minPayPlusInterest: false,
    traps: [
      "«До 150 дней» — это платное продление: с 61-го по 150-й день — 1,9% от долга каждый месяц",
      "Без продления беспроцентный период на покупки — 60 дней",
      "Новый льготный период начинается только после полного погашения долга",
    ],
    sourceUrl: card(73), checkedAt: CHECKED,
  },
  {
    id: "vtb-reserve", bank: "ВТБ", name: "Резервный лимит",
    rateMin: 0, rateMax: 0, pskMin: 29, pskMax: 59.9, limitMax: 49_999,
    graceAdvertised: 0, graceRegular: 0, minPayPercent: 3, minPayMin: 0, minPayPlusInterest: true,
    traps: [
      "Ставка 0%, но пока есть долг, каждый день списывается плата 10–50 ₽ в зависимости от лимита",
      "50 ₽ в день — это 1 500 ₽ в месяц: при небольшом долге выходит дороже обычного кредита",
      "Минимальный платёж 3% долга плюс накопленная плата за дни с задолженностью",
    ],
    sourceUrl: card(9235), checkedAt: CHECKED,
  },
  {
    id: "mts", bank: "МТС Банк", name: "МТС Деньги",
    rateMin: 59.9, rateMax: 59.9, pskMin: 57.133, pskMax: 57.201, limitMax: 1_000_000,
    graceAdvertised: 415, graceRegular: 51, graceAdvertisedWhen: "на первую покупку в течение 30 дней после получения карты", minPayPercent: 3, minPayMin: 100, minPayPlusInterest: false,
    traps: [
      "«До 415 дней» — только на первую покупку в течение 30 дней после выдачи карты",
      "Обычный льготный период — 51 день; 111 дней — только с платной подпиской MTC Premium",
    ],
    sourceUrl: card(9047), checkedAt: CHECKED,
  },
  {
    id: "sovcom", bank: "Совкомбанк", name: "Без % с бесплатным снятием",
    rateMin: 59.9, rateMax: 59.9, pskMin: 38.38, pskMax: 60.757, limitMax: 500_000,
    graceAdvertised: 300, graceRegular: 60, graceAdvertisedWhen: "на покупки в первый месяц, если оформить карту до 31.12.2026", minPayPercent: 8, minPayMin: 0, minPayPlusInterest: false,
    traps: [
      "«До 300 дней» — только на покупки первого месяца, при оформлении до 31.12.2026",
      "120 дней — только с платной подпиской «Оптима»; без неё — 60 дней",
    ],
    sourceUrl: card(8932), checkedAt: CHECKED,
  },
  {
    id: "renessans", bank: "Ренессанс Банк", name: "115 дней без %",
    rateMin: 59.9, rateMax: 59.9, pskMin: 59.9, pskMax: 59.9, limitMax: 600_000,
    graceAdvertised: 115, graceRegular: 55, graceAdvertisedWhen: "на покупки в первый месяц", minPayPercent: 2, minPayMin: 200, minPayPlusInterest: false,
    traps: [
      "115 дней — только на покупки первого месяца, дальше — 55 дней",
      "Снятие наличных без комиссии — по акции до 31.01.2027",
      "Минимальный платёж всего 2% — при 59,9% годовых он почти весь уходит на проценты",
    ],
    sourceUrl: card(8807), checkedAt: CHECKED,
  },
  {
    id: "uralsib", bank: "Уралсиб", name: "120 дней на максимум",
    rateMin: 34.9, rateMax: 99.9, pskMin: 21.709, pskMax: 72.809, limitMax: 5_000_000,
    graceAdvertised: 120, graceRegular: 120, minPayPercent: 3, minPayMin: 300, minPayPlusInterest: true,
    traps: [
      "Ставка может доходить до 99,9% годовых",
      "Снятие наличных и переводы — по отдельной ставке 48,9–99,9% и без льготного периода",
    ],
    sourceUrl: card(8464), checkedAt: CHECKED,
  },
  {
    id: "ceb", bank: "Кредит Европа Банк", name: "Urban Card",
    rateMin: 29.9, rateMax: 39, pskMin: 0, pskMax: 36.598, limitMax: 600_000,
    graceAdvertised: 55, graceRegular: 55, minPayPercent: 2, minPayMin: 200, minPayPlusInterest: true,
    traps: ["Короткий, но честный льготный период — 55 дней на покупки", "Минимальный платёж 2% долга плюс проценты"],
    sourceUrl: card(7863), checkedAt: CHECKED,
  },
  {
    id: "zaymer", bank: "Банк «Пэйджин»", name: "Виртуальная карта Займер",
    rateMin: 138.7, rateMax: 292, pskMin: 138.7, pskMax: 292, limitMax: 100_000,
    graceAdvertised: 0, graceRegular: 0, minPayPercent: 10, minPayMin: 500, minPayPlusInterest: true,
    traps: [
      "Ставка 138,7–292% годовых — это уровень микрозаймов",
      "Льготного периода нет; брать стоит только если других вариантов действительно нет",
    ],
    sourceUrl: card(9133), checkedAt: CHECKED,
  },
];
