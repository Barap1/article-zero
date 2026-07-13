import type { ConditionExpectedValue } from "../domain/schemas";

export function canonicalizeValue(value: ConditionExpectedValue): ConditionExpectedValue {
  return Array.isArray(value)
    ? [...value].sort((left, right) => (left < right ? -1 : left > right ? 1 : 0))
    : value;
}
