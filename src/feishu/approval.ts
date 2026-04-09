import axios, { AxiosInstance } from 'axios';
import { config } from '../config';

let tenantAccessToken: string | null = null;
let tokenExpireTime: number = 0;

const feishuApi: AxiosInstance = axios.create({
  baseURL: 'https://open.feishu.cn/open-apis',
  timeout: 30000,
});

feishuApi.interceptors.request.use(async (config) => {
  if (!tenantAccessToken || Date.now() >= tokenExpireTime) {
    await refreshTenantAccessToken();
  }
  config.headers.Authorization = `Bearer ${tenantAccessToken}`;
  config.headers['Content-Type'] = 'application/json; charset=utf-8';
  return config;
});

async function refreshTenantAccessToken(): Promise<void> {
  try {
    const response = await axios.post(
      'https://open.feishu.cn/open-apis/auth/v3/tenant_access_token/internal',
      {
        app_id: config.feishu.appId,
        app_secret: config.feishu.appSecret,
      }
    );
    if (response.data.code === 0) {
      tenantAccessToken = response.data.tenant_access_token;
      tokenExpireTime = Date.now() + (response.data.expire - 60) * 1000;
    } else {
      throw new Error(`获取 tenant_access_token 失败: ${response.data.msg}`);
    }
  } catch (error) {
    console.error('获取 tenant_access_token 失败:', error);
    throw error;
  }
}

export async function getApprovalInstanceList(
  approvalCode: string,
  startTime: number,
  endTime: number,
  pageSize: number = 50,
  pageToken?: string
): Promise<{ data: any[]; hasMore: boolean; pageToken?: string }> {
  let allInstances: any[] = [];

  console.log(`查询审批实例: ${approvalCode}`);
  console.log(`时间范围: ${new Date(startTime).toISOString()} - ${new Date(endTime).toISOString()}`);

  const DAYS_30 = 30 * 24 * 60 * 60 * 1000;
  let currentStartTime = startTime;

  while (currentStartTime < endTime) {
    let currentEndTime = Math.min(currentStartTime + DAYS_30, endTime);
    console.log(`\n查询时间段: ${new Date(currentStartTime).toISOString()} - ${new Date(currentEndTime).toISOString()}`);

    let hasMore = true;
    let currentPageToken = pageToken;

    while (hasMore) {
      const requestBody: any = {
        approval_code: approvalCode,
        instance_status: 'APPROVED',
        instance_start_time_from: currentStartTime.toString(),
        instance_start_time_to: currentEndTime.toString(),
      };

      const params: any = {
        page_size: pageSize,
      };

      if (currentPageToken) {
        params.page_token = currentPageToken;
      }

      const response = await feishuApi.post('/approval/v4/instances/query', requestBody, { params });

      if (response.data.code !== 0) {
        throw new Error(`查询审批实例失败: code=${response.data.code}, msg=${response.data.msg}`);
      }

      const instanceList = response.data.data?.instance_list || [];
      console.log(`本页返回 ${instanceList.length} 条数据`);
      
      for (const item of instanceList) {
        const instanceCode = item.instance?.code;
        if (instanceCode) {
          try {
            const detailResponse = await feishuApi.get(`/approval/v4/instances/${instanceCode}`);
            if (detailResponse.data.code === 0 && detailResponse.data.data) {
              allInstances.push(detailResponse.data.data);
            }
            await new Promise(resolve => setTimeout(resolve, 100));
          } catch (error) {
            console.error(`获取实例详情失败 ${instanceCode}:`, error);
          }
        }
      }

      hasMore = response.data.data?.has_more || false;
      currentPageToken = response.data.data?.page_token;
    }

    currentStartTime = currentEndTime;
  }

  console.log(`\n共找到 ${allInstances.length} 个已通过的审批实例`);
  return { data: allInstances, hasMore: false };
}

export { feishuApi };
