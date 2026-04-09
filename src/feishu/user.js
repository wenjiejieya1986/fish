"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getUserOpenIdByName = getUserOpenIdByName;
exports.getUserOpenIdsByNames = getUserOpenIdsByNames;
const approval_1 = require("./approval");
async function getUserOpenIdByName(name) {
    try {
        if (name.startsWith('ou_')) {
            return name;
        }
        const response = await approval_1.feishuApi.get('/contact/v3/users', {
            params: {
                user_id_type: 'open_id',
                page_size: 50,
            },
        });
        if (response.data.code !== 0) {
            console.error(`获取用户列表失败: code=${response.data.code}, msg=${response.data.msg}`);
            return null;
        }
        const users = response.data.data?.items || [];
        console.log(`搜索用户: ${name}, 找到 ${users.length} 个用户`);
        for (const user of users) {
            console.log(`  - ${user.name} (open_id: ${user.open_id})`);
        }
        const user = users.find((u) => u.name === name || u.en_name === name);
        return user?.open_id || null;
    }
    catch (error) {
        console.error(`获取用户 ${name} OpenID 失败:`, error.response?.data || error.message);
        return null;
    }
}
async function getUserOpenIdsByNames(names) {
    const openIds = [];
    for (const name of names) {
        const openId = await getUserOpenIdByName(name);
        if (openId) {
            openIds.push(openId);
        }
        else {
            console.warn(`未找到用户: ${name}`);
        }
    }
    return openIds;
}
