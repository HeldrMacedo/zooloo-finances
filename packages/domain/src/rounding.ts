/** Divisão inteira com arredondamento half-even, o "arredondamento bancário" (RNF-FIN-04). */
export function divideHalfEven(dividend: number, divisor: number): number {
  if (!Number.isSafeInteger(dividend) || !Number.isSafeInteger(divisor) || divisor === 0) {
    throw new RangeError('divideHalfEven exige inteiros seguros e divisor diferente de zero.');
  }
  const sign = Math.sign(dividend) * Math.sign(divisor);
  const absDividend = Math.abs(dividend);
  const absDivisor = Math.abs(divisor);
  const quotient = Math.floor(absDividend / absDivisor);
  const twiceRemainder = (absDividend - quotient * absDivisor) * 2;
  const roundUp =
    twiceRemainder > absDivisor || (twiceRemainder === absDivisor && quotient % 2 === 1);
  const result = sign * (roundUp ? quotient + 1 : quotient);
  return result === 0 ? 0 : result;
}
