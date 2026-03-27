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
  pageSize: number = 100,
  pageToken?: string
): Promise<{ data: any[]; hasMore: boolean; pageToken?: string }> {
  let allData: any[] = [];
  let hasMore = true;
  let currentPageToken = pageToken;

  while (hasMore) {
    const requestBody: any = {
      approval_code: approvalCode,
      page_size: pageSize,
      start_time: startTime,
      end_time: endTime,
      fields: [
        '所属公司',
        '所属项目',
        '报销类型',
        '用途',
        '金额',
        '付款日期',
        '申请人',
        '支付凭证',
        '总金额',
        '报销人银行卡',
        '付款原因',
        '发票/合同',
      ],
    };

    if (currentPageToken) {
      requestBody.page_token = currentPageToken;
    }

    const response = await feishuApi.post('/approval/v4/instance/search', requestBody);

    if (response.data.code !== 0) {
      throw new Error(`查询审批实例失败: ${response.data.msg}`);
    }

    const instances = response.data.data?.items || [];
    allData = allData.concat(instances);
    hasMore = response.data.data?.has_more || false;
    currentPageToken = response.data.data?.page_token;

    if (!hasMore) break;
  }

  return { data: allData, hasMore: false };
}

export { feishuApi };
