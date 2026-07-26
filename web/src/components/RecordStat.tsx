interface RecordStatProps {
  label: string;
  value: number | null;
  unit?: string;
}

/** A numeric datum, set in mono — the archive's measured facts. */
export const RecordStat = ({ label, value, unit }: RecordStatProps) => {
  if (value === null || value === undefined) return null;

  return (
    <div className="border border-hairline px-3 py-2">
      <p className="label">{label}</p>
      <p className="datum mt-1 text-name text-bone">
        {value}
        {unit && <span className="text-bone-dim/60">{unit}</span>}
      </p>
    </div>
  );
};
