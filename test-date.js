const now = new Date();
const currentYear = now.getFullYear();
const currentMonth = now.getMonth();
const currentDay = now.getDate();

// 上个月
const lastMonth = currentMonth === 0 ? 11 : currentMonth - 1;
const lastMonthYear = currentMonth === 0 ? currentYear - 1 : currentYear;

// 统计周期（付款日期）：上个月1日到上个月最后一天
const startTime = new Date(lastMonthYear, lastMonth, 1).getTime();
const endTime = new Date(lastMonthYear, lastMonth + 1, 0, 23, 59, 59).getTime();

// 查询提交日期范围：上个月1日到本月5号
const queryStartTime = startTime;
const queryEndDay = currentDay < 5 ? currentDay : 5;
const queryEndTime = new Date(currentYear, currentMonth, queryEndDay, 23, 59, 59).getTime();

console.log('今天:', now.toISOString());
console.log('今天日期:', currentDay);
console.log('');
console.log('统计周期(付款日期):');
console.log('  开始:', new Date(startTime).toISOString());
console.log('  结束:', new Date(endTime).toISOString());
console.log('');
console.log('查询提交日期范围:');
console.log('  开始:', new Date(queryStartTime).toISOString());
console.log('  结束:', new Date(queryEndTime).toISOString());
console.log('');
console.log('郭坤3/24报销(4月2日提交)应该在查询范围内吗?');
const submitDate = new Date(2026, 3, 2).getTime(); // 4月2日
const paymentDate = new Date(2026, 2, 24).getTime(); // 3月24日
console.log('  提交日期4月2日:', submitDate >= queryStartTime && submitDate <= queryEndTime ? '是' : '否');
console.log('  付款日期3月24日:', paymentDate >= startTime && paymentDate <= endTime ? '是' : '否');