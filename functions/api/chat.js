// Cloudflare Pages Function —— 作品集 AI 小助手后端
// 路由：POST /api/chat   （与网站同域名，前端直接 fetch('/api/chat')）
// 用的是 Cloudflare Workers AI（免费额度），需要在 Pages 项目里绑定一个名为 AI 的 Workers AI binding。
// 密钥不会暴露给访客：所有 AI 调用都发生在这个服务端函数里。

const SYSTEM_PROMPT = `你是嵌入在设计师宋佳韵（Jiayun Song）作品集网站上的友好小助手。
你的任务：用访客提问所用的语言（中文就用中文，英文就用英文），简短、亲切地回答关于宋佳韵和她作品的问题。
只回答与宋佳韵、她的作品、背景、合作/联系方式相关的问题；无关问题礼貌地引导回她的作品。回答控制在 2-4 句，不要编造没有的信息，不确定就建议对方发邮件联系。

【关于宋佳韵】
- 平面设计师与插画师，多学科背景；目前在伦敦大学金史密斯学院攻读计算艺术硕士（MA Computational Arts），预计 2026 年 9 月毕业。
- 主攻：品牌视觉、书籍/编辑设计、活动与快闪视觉、插画、实体周边制品设计；也做交互/计算艺术（动捕、摄像头交互、动效）。
- 熟练 Photoshop、Illustrator、Figma，并擅长用 AI 工具快速把概念落地。

【代表作品】
- MarriagEmArkeT（量化亲密）：推测性网页档案 + 交互游戏，批判相亲市场的情感商品化。
- /imagine:salmon：动捕黑色幽默生存游戏。
- FragileWE：在线多人手势交互计算艺术。
- 五块石社区品牌更新 & 快闪活动视觉：白金国际平面设计大赛优秀奖。
- 新生·川大博物馆视觉更新与周边：博略杯银奖。
- AS U WISH 如愿以偿：综合设计（平面 + 书籍 + 交互装置）。
- 玉林综合市场 App：UI/UX + AR。
- 制品：Neural Corruption #039 系列、A1152 新年套装（对联/红包/窗花/挂件等）。

【联系方式】
- 邮箱：songjiayun6@outlook.com
- 插画主页：小红书 Pocar1
- 关于合作、约稿、实习/工作机会，都可以通过邮箱联系。`;

export async function onRequestPost(context) {
    const { request, env } = context;
    try {
        if (!env.AI) {
            return Response.json(
                { error: "AI binding 未配置，请在 Cloudflare Pages 项目设置里绑定名为 AI 的 Workers AI。" },
                { status: 500 }
            );
        }

        const body = await request.json().catch(() => ({}));
        const history = Array.isArray(body.messages) ? body.messages : [];

        // 只保留最近几轮 + 做基本清洗，防止超长/滥用
        const recent = history
            .filter(m => m && (m.role === "user" || m.role === "assistant") && typeof m.content === "string")
            .slice(-6)
            .map(m => ({ role: m.role, content: m.content.slice(0, 1000) }));

        if (!recent.length) {
            return Response.json({ error: "empty" }, { status: 400 });
        }

        const messages = [{ role: "system", content: SYSTEM_PROMPT }, ...recent];

        const result = await env.AI.run("@cf/meta/llama-3.1-8b-instruct", {
            messages,
            max_tokens: 400,
            temperature: 0.6,
        });

        return Response.json({ reply: (result.response || "").trim() });
    } catch (err) {
        return Response.json({ error: "server_error" }, { status: 500 });
    }
}
