// DataTable.jsx
export default function DataTable({ title, columns, data, renderActions, headerActions }) {
  return (
    <div className="admin-card">
      <div className="admin-card__header">
        <h2 className="admin-card__title">{title}</h2>

        {/* 👇 đây là chỗ để Add button ở góc phải header */}
        {headerActions && (
          <div className="admin-card__header-actions">
            {headerActions}
          </div>
        )}
      </div>

      <div className="admin-card__body">
        <div className="admin-table__wrapper">
          <table className="admin-table">
            <thead>
              <tr>
                {columns.map((col) => (
                  <th key={col.key} className="admin-table__th">
                    {col.label}
                  </th>
                ))}
                {renderActions && (
                  <th className="admin-table__th admin-table__th--actions">
                    Actions
                  </th>
                )}
              </tr>
            </thead>
            <tbody>
              {data.length === 0 ? (
                <tr>
                  <td
                    className="admin-table__empty"
                    colSpan={columns.length + (renderActions ? 1 : 0)}
                  >
                    Không có dữ liệu
                  </td>
                </tr>
              ) : (
                data.map((row, index) => (
                  <tr key={index} className="admin-table__row">
                    {columns.map((col) => (
                      <td key={col.key} className="admin-table__td">
                        {row[col.key]}
                      </td>
                    ))}

                    {renderActions && (
                      <td className="admin-table__td admin-table__td--actions">
                        <div className="admin-table__actions">
                          {renderActions(row)}
                        </div>
                      </td>
                    )}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
