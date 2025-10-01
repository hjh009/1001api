// server.js
const express = require("express");
const cors = require("cors");
const dotenv = require("dotenv");
const { createClient } = require("@supabase/supabase-js");
const { GoogleGenerativeAI } = require("@google/generative-ai");

dotenv.config();
const app = express();
const port = 3000;

// Supabase 클라이언트 초기화
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_KEY
);

// Google Generative AI 클라이언트 초기화
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

app.use(cors());
app.use(express.json());

// GET /plans - 모든 여행 계획 조회
app.get("/plans", async (req, res) => {
  try {
    const { data, error } = await supabase
      .from("tour_plan")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) throw error;
    res.json(data);
  } catch (error) {
    console.error("Plans 조회 오류:", error);
    res.status(400).json({ error: error.message });
  }
});

// POST /plans - 새 여행 계획 추가
app.post("/plans", async (req, res) => {
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
    if (!plan[field]) {
      return res.status(400).json({
        error: `${field} 필드가 필요합니다.`,
      });
    }
  }

  // 날짜 유효성 검증
  const startDate = new Date(plan.start_date);
  const endDate = new Date(plan.end_date);

  if (endDate < startDate) {
    return res.status(400).json({
      error: "종료일은 시작일보다 이후여야 합니다.",
    });
  }

  // 인원수 검증
  if (plan.people_count < 1) {
    return res.status(400).json({
      error: "인원수는 1명 이상이어야 합니다.",
    });
  }

  // AI 제안 생성
  plan.ai_suggestion = "";
  try {
    const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });

    const daysDiff =
      Math.ceil((endDate - startDate) / (1000 * 60 * 60 * 24)) + 1;

    const prompt = `
당신은 전문 여행 플래너입니다. 아래 정보를 바탕으로 상세한 일일 여행 일정을 만들어주세요.

[여행 정보]
- 목적지: ${plan.destination}
- 여행 목적: ${plan.purpose}
- 기간: ${plan.start_date} ~ ${plan.end_date} (${daysDiff}일)
- 인원: ${plan.people_count}명

[요구사항]
1. 각 날짜별로 구체적인 일정을 작성해주세요
2. 이동 시간과 식사 시간을 고려해주세요
3. 여행 목적에 맞는 장소를 추천해주세요
4. 인원수를 고려한 팁을 포함해주세요
5. 간결하고 실용적인 형식으로 작성해주세요

형식 예시:
📅 Day 1 (날짜)
- 오전: [활동]
- 점심: [식사 추천]
- 오후: [활동]
- 저녁: [활동/식사]

💡 추가 팁:
- [유용한 정보]
`;

    const result = await model.generateContent(prompt);
    const response = await result.response;
    plan.ai_suggestion = response.text();

    console.log("✅ AI 제안 생성 완료");
  } catch (err) {
    console.error("❌ AI 호출 실패:", err.message);
    plan.ai_suggestion = `AI 제안을 생성할 수 없습니다. (오류: ${err.message})`;
  }

  // Supabase에 데이터 저장
  try {
    const { data, error } = await supabase
      .from("tour_plan")
      .insert([plan])
      .select()
      .single();

    if (error) throw error;

    console.log("✅ 여행 계획 저장 완료:", data.id);
    res.status(201).json(data);
  } catch (error) {
    console.error("❌ DB 저장 오류:", error);
    res.status(400).json({ error: error.message });
  }
});

// DELETE /plans/:planId - 여행 계획 삭제
app.delete("/plans/:planId", async (req, res) => {
  const { planId } = req.params;

  try {
    const { error } = await supabase
      .from("tour_plan")
      .delete()
      .eq("id", planId);

    if (error) throw error;

    console.log("✅ 여행 계획 삭제 완료:", planId);
    res.status(204).send();
  } catch (error) {
    console.error("❌ 삭제 오류:", error);
    res.status(400).json({ error: error.message });
  }
});

// 서버 시작
app.listen(port, () => {
  console.log(`🚀 서버 실행 중: http://localhost:${port}`);
  console.log(
    "📌 Supabase URL:",
    process.env.SUPABASE_URL ? "설정됨 ✅" : "누락됨 ❌"
  );
  console.log(
    "📌 Gemini API Key:",
    process.env.GEMINI_API_KEY ? "설정됨 ✅" : "누락됨 ❌"
  );
});
