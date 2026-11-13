import Decimal from 'decimal.js';

// Configure Decimal.js for financial calculations
Decimal.set({ precision: 20, rounding: Decimal.ROUND_HALF_UP });

export function calculateItemTotal(unitPrice: number, quantity: number): number {
  return new Decimal(unitPrice).times(quantity).toDecimalPlaces(2).toNumber();
}

export function calculateOrderTotal(items: { unitPrice: number; quantity: number }[]): number {
  return items
    .reduce((sum, item) => sum.plus(new Decimal(item.unitPrice).times(item.quantity)), new Decimal(0))
    .toDecimalPlaces(2)
    .toNumber();
}

export function formatCurrency(amount: number, currency: string = 'NPR'): string {
  return `${currency} ${new Decimal(amount).toDecimalPlaces(2).toFixed(2)}`;
}

export function formatAmount(amount: number): string {
  return new Decimal(amount).toDecimalPlaces(2).toFixed(2);
}
