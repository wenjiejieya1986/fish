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
async function getApprovalInstanceList(approvalCode, startTime, endTime, pageSize = 100, pageToken) {
    let allData = [];
    let hasMore = true;
    let currentPageToken = pageToken;
    while (hasMore) {
        const requestBody = {
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
        if (!hasMore)
            break;
    }
    return { data: allData, hasMore: false };
}
