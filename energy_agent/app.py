import streamlit as st
from agent import run_once  # 匯入你剛寫的 agent

st.title("🧠 Energy Agent 聊天介面")

user_input = st.text_input("輸入你的問題：", placeholder="例如：台積電最近有什麼新聞？")

if st.button("送出") and user_input:
    with st.spinner("AI 正在思考中..."):
        response = run_once(user_input)
    st.success("回答：")
    st.write(response)
