import type { ConditionOperator, TruthValue } from "../domain/catalogs";
import type {
  AgentAction,
  ConditionExpectedValue,
  ConditionResult,
  EvaluationContext,
  PolicyCondition,
} from "../domain/schemas";
import { canonicalizeValue } from "./canonicalize";
import { resolveFact } from "./fact-resolver";

type ScalarValue = Exclude<ConditionExpectedValue, string[] | null>;

export class PolicyValidationError extends Error {
  override readonly name = "PolicyValidationError";

  constructor(
    readonly ruleId: string,
    readonly conditionId: string,
    readonly operator: ConditionOperator,
    readonly actual: ConditionExpectedValue,
    readonly expected: ConditionExpectedValue,
  ) {
    super(`Incompatible ${operator} condition types for ${conditionId}`);
  }
}

function assertNever(value: never): never {
  throw new Error(`Unexpected condition operator: ${String(value)}`);
}

function isScalar(value: ConditionExpectedValue): value is ScalarValue {
  return value !== null && !Array.isArray(value);
}

function isSameScalarType(actual: ScalarValue, expected: ScalarValue): boolean {
  return typeof actual === typeof expected;
}

function invalidCondition(
  ruleId: string,
  condition: PolicyCondition,
  actual: ConditionExpectedValue,
): PolicyValidationError {
  return new PolicyValidationError(ruleId, condition.id, condition.operator, actual, condition.value);
}

function evaluateOperator(
  ruleId: string,
  condition: PolicyCondition,
  actual: ConditionExpectedValue,
  expected: ConditionExpectedValue,
): TruthValue {
  switch (condition.operator) {
    case "EQUALS":
      if (isScalar(actual) && isScalar(expected) && isSameScalarType(actual, expected)) {
        return actual === expected ? "TRUE" : "FALSE";
      }
      if (Array.isArray(actual) && Array.isArray(expected)) {
        return actual.length === expected.length && actual.every((value, index) => value === expected[index])
          ? "TRUE"
          : "FALSE";
      }
      throw invalidCondition(ruleId, condition, actual);
    case "NOT_EQUALS":
      if (isScalar(actual) && isScalar(expected) && isSameScalarType(actual, expected)) {
        return actual === expected ? "FALSE" : "TRUE";
      }
      throw invalidCondition(ruleId, condition, actual);
    case "IN":
      if (isScalar(actual) && Array.isArray(expected) && typeof actual === "string") {
        return expected.includes(actual) ? "TRUE" : "FALSE";
      }
      throw invalidCondition(ruleId, condition, actual);
    case "CONTAINS_ANY":
      if (Array.isArray(actual) && Array.isArray(expected)) {
        return actual.some((value) => expected.includes(value)) ? "TRUE" : "FALSE";
      }
      throw invalidCondition(ruleId, condition, actual);
    case "CONTAINS_ALL":
      if (Array.isArray(actual) && Array.isArray(expected)) {
        return expected.every((value) => actual.includes(value)) ? "TRUE" : "FALSE";
      }
      throw invalidCondition(ruleId, condition, actual);
    default:
      return assertNever(condition.operator);
  }
}

export function evaluateCondition(input: {
  ruleId: string;
  condition: PolicyCondition;
  action: AgentAction;
  context: EvaluationContext;
}): ConditionResult {
  const actual = canonicalizeValue(resolveFact(input.condition.fact, input.action, input.context));
  const expected = canonicalizeValue(input.condition.value);
  const result = actual === null ? "UNKNOWN" : evaluateOperator(input.ruleId, input.condition, actual, expected);

  return {
    ruleId: input.ruleId,
    conditionId: input.condition.id,
    fact: input.condition.fact,
    operator: input.condition.operator,
    expected,
    actual,
    result,
    explanation: `${input.condition.label}: actual ${JSON.stringify(actual)}, expected ${JSON.stringify(expected)}, result ${result}`,
  };
}
