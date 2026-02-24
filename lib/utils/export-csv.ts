interface CsvColumn<T> {
  key: keyof T | string
  header: string
  accessor?: (row: T) => string | number | null | undefined
}

function exportToCSV<T extends Record<string, unknown>>(
  data: T[],
  filename: string,
  columns: CsvColumn<T>[]
) {
  const headers = columns.map((col) => col.header)

  const rows = data.map((row) =>
    columns.map((col) => {
      const value = col.accessor
        ? col.accessor(row)
        : row[col.key as keyof T]
      if (value === null || value === undefined) return ""
      const str = String(value)
      // Escape CSV values with commas, quotes, or newlines
      if (str.includes(",") || str.includes('"') || str.includes("\n")) {
        return `"${str.replace(/"/g, '""')}"`
      }
      return str
    })
  )

  const csv = [headers.join(","), ...rows.map((r) => r.join(","))].join("\n")

  const blob = new Blob(["\ufeff" + csv], {
    type: "text/csv;charset=utf-8;",
  })
  const url = URL.createObjectURL(blob)
  const link = document.createElement("a")
  link.setAttribute("href", url)
  link.setAttribute("download", `${filename}.csv`)
  link.style.visibility = "hidden"
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}

export { exportToCSV }
export type { CsvColumn }
