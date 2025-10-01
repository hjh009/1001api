// es-module -> import, commonjs -> require

const express = require("express"); //express 안에 이미 구현되어있는 코드들을 express 객체 형태로 불러오는 것

const app = express(); //express() -> app 객체 생성
const PORT = 3000;
const cors = require("cors");
app.listen(PORT, () => {
  console.log(`http://localhost:${PORT}`);
}); //서버 오픈
app.get("/", (req, res) => {
  res.send("Hello World"); //응답
}); //get -> 요청, '/' -> 경로, req -> 요청정보, res -> 응답정보

