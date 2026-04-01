const Anthropic = require('@anthropic-ai/sdk');

const client = new Anthropic({
    apiKey: 'sk-kimi-2mZaQf6fRT3pvQegC3ypQ9uy8gRAgbY2BCnMpwjkMrr6yakzRposNZ15QJuMPAlI',
    baseURL: 'https://api.kimi.com/coding'
});

async function test() {
    console.log('开始测试 Anthropic SDK...');
    console.time('API调用');
    try {
        const response = await client.messages.create({
            model: 'kimi-for-coding',
            max_tokens: 20,
            messages: [{ role: 'user', content: 'Hello' }]
        });
        console.timeEnd('API调用');
        console.log('成功:', response.content[0].text);
    } catch (error) {
        console.timeEnd('API调用');
        console.error('失败:', error.status, error.message);
    }
}

test();
