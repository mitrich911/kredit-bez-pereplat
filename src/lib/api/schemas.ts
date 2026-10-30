import { z } from "zod";

z.config(z.locales.ru());

const money = z.number().finite().min(0).max(1e11);
const rate = z.number().finite().min(0).max(100);
const months = z.number().int().min(1).max(600);
const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Дата в формате ГГГГ-ММ-ДД");
const paymentType = z.enum(["annuity", "differentiated"]).default("annuity");
const accrual = z.enum(["daily", "monthly"]).default("daily");

export const prepaymentSchema = z.object({
  kind: z.enum(["once", "monthly", "yearly"]),
  amount: money,
  month: z.number().int().min(1).max(600),
  untilMonth: z.number().int().min(1).max(600).optional(),
  mode: z.enum(["term", "payment"]),
});

export const mortgageSchema = z.object({
  propertyPrice: money,
  downPayment: money,
  annualRate: rate,
  termMonths: months,
  paymentType,
  accrual,
  startDate: isoDate,
  costs: z.object({
    insurancePercent: rate.default(0),
    insuranceFixedYearly: money.default(0),
    oneTimeCosts: money.default(0),
    monthlyFees: money.default(0),
  }).default({ insurancePercent: 0, insuranceFixedYearly: 0, oneTimeCosts: 0, monthlyFees: 0 }),
  prepayments: z.array(prepaymentSchema).max(50).default([]),
  constraints: z.object({
    monthlyExtra: money.default(0),
    savings: money.default(0),
    reserve: money.default(0),
    monthlyIncome: money.default(0),
  }).optional(),
  existingLoan: z.boolean().default(false),
  includeSchedule: z.boolean().default(false),
});

export const offerSchema = z.object({
  name: z.string().min(1).max(80),
  amount: money,
  annualRate: rate,
  termMonths: months,
  paymentType,
  insurancePercent: rate.default(0),
  insuranceFixedYearly: money.default(0),
  oneTimeFees: money.default(0),
  monthlyFees: money.default(0),
  extraServices: money.default(0),
  extraServicesFinanced: z.boolean().default(false),
  earlyRepayment: z.string().max(200).optional(),
});

export const compareSchema = z.object({
  startDate: isoDate,
  accrual,
  offers: z.array(offerSchema).min(1).max(10),
});

export const refinanceSchema = z.object({
  balance: money,
  currentRate: rate,
  remainingMonths: months,
  currentInsurancePercent: rate.default(0),
  newRate: rate,
  newTermMonths: months,
  newInsurancePercent: rate.default(0),
  switchCosts: money.default(0),
  paymentType,
  startDate: isoDate,
  accrual,
});

const carProfile = z.object({
  name: z.string().max(80).default("Автомобиль"),
  price: money,
  depreciationFirstYear: rate,
  depreciationNextYears: rate,
  kaskoYearly: money.default(0),
  osagoYearly: money.default(0),
  maintenanceYearly: money.default(0),
  repairsYearly: money.default(0),
  kmPerYear: money.default(0),
  litersPer100: z.number().min(0).max(100).default(0),
  fuelPrice: money.default(0),
  horsepower: z.number().min(0).max(5000).default(0),
  taxPerHp: money.default(0),
});

export const carSchema = z.object({
  car: carProfile,
  financing: z.object({
    kind: z.enum(["cash", "credit"]),
    downPayment: money.default(0),
    annualRate: rate.default(0),
    termMonths: z.number().int().min(0).max(600).default(0),
    dealerExtras: money.default(0),
    extrasFinanced: z.boolean().default(false),
    loanFees: money.default(0),
  }),
  options: z.object({
    ownershipYears: z.number().min(0.5).max(30),
    savingsYield: rate.default(0),
    costInflation: rate.default(0),
    startDate: isoDate,
  }),
});

export const purchaseSchema = z.object({
  cashPrice: money,
  savingsYield: rate.default(0),
  priceInflation: rate.default(0),
  startDate: isoDate,
  credit: z.object({ annualRate: rate, termMonths: months, oneTimeFees: money.default(0), monthlyFees: money.default(0), extraServices: money.default(0) }).optional(),
  installment: z.object({ price: money, termMonths: months, downPayment: money.default(0), oneTimeFee: money.default(0), monthlyFee: money.default(0), extraServices: money.default(0) }).optional(),
  saving: z.object({ monthlyAmount: money, alreadySaved: money.default(0) }).optional(),
});
