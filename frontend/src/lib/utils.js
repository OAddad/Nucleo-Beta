import { clsx } from "clsx";
import { twMerge } from "tailwind-merge"

export function cn(...inputs) {
  return twMerge(clsx(inputs));
}

/**
 * Exporta dados para arquivo Excel/CSV
 * @param {Array} data - Array de objetos com os dados
 * @param {string} filename - Nome do arquivo (sem extensão)
 * @param {Object} columnMapping - Mapeamento de colunas { chave: "Label da Coluna" }
 */
export function exportToExcel(data, filename, columnMapping = null) {
  if (!data || data.length === 0) {
    alert("Não há dados para exportar");
    return;
  }

  // Se não houver mapeamento, usar as chaves do primeiro objeto
  const headers = columnMapping 
    ? Object.values(columnMapping)
    : Object.keys(data[0]);
  
  const keys = columnMapping 
    ? Object.keys(columnMapping)
    : Object.keys(data[0]);

  // Criar conteúdo CSV
  const csvContent = [
    headers.join(";"), // Header row
    ...data.map(row => 
      keys.map(key => {
        let value = row[key];
        
        // Formatar valores especiais
        if (value === null || value === undefined) {
          return "";
        }
        if (typeof value === "number") {
          return value.toString().replace(".", ",");
        }
        if (value instanceof Date) {
          return value.toLocaleDateString("pt-BR");
        }
        if (typeof value === "object") {
          return JSON.stringify(value);
        }
        // Escapar aspas e quebras de linha
        return `"${String(value).replace(/"/g, '""').replace(/\n/g, ' ')}"`;
      }).join(";")
    )
  ].join("\n");

  // Adicionar BOM para UTF-8
  const BOM = "\uFEFF";
  const blob = new Blob([BOM + csvContent], { type: "text/csv;charset=utf-8;" });
  
  // Download
  const link = document.createElement("a");
  const url = URL.createObjectURL(blob);
  link.setAttribute("href", url);
  link.setAttribute("download", `${filename}_${new Date().toISOString().split('T')[0]}.csv`);
  link.style.visibility = "hidden";
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}
