chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === "rewritePrompt") {
        chrome.storage.sync.get({ apiKey: '', modelName: 'gemini-2.5-flash' }, async (items) => {
            if (!items.apiKey) {
                sendResponse({ success: false, errorType: "AUTH_ERROR" });
                return;
            }

            const url = `https://generativelanguage.googleapis.com/v1beta/models/${items.modelName}:generateContent?key=${items.apiKey.trim()}`;

            const combinedPayload =
`[이전 대화 맥락]
${request.context || ''}

[현재 사용자 입력]
${request.text}`;

            const systemPrompt = `
당신은 세계 최고 수준의 프롬프트 엔지니어(Expert Prompt Engineer)입니다.

당신의 유일한 임무는 사용자의 거칠고 모호한 입력을 AI가 가장 완벽하게 이해하고 최고의 결과물을 낼 수 있는 '고품질의 구체적인 프롬프트'로 재작성(Rewrite)하는 것입니다.

사용자는 당신에게 [이전 대화 맥락]과 [현재 사용자 입력]을 제공합니다. 아래의 규칙을 엄격하게 준수하여 결과물을 출력하세요.

### 📌 1. 동적 맥락 인지 (Context Awareness & Shift)

가장 먼저 [현재 사용자 입력]이 [이전 대화 맥락]과 논리적으로 연결되는지 분석하십시오.

* 맥락이 이어지는 경우:
  사용자가 대명사("이거", "아까 그거", "다시 해봐", "표로 만들어줘" 등)를 사용하거나 주제가 이어질 경우,
  이전 대화 맥락을 바탕으로 생략된 고유명사와 의도를 완벽히 추론하여 프롬프트에 결합하십시오.

* 새로운 주제인 경우 (매우 중요):
  사용자의 입력이 이전 맥락과 완전히 무관한 새로운 질문이나 지시라면,
  이전 대화 맥락을 철저히 무시하십시오.
  억지로 이전 주제와 엮지 말고, 오직 현재 사용자 입력에만 집중하여 독립적인 프롬프트를 생성하십시오.

### 📌 2. 프롬프트 엔지니어링 프레임워크 적용

단순한 문장 교정을 넘어, AI의 성능을 극대화할 수 있도록 다음 기법들을 자동으로 덧붙이십시오.

* 역할 부여 (Role-playing):
  주제에 가장 적합한 최고 전문가의 페르소나를 부여하십시오.

* 명확한 작업 지시 (Task & Objective):
  요구 사항을 구체적이고 뚜렷한 목표로 변환하십시오.

* 제약 조건 및 출력 형식 (Constraints & Format):
  필요하다면 최적의 어조(Tone), 길이, 양식(마크다운, 표, 불릿 리스트 등)을 지시사항에 추가하십시오.

* 단계별 사고 (Chain of Thought):
  논리적 추론이나 복잡한 작업이 필요한 경우,
  "단계별로 생각하고 근거를 제시하세요"와 같은 지시를 포함하십시오.

### 📌 3. 엄격한 출력 형식 (Output Rules)

* 당신은 AI나 챗봇처럼 대화하지 않습니다.
* 인사말("안녕하세요", "네, 알겠습니다")이나 해설("맥락을 반영하여 이렇게 수정했습니다")은 절대 금지합니다.
* 오직 사용자가 즉시 복사해서 사용할 수 있는 최종 완성된 프롬프트 텍스트만 단독으로 출력하십시오.
`;

            try {
                const response = await fetch(url, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        systemInstruction: {
                            parts: [
                                {
                                    text: systemPrompt
                                }
                            ]
                        },
                        contents: [
                            {
                                role: "user",
                                parts: [
                                    {
                                        text: combinedPayload
                                    }
                                ]
                            }
                        ]
                    })
                });

                if (!response.ok) {
                    if (response.status === 429) {
                        sendResponse({
                            success: false,
                            errorType: "RATE_LIMIT",
                            cooldown: 60
                        });
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

                const rewrittenText =
                    data?.candidates?.[0]?.content?.parts?.[0]?.text?.trim();

                if (rewrittenText) {
                    sendResponse({
                        success: true,
                        rewrittenText
                    });
                } else {
                    throw new Error("UNKNOWN");
                }

            } catch (error) {
                sendResponse({
                    success: false,
                    errorType: error.message
                });
            }
        });

        return true;
    }
});