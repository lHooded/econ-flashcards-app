import { useId } from "react";
import type { DataTableStimulus } from "../../stimulus/model";
import { MathText } from "../math/MathText";

export function DataTable({ stimulus }: { stimulus: DataTableStimulus }) {
  const rawId = useId();
  const noteId = `${rawId.replace(/[^a-zA-Z0-9_-]/g, "")}-note`;
  return (
    <figure className="question-stimulus data-table-stimulus">
      <div className="stimulus-table-container">
        <table aria-describedby={stimulus.note === undefined ? undefined : noteId}>
          <caption>
            <MathText text={stimulus.caption} />
          </caption>
          <thead>
            <tr>
              {stimulus.columns.map((column) => (
                <th key={column.key} scope="col" style={{ textAlign: column.align }}>
                  <MathText text={column.label} />
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {stimulus.rows.map((row) => (
              <tr key={row.id}>
                {row.cells.map((cell, index) => (
                  <td
                    key={`${row.id}-${stimulus.columns[index].key}`}
                    style={{ textAlign: stimulus.columns[index].align }}
                  >
                    <MathText text={cell} />
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {stimulus.note === undefined ? null : (
        <p id={noteId} className="stimulus-table-note">
          <MathText text={stimulus.note} />
        </p>
      )}
    </figure>
  );
}
