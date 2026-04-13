const XLSX = require('xlsx');

const workbook = XLSX.readFile('/Users/wenjiana/Desktop/项目文件/飞书报销付款/exports/2026年3月报销付款统计报表.xlsx');

const sheet = workbook.Sheets['报销登记表'];
const data = XLSX.utils.sheet_to_json(sheet, { header: 1 });

console.log('=== 报销登记表 ===');
for (let i = 0; i < data.length; i++) {
  const row = data[i];
  if (row && (row[3] || row[4] || row[6])) {
    console.log(`行${i + 1}: 申请人=${row[6]}, 付款日期=${row[5]}, 金额=${row[4]}, 用途=${row[3]}`);
  }
}

console.log('\n=== 付款登记表 ===');
const paymentSheet = workbook.Sheets['付款登记表'];
const paymentData = XLSX.utils.sheet_to_json(paymentSheet, { header: 1 });
for (let i = 0; i < paymentData.length; i++) {
  const row = paymentData[i];
  if (row && (row[2] || row[3] || row[4])) {
    console.log(`行${i + 1}: 所属公司=${row[0]}, 付款日期=${row[4]}, 金额=${row[3]}, 付款原因=${row[2]}`);
  }
}