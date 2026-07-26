interface RecordFieldProps {
  label: string;
  value: string | number | string[] | null;
}

/**
 * One line of a service record. Renders nothing at all when the field is
 * empty — a sparse record should end early, not fill with dashes.
 */
export const RecordField = ({ label, value }: RecordFieldProps) => {
  const values =
    value === null || value === undefined
      ? []
      : Array.isArray(value)
        ? value.filter(Boolean)
        : [String(value)];

  if (values.length === 0) return null;

  return (
    <div className="grid grid-cols-[7.5rem_1fr] gap-3 border-t border-hairline py-2.5">
      <dt className="label pt-0.5">{label}</dt>
      <dd className="flex flex-col gap-0.5 text-meta text-bone">
        {values.map((entry) => (
          <span key={entry}>{entry}</span>
        ))}
      </dd>
    </div>
  );
};
