import type { PatientField } from "../domain/catalogs";
import type { PatientRecord } from "../domain/schemas";

function assignField<Field extends PatientField>(projected: Partial<PatientRecord>, record: PatientRecord, field: Field): void {
  projected[field] = record[field];
}

export function projectPatientFields(record: PatientRecord, fields: readonly PatientField[]): Partial<PatientRecord> {
  const projected: Partial<PatientRecord> = {};
  for (const field of fields) assignField(projected, record, field);
  return projected;
}
