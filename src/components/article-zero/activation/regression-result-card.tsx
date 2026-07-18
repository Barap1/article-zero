import type { RegressionRemediation } from "../../../activation/regression-remediation";
import type { RegressionTestCase, RegressionTestResult } from "../../../domain/schemas";
import { formatDisplayLabel } from "../../../lib/display-label";

export type RegressionResultCardProps = {
  readonly testCase: RegressionTestCase;
  readonly result: RegressionTestResult;
  readonly remediation: RegressionRemediation | null;
  readonly onReviewRepair?: (remediation: RegressionRemediation) => void;
};

function passingSummary(result: RegressionTestResult): string {
  const count = result.actualPermittedFields.length;
  return `The policy produced the expected ${formatDisplayLabel(result.actualOutcome).toLowerCase()} result with ${count} permitted field${count === 1 ? "" : "s"}.`;
}

export function RegressionResultCard({ testCase, result, remediation, onReviewRepair }: RegressionResultCardProps) {
  const isFailure = !result.passed;
  return <li className={result.passed ? "az-test-result az-test-result-pass" : "az-test-result az-test-result-fail"}>
    <div className="az-test-result-status" aria-label={`Test status: ${result.passed ? "Pass" : "Fail"}`}>
      <span className="az-test-result-status-label">{result.passed ? "Pass" : "Fail"}</span>
      <span className="az-test-result-severity">{formatDisplayLabel(result.severity)}</span>
    </div>
    <div className="az-test-result-main">
      <strong className="az-test-result-title">{testCase.name}</strong>
      <p className="az-test-result-summary">{isFailure ? remediation?.summary ?? "The policy result does not match the expected behavior for this test." : passingSummary(result)}</p>
      <details className="az-test-result-details">
        <summary>Technical details</summary>
        <dl className="az-test-result-technical-list">
          <div><dt>Expected outcome</dt><dd>{result.expectedOutcome}</dd></div>
          <div><dt>Actual outcome</dt><dd>{result.actualOutcome}</dd></div>
          <div><dt>Expected permitted fields</dt><dd>{result.expectedPermittedFields.join(", ") || "None"}</dd></div>
          <div><dt>Actual permitted fields</dt><dd>{result.actualPermittedFields.join(", ") || "None"}</dd></div>
          <div><dt>Decision ID</dt><dd>{result.decisionId}</dd></div>
        </dl>
      </details>
    </div>
    <span className="az-test-result-outcome" aria-label={`Outcome: ${formatDisplayLabel(result.actualOutcome)}`}>{formatDisplayLabel(result.actualOutcome)}</span>
    {isFailure ? <div className="az-test-result-remediation">
      <div className="az-test-result-remediation-copy">
        <strong>Why this failed</strong>
        {remediation?.missingFields.length ? <p>Missing fields: <span className="az-test-result-remediation-fields">{remediation.missingFields.map(formatDisplayLabel).join(", ")}</span>.</p> : null}
        {remediation?.unexpectedFields.length ? <p>Unexpected fields: <span className="az-test-result-remediation-fields">{remediation.unexpectedFields.map(formatDisplayLabel).join(", ")}</span>.</p> : null}
      </div>
      {remediation !== null && onReviewRepair !== undefined ? <button className="az-button az-button-primary" type="button" onClick={() => onReviewRepair(remediation)}>Review suggested repair</button> : null}
    </div> : null}
  </li>;
}
