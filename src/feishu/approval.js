"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.feishuApi = void 0;
exports.getApprovalInstanceList = getApprovalInstanceList;
const axios_1 = __importDefault(require("axios"));
const config_1 = require("../config");
let tenantAccessToken = null;
let tokenExpireTime = 0;
const feishuApi = axios_1.default.create({
    baseURL: 'https://open.feishu.cn/open-apis',
    timeout: 30000,
});
exports.feishuApi = feishuApi;
feishuApi.interceptors.request.use(async (config) => {
    if (!tenantAccessToken || Date.now() >= tokenExpireTime) {
        await refreshTenantAccessToken();
    }
    config.headers.Authorization = `Bearer ${tenantAccessToken}`;
    config.headers['Content-Type'] = 'application/json; charset=utf-8';
    return config;
});
async function refreshTenantAccessToken() {
    try {
        const response = await axios_1.default.post('https://open.feishu.cn/open-apis/auth/v3/tenant_access_token/internal', {
            app_id: config_1.config.feishu.appId,
            app_secret: config_1.config.feishu.appSecret,
        });
        if (response.data.code === 0) {
            tenantAccessToken = response.data.tenant_access_token;
            tokenExpireTime = Date.now() + (response.data.expire - 60) * 1000;
        }
        else {
            throw new Error(`获取 tenant_access_token 失败: ${response.data.msg}`);
        }
    }
    catch (error) {
        console.error('获取 tenant_access_token 失败:', error);
        throw error;
    }
}
async function getApprovalInstanceList(approvalCode, startTime, endTime, pageSize = 50, pageToken) {
    let allInstances = [];
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
            const requestBody = {
                approval_code: approvalCode,
                instance_status: 'APPROVED',
                instance_start_time_from: currentStartTime.toString(),
                instance_start_time_to: currentEndTime.toString(),
            };
            const params = {
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
                    }
                    catch (error) {
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
