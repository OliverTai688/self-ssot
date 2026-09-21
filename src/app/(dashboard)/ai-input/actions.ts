"use server";

import { requireUser } from "@/lib/services/auth.service";

export async function getAIResponse(
  text: string,
  mode: string,
  history: Array<{ sender: string; type: string; content: string }>,
  locale: "zh-TW" | "en-US" = "zh-TW"
): Promise<string> {
  await requireUser();

  const groqApiKey = process.env.GROQ_API_KEY;
  const geminiApiKey = process.env.GEMINI_API_KEY;

  if (!groqApiKey && !geminiApiKey) {
    throw new Error("No AI API keys configured");
  }

  // Choose appropriate instructions based on mode context
  const modeLabels: Record<"zh-TW" | "en-US", Record<string, string>> = {
    "zh-TW": {
      general: "一般事項（自動分類）",
      report_gen: "報告彙整與自動生成",
      reflection: "個人反思與自我整理",
      work: "工作任務規劃與專案管理",
      research: "知識庫與學術研究探討",
      chamber: "商會活動與人際關係管理",
      finance: "個人/公司財務記帳",
      life: "生活健康與日常節律",
      company: "公司戰略規劃與願景定版",
    },
    "en-US": {
      general: "general capture and auto-classification",
      report_gen: "report drafting and synthesis",
      reflection: "personal reflection and learning",
      work: "work planning and project management",
      research: "knowledge work and research analysis",
      chamber: "chamber relationships and referral management",
      finance: "personal or company finance drafting",
      life: "life rhythm, health, and routines",
      company: "company strategy and long-range planning",
    },
  };
  const modeLabel = modeLabels[locale][mode] || (locale === "en-US" ? "daily assistant" : "日常助理");

  const systemInstructionText = locale === "en-US"
    ? `You are a Personal OS assistant. The user is currently in ${modeLabel} conversation mode.
Reply directly, warmly, and concisely. Help the user think, organize, or decide the next step.
Do not proactively mention backend import, packaging, 24-hour automatic backup, Ingestion, or other implementation terms. Focus on the user's request and sound like a real AI coworker.`
    : `你是一個 Personal OS (個人作業系統) 助理。當前使用者處於【${modeLabel}】對話模式。
請直接、親切、且精簡地回答使用者的問題、給予回饋或引導思考。
絕對不要在回覆中主動提起任何後端匯入、打包、24小時自動備份或 Ingestion 系統等技術術語，專注於回覆使用者 Request 的內容本身，表現得像一個實體對話的 AI 助手。`;

  // 1. Try Groq first if GROQ_API_KEY is configured
  if (groqApiKey) {
    const groqModel = process.env.GROQ_MODEL || "llama-3.3-70b-versatile";
    
    // Map messages history to OpenAI chat completions format
    const messages = [
      { role: "system", content: systemInstructionText },
      ...history
        .filter((m) => m.type === "text")
        .map((m) => ({
          role: m.sender === "user" ? ("user" as const) : ("assistant" as const),
          content: m.content,
        })),
    ];

    // Ensure current message is appended if not already in history
    if (messages[messages.length - 1].content !== text) {
      messages.push({
        role: "user",
        content: text,
      });
    }

    try {
      const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${groqApiKey}`,
        },
        body: JSON.stringify({
          model: groqModel,
          messages,
          temperature: 0.7,
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error("Groq API Error Response:", errorText);
        throw new Error(`Groq API returned status ${response.status}`);
      }

      const data = await response.json();
      const replyText = data.choices?.[0]?.message?.content;

      if (!replyText) {
        throw new Error("Invalid response format from Groq API");
      }

      return replyText;
    } catch (error) {
      console.error("Failed to query Groq API, falling back to Gemini if available:", error);
      if (!geminiApiKey) throw error;
    }
  }

  // 2. Fallback to Gemini if GEMINI_API_KEY is configured
  if (geminiApiKey) {
    const contents = history
      .filter((m) => m.type === "text")
      .map((m) => ({
        role: m.sender === "user" ? "user" : "model",
        parts: [{ text: m.content }],
      }));

    if (contents.length === 0 || contents[contents.length - 1].parts[0].text !== text) {
      contents.push({
        role: "user",
        parts: [{ text }],
      });
    }

    try {
      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${geminiApiKey}`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            contents,
            systemInstruction: {
              parts: [{ text: systemInstructionText }],
            },
          }),
        }
      );

      if (!response.ok) {
        const errorText = await response.text();
        console.error("Gemini API Error Response:", errorText);
        throw new Error(`Gemini API returned status ${response.status}`);
      }

      const data = await response.json();
      const replyText = data.candidates?.[0]?.content?.parts?.[0]?.text;

      if (!replyText) {
        throw new Error("Invalid response format from Gemini API");
      }

      return replyText;
    } catch (error) {
      console.error("Failed to query Gemini API:", error);
      throw error;
    }
  }

  throw new Error("No AI API keys configured");
}
