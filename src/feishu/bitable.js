"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.BITABLE_FIELD_TYPES = void 0;
exports.batchCreateRecords = batchCreateRecords;
exports.deleteAllRecords = deleteAllRecords;
exports.getBitableShareUrl = getBitableShareUrl;
exports.createBitableApp = createBitableApp;
exports.createTableWithFields = createTableWithFields;
const config_1 = require("../config");
const approval_1 = require("./approval");
async function batchCreateRecords(tableId, records) {
    const BATCH_SIZE = 100;
    for (let i = 0; i < records.length; i += BATCH_SIZE) {
        const batch = records.slice(i, i + BATCH_SIZE);
        const response = await approval_1.feishuApi.post(`/bitable/v1/apps/${config_1.config.bitable.appToken}/tables/${tableId}/records/batch_create`, {
            records: batch.map((record) => ({ fields: record.fields })),
        });
        if (response.data.code !== 0) {
            throw new Error(`批量创建记录失败: ${response.data.msg}`);
        }
        console.log(`已创建 ${Math.min(i + BATCH_SIZE, records.length)}/${records.length} 条记录`);
    }
}
async function deleteAllRecords(tableId) {
    let hasMore = true;
    let cursor;
    while (hasMore) {
        const params = { page_size: 100 };
        if (cursor) {
            params.cursor = cursor;
        }
        const response = await approval_1.feishuApi.get(`/bitable/v1/apps/${config_1.config.bitable.appToken}/tables/${tableId}/records`, { params });
        if (response.data.code !== 0) {
            throw new Error(`获取记录列表失败: ${response.data.msg}`);
        }
        const records = response.data.data?.items || [];
        hasMore = response.data.data?.has_more || false;
        cursor = response.data.data?.page_token;
        if (records.length > 0) {
            const recordIds = records.map((r) => r.record_id);
            await approval_1.feishuApi.delete(`/bitable/v1/apps/${config_1.config.bitable.appToken}/tables/${tableId}/records/batch_delete`, { data: { records: recordIds } });
        }
    }
}
async function getBitableShareUrl() {
    try {
        const response = await approval_1.feishuApi.get(`/bitable/v1/apps/${config_1.config.bitable.appToken}/share`);
        if (response.data.code !== 0) {
            throw new Error(`获取分享链接失败: ${response.data.msg}`);
        }
        return response.data.data?.share_url || '';
    }
    catch (error) {
        console.error('获取分享链接失败:', error);
        throw error;
    }
}
async function createBitableApp(name) {
    try {
        const response = await approval_1.feishuApi.post('/bitable/v1/apps', { name: name });
        if (response.data.code !== 0) {
            throw new Error(`创建多维表格失败: ${response.data.msg}`);
        }
        return response.data.data?.app?.app_token || '';
    }
    catch (error) {
        console.error('创建多维表格失败:', error);
        throw error;
    }
}
async function createTableWithFields(appToken, tableName, fields) {
    try {
        const createTableResponse = await approval_1.feishuApi.post(`/bitable/v1/apps/${appToken}/tables`, { table: { name: tableName } });
        if (createTableResponse.data.code !== 0) {
            throw new Error(`创建数据表失败: ${createTableResponse.data.msg}`);
        }
        const tableId = createTableResponse.data.data?.table_id;
        console.log(`数据表 "${tableName}" 已创建，ID: ${tableId}`);
        for (const field of fields) {
            await approval_1.feishuApi.post(`/bitable/v1/apps/${appToken}/tables/${tableId}/fields`, { field_name: field.field_name, type: field.type });
            console.log(`字段 "${field.field_name}" 已创建`);
        }
        return tableId;
    }
    catch (error) {
        console.error('创建数据表及字段失败:', error);
        throw error;
    }
}
exports.BITABLE_FIELD_TYPES = {
    TEXT: 1,
    NUMBER: 2,
    SINGLE_SELECT: 3,
    MULTI_SELECT: 4,
    DATE: 5,
    CHECKBOX: 7,
    USER: 11,
    ATTACHMENT: 13,
    CURRENCY: 15,
    FORMULA: 18,
};
