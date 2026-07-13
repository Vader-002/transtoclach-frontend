// 文件：frontend/functions/api/ask.js

export async function onRequest(context) {
    try {
        // 1️⃣ 从请求体中读取用户输入
        const { question } = await context.request.json();

        // 2️⃣ 如果用户没输入，返回错误
        if (!question) {
            return new Response(JSON.stringify({ error: '请输入问题' }), {
                status: 400,
                headers: { 'Content-Type': 'application/json' }
            });
        }

        // 3️⃣ 从环境变量读取 API 密钥
        const apiKey = context.env.API_KEY;

        // 4️⃣ 调用 DeepSeek API
        const response = await fetch('https://api.deepseek.com/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${apiKey}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                model: 'deepseek-v4-flash',
                messages: [
                    { role: 'system', content: '你是是一个专业的把中文口语转换为中国古代文言文表达的助手，只负责将用户的输入的中文口语转为中国古代文言文表达，不要输出任何额外的解释或标点，如果输入涉及政治敏感和明显色情，直接输出"该内容无法输出。"。' },
                    { role: 'user', content: question }
                ],
                max_tokens: 300,
                "thinking": { "type": "disabled" }
            })
        });

        const data = await response.json();
        const aiAnswer = data.choices?.[0]?.message?.content || 'AI生成失败，请重试。';

        // 5️⃣ 【新增】将数据写入 D1 数据库
        const db = context.env.DB;  // 这里的 DB 必须和你在 Cloudflare 绑定的变量名一致
        await db.prepare(
            'INSERT INTO conversion_logs (user_input, ai_output) VALUES (?, ?)'
        ).bind(question, aiAnswer).run();

        // 6️⃣ 返回结果给前端
        return new Response(JSON.stringify({ answer: aiAnswer }), {
            headers: { 'Content-Type': 'application/json' }
        });

    } catch (error) {
        // 捕获所有异常，返回具体错误信息
        return new Response(JSON.stringify({ error: error.message || '服务器内部错误' }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' }
        });
    }
}