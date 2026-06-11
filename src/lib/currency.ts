export function formatCdf(amount: number, maximumFractionDigits = 0): string {
  return new Intl.NumberFormat('en-US', {
    minimumFractionDigits: 0,
    maximumFractionDigits,
  }).format(amount) + ' CDF'
}

export function convertUsdToCdf(amount: number, rate?: number | null): number | null {
  if (!Number.isFinite(amount) || !rate || !Number.isFinite(rate) || rate <= 0) {
    return null
  }

  return amount * rate
}

export function formatUsdAsCdf(
  amount: number,
  rate?: number | null,
  maximumFractionDigits = 0,
): string {
  const converted = convertUsdToCdf(amount, rate)
  return converted == null ? '—' : formatCdf(converted, maximumFractionDigits)
}

export function parseCdfInputToUsd(value: string, rate?: number | null): number | null {
  const parsed = parseFloat(value)
  if (!Number.isFinite(parsed) || !rate || !Number.isFinite(rate) || rate <= 0) {
    return null
  }

  return parsed / rate
}