import axios from 'axios';
import { config } from '../config';
import { feishuApi } from './approval';

export interface Field {
  field_name: string;
  field_value: any;
}

export interface BitableRecord {
  fields: Record<string, any>;
}

export async function batchCreateRecords(
  tableId: string,
  records: BitableRecord[]
): Promise<void> {
  const BATCH_SIZE = 100;

  for (let i = 0; i < records.length; i += BATCH_SIZE) {
    const batch = records.slice(i, i + BATCH_SIZE);

    const response = await feishuApi.post(
      `/bitable/v1/apps/${config.bitable.appToken}/tables/${tableId}/records/batch_create`,
      {
        records: batch.map((record) => ({ fields: record.fields })),
      }
    );

    if (response.data.code !== 0) {
      throw new Error(`批量创建记录失败: ${response.data.msg}`);
    }

    console.log(`已创建 ${Math.min(i + BATCH_SIZE, records.length)}/${records.length} 条记录`);
  }
}

export async function deleteAllRecords(tableId: string): Promise<void> {
  let hasMore = true;
  let cursor: string | undefined;

  while (hasMore) {
    const params: any = { page_size: 100 };
    if (cursor) {
      params.cursor = cursor;
    }

    const response = await feishuApi.get(
      `/bitable/v1/apps/${config.bitable.appToken}/tables/${tableId}/records`,
      { params }
    );

    if (response.data.code !== 0) {
      throw new Error(`获取记录列表失败: ${response.data.msg}`);
    }

    const records = response.data.data?.items || [];
    hasMore = response.data.data?.has_more || false;
    cursor = response.data.data?.page_token;

    if (records.length > 0) {
      const recordIds = records.map((r: any) => r.record_id);
      await feishuApi.delete(
        `/bitable/v1/apps/${config.bitable.appToken}/tables/${tableId}/records/batch_delete`,
        { data: { records: recordIds } }
      );
    }
  }
}

export async function getBitableShareUrl(): Promise<string> {
  try {
    const response = await feishuApi.get(
      `/bitable/v1/apps/${config.bitable.appToken}/share`
    );

    if (response.data.code !== 0) {
      throw new Error(`获取分享链接失败: ${response.data.msg}`);
    }

    return response.data.data?.share_url || '';
  } catch (error) {
    console.error('获取分享链接失败:', error);
    throw error;
  }
}

export async function createBitableApp(name: string): Promise<string> {
  try {
    const response = await feishuApi.post(
      '/bitable/v1/apps',
      { name: name }
    );

    if (response.data.code !== 0) {
      throw new Error(`创建多维表格失败: ${response.data.msg}`);
    }

    return response.data.data?.app?.app_token || '';
  } catch (error: any) {
    console.error('创建多维表格失败:', error);
    throw error;
  }
}

export async function createTableWithFields(
  appToken: string,
  tableName: string,
  fields: { field_name: string; type: number }[]
): Promise<string> {
  try {
    const createTableResponse = await feishuApi.post(
      `/bitable/v1/apps/${appToken}/tables`,
      { table: { name: tableName } }
    );

    if (createTableResponse.data.code !== 0) {
      throw new Error(`创建数据表失败: ${createTableResponse.data.msg}`);
    }

    const tableId = createTableResponse.data.data?.table_id;
    console.log(`数据表 "${tableName}" 已创建，ID: ${tableId}`);

    for (const field of fields) {
      await feishuApi.post(
        `/bitable/v1/apps/${appToken}/tables/${tableId}/fields`,
        { field_name: field.field_name, type: field.type }
      );
      console.log(`字段 "${field.field_name}" 已创建`);
    }

    return tableId;
  } catch (error: any) {
    console.error('创建数据表及字段失败:', error);
    throw error;
  }
}

export const BITABLE_FIELD_TYPES = {
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
