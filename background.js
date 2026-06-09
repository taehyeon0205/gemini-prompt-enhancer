chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === "rewritePrompt") {
        chrome.storage.sync.get({ apiKey: '', modelName: 'gemini-2.5-flash' }, async (items) => {
            if (!items.apiKey) {
                sendResponse({ success: false, errorType: "AUTH_ERROR" });
                return;
            }

            const url = `https://generativelanguage.googleapis.com/v1beta/models/${items.modelName}:generateContent?key=${items.apiKey.trim()}`;
            const combinedPayload = `[최근 대화 맥락]\n${request.context}\n\n[다듬을 대상]\n${request.text}`;

            try {
                const response = await fetch(url, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        systemInstruction: { parts: [{ text: "당신은 사용자의 모호한 입력을 구체적인 프롬프트로 재작성(Rewriting)하는 변환기입니다.\n\n[작업 규칙]\n1. [최근 대화 맥락]을 참고하여 생략된 주어, 목적어, 지시대명사(이거, 저거)를 구체적인 단어로 치환하세요.\n2. [다듬을 대상]을 'AI에게 직접 지시하거나 질문하는 완벽한 문장'으로 만드세요. 본인이 AI라는 사실을 언급하지 마세요.\n3. (가장 중요) '최종 결과물:', '이렇게 질문해보세요' 같은 접두어나 부연 설명, 따옴표를 절대 붙이지 마세요. 오직 재작성된 텍스트 자체만 출력하세요." }] },
                        contents: [{ parts: [{ text: combinedPayload }] }]
                    })
                });

                // 🚨 스마트 에러 파서
                if (!response.ok) {
                    if (response.status === 429) {
                        sendResponse({ success: false, errorType: "RATE_LIMIT", cooldown: 60 });
                        return;
                    }
                    
                    let errType = "UNKNOWN";
                    if (response.status === 400) errType = "BAD_REQUEST";
                    if (response.status === 401 || response.status === 403) errType = "AUTH_ERROR";
                    if (response.status === 404) errType = "MODEL_NOT_FOUND";
                    if (response.status >= 500) errType = "SERVER_ERROR";

                    throw new Error(errType);
                }

                const data = await response.json();
                if (data.candidates && data.candidates[0].content.parts[0].text) {
                    sendResponse({ success: true, rewrittenText: data.candidates[0].content.parts[0].text.trim() });
                } else {
                    throw new Error("UNKNOWN");
                }
            } catch (error) {
                sendResponse({ success: false, errorType: error.message });
            }
        });
        return true; 
    }
});