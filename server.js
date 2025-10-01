// es-module -> import, commonjs -> require
const express = require("express"); // express 안에 있는 이미 구현되어 있는 코드들을 express 객체 형태로 불러오겠다
const cors = require("cors");
const app = express();
const port = 3000;
const dotenv = require("dotenv");
const { createClient } = require("@supabase/supabase-js");
dotenv.config();

const { SUPABASE_KEY: supabasekey, SUPABASE_URL: supabaseurl } = process.env;
console.log("SUPABSE KEY : ", supabasekey);
console.log("SUPABSE URL : ", supabaseurl);
const supabase = createClient(supabaseurl, supabasekey);

app.use(cors());

app.listen(port, () => {
  console.log(`서버가 ${port}번 포트로 실행 중입니다.`);
});

app.get("/", (req, res) => {
  // req -> request -> 전달 받은 데이터나 요청사항
  // res -> response -> 응답할 내용/방식을 담은 객체
  res.send("hello");
});

app.get("/plans", async (req, res) => {
  const { data, error } = await supabase.from("tour_plan").select("*");
  if (error) {
    return res.status(400).json({ error: error.message });
  }
  res.json(data);
});

// DOM listener / server '대기' -> 특정한 요청. -> 응답.
