const ExcelJS = require('exceljs');

async function readExcel() {
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.readFile('/Users/wenjiana/Desktop/项目文件/飞书报销付款/exports/2026年03月报销付款统计报表.xlsx');

  console.log('工作表:', workbook.worksheets.map(s => s.name));

  const sheet = workbook.getWorksheet('报销登记表');
  console.log('\n报销登记表结构:');
  sheet.eachRow((row, rowNum) => {
    const cells = [];
    row.eachCell((cell, colNum) => {
      if (cell.value !== undefined) {
        cells.push(`${String.fromCharCode(64+colNum)}=${JSON.stringify(cell.value)}`);
        if (cell.fill && cell.fill.fgColor) {
          console.log(`  ${String.fromCharCode(64+colNum)}${rowNum} 填充色:`, cell.fill.fgColor.argb);
        }
        if (cell.border && cell.border.top && cell.border.top.style) {
          console.log(`  ${String.fromCharCode(64+colNum)}${rowNum} 边框:`, cell.border.top.style);
        }
      }
    });
    if (cells.length > 0) {
      console.log(`行${rowNum}:`, cells.join(', '));
    }
  });
}

readExcel();