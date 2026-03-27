import { feishuApi } from './approval';

export async function getUserOpenIdByName(name: string): Promise<string | null> {
  try {
    const response = await feishuApi.get('/contact/v3/users', {
      params: {
        user_id_type: 'open_id',
        page_size: 50,
      },
    });

    if (response.data.code !== 0) {
      throw new Error(`获取用户列表失败: ${response.data.msg}`);
    }

    const users = response.data.data?.items || [];
    const user = users.find(
      (u: any) => u.name === name || u.en_name === name
    );

    return user?.open_id || null;
  } catch (error) {
    console.error(`获取用户 ${name} OpenID 失败:`, error);
    return null;
  }
}

export async function getUserOpenIdsByNames(names: string[]): Promise<string[]> {
  const openIds: string[] = [];

  for (const name of names) {
    const openId = await getUserOpenIdByName(name);
    if (openId) {
      openIds.push(openId);
    } else {
      console.warn(`未找到用户: ${name}`);
    }
  }

  return openIds;
}
