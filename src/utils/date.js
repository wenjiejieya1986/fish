"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getLastMonthDateRange = getLastMonthDateRange;
exports.getLastMonthName = getLastMonthName;
exports.formatDate = formatDate;
exports.parseDate = parseDate;
function getLastMonthDateRange() {
    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth();
    const lastMonthDate = new Date(year, month - 1, 1);
    const startTime = new Date(lastMonthDate.getFullYear(), lastMonthDate.getMonth(), 1, 0, 0, 0);
    const endTime = new Date(lastMonthDate.getFullYear(), lastMonthDate.getMonth() + 1, 0, 23, 59, 59);
    return {
        startTime: startTime.getTime(),
        endTime: endTime.getTime(),
    };
}
function getLastMonthName() {
    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth();
    const lastMonthDate = new Date(year, month - 1, 1);
    const yearStr = lastMonthDate.getFullYear().toString();
    const monthStr = (lastMonthDate.getMonth() + 1).toString().padStart(2, '0');
    return `${yearStr}年${monthStr}月`;
}
function formatDate(timestamp) {
    const date = new Date(timestamp);
    const year = date.getFullYear();
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const day = date.getDate().toString().padStart(2, '0');
    return `${year}-${month}-${day}`;
}
function parseDate(dateStr) {
    const date = new Date(dateStr);
    return date.getTime();
}
