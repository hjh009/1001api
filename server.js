const express = require("express");
const cors = require("cors");
const app = express();
const port = 3000;
const dotenv = require("dotenv");
dotenv.config();
const { createClient } = require("@supabase/supabase-js");
const { GoogleGenerativeAI } = require("@google/generative-ai"); // 최신 라이브러리

// Supabase
const { SUPABASE_KEY, SUPABASE_URL } = process.env;
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

app.use(cors());
app.use(express.json());

// GET /plans
app.get("/plans", async (req, res) => {
  const { data, error } = await supabase.from("tour_plan").select("*");
  if (error) return res.status(400).json({ error: error.message });
  res.json(data);
});

// POST /plans
app.post("/plans", async (req, res) => {
  try {
    const plan = req.body;

    // 필수 필드 검증
    const requiredFields = [
      "destination",
      "purpose",
      "start_date",
      "end_date",
      "people_count",
    ];
    for (const field of requiredFields) {
      if (!plan[field])
        return res.status(400).json({ error: `${field} 필드가 필요합니다.` });
    }

    // AI 호출
    plan.ai_suggestion = "";
    const genAI = new GoogleGenerativeAI(process.env.GOOGLE_API_KEY);
    const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

    const prompt = `
      [장소] ${plan.destination}
      [목적] ${plan.purpose}
      [시작일] ${plan.start_date} ~ [종료일] ${plan.end_date}
      [인원] ${plan.people_count}명
      위 여행 계획에 맞는 상세 일정을 만들어줘.
    `;

    const aiRes = await model.generateContent(prompt);
    plan.ai_suggestion = aiRes?.response?.text || "AI 제안 없음";

    // Supabase insert
    const { data, error } = await supabase
      .from("tour_plan")
      .insert([plan])
      .select();
    if (error) return res.status(400).json({ error: error.message });

    res.status(201).json(data[0]);
  } catch (err) {
    console.error("POST /plans Error:", err);
    res.status(500).json({ error: err.message || "서버 내부 오류" });
  }
});

// DELETE /plans/:planId
app.delete("/plans/:planId", async (req, res) => {
  const { planId } = req.params;
  const { error } = await supabase.from("tour_plan").delete().eq("id", planId);
  if (error) return res.status(400).json({ error: error.message });
  res.status(204).send();
});

app.listen(port, () => {
  console.log(`서버가 ${port}번 포트로 실행 중입니다.`);
});

console.log("Google API Key:", process.env.GOOGLE_API_KEY);
