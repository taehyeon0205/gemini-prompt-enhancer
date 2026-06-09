(() => {
    if (window.hasRunGeminiRewriterClean) return;
    window.hasRunGeminiRewriterClean = true;

    const style = document.createElement('style');
    style.innerHTML = `
        @keyframes popupSlideUp { 0% { opacity: 0; transform: translate(-50%, 20px); } 100% { opacity: 1; transform: translate(-50%, 0); } }
        .fab-hover-effect { transition: all 0.3s cubic-bezier(0.25, 0.8, 0.25, 1); }
        .fab-hover-effect:hover { background: #0b57d0 !important; color: white !important; transform: translateY(-4px); box-shadow: 0 12px 24px rgba(11,87,208,0.3) !important; }
        .fab-hover-effect:active { transform: translateY(0); }
        .popup-btn-hover-effect:hover { filter: brightness(0.95); }
        .popup-btn-hover-effect:active { filter: brightness(0.9); }
        .context-badge { background: #e8eaed; color: #1f1f1f; font-size: 11px; font-weight: 800; padding: 2px 6px; border-radius: 10px; margin-left: 8px; transition: 0.3s; }
        .fab-hover-effect:hover .context-badge { background: #ffffff; color: #0b57d0; }
    `;
    document.head.appendChild(style);

    function maskSensitiveData(text) {
        return text.replace(/[\w.-]+@[\w.-]+\.\w+/g, '[이메일]').replace(/\b\d{3}[-.]?\d{3,4}[-.]?\d{4}\b/g, '[전화번호]').replace(/\b\d{6}[- ]?\d{7}\b/g, '[주민번호]');
    }

    function cleanAndLimitContext(nodes) {
        let totalBudget = 1000;
        let finalContexts = [];
        const stopWords = /^(안녕하세요|감사합니다|네 알겠습니다|물론입니다|좋은 질문이네요)[\s\S]*?/g;
        let reversedNodes = Array.from(nodes).reverse();

        for (let node of reversedNodes) {
            if (totalBudget <= 0) break;
            let text = node.textContent.trim().replace(/\s+/g, ' ').replace(stopWords, '').trim(); 
            text = maskSensitiveData(text);
            if (text.length > totalBudget) {
                finalContexts.unshift(text.substring(0, totalBudget) + "...(생략)");
                totalBudget = 0;
            } else {
                finalContexts.unshift(text);
                totalBudget -= text.length;
            }
        }
        return finalContexts;
    }

    function getRecentContext() {
        try {
            const chatNodes = document.querySelectorAll('message-content, [data-message-author-role], .chat-bubble, article');
            if (!chatNodes || chatNodes.length === 0) return { text: "", count: 0 };
            const recentNodes = Array.from(chatNodes).slice(-3);
            const cleanedContexts = cleanAndLimitContext(recentNodes);
            return { text: cleanedContexts.join('\n[이전 대화]\n'), count: cleanedContexts.length };
        } catch (e) { return { text: "", count: 0 }; }
    }

    function updateBadgeRealtime() {
        const badge = document.getElementById('context-indicator');
        if (!badge) return;
        const contextData = getRecentContext();
        
        // 번개 없이 뇌 아이콘만 깔끔하게 유지
        const newBadgeText = `🧠 ${contextData.count}`;
        if (badge.innerText !== newBadgeText) {
            badge.innerText = newBadgeText;
            const rewriteBtn = document.getElementById('custom-rewrite-btn');
            if (rewriteBtn) rewriteBtn.setAttribute('title', `현재 인식된 이전 대화 맥락: ${contextData.count}개`);
        }
    }

    function createSuggestionUI(originalText, rewrittenText) {
        const existingPopup = document.getElementById('rewriter-popup');
        if (existingPopup) existingPopup.remove();

        const popup = document.createElement('div');
        popup.id = 'rewriter-popup';
        popup.style.cssText = `position: fixed; bottom: 120px; left: 50%; transform: translateX(-50%); background: #ffffff; border: 1px solid rgba(0,0,0,0.05); padding: 24px; border-radius: 24px; box-shadow: 0 12px 36px rgba(0,0,0,0.12), 0 4px 12px rgba(0,0,0,0.08); z-index: 999999; width: 520px; font-family: 'Google Sans', sans-serif, system-ui; animation: popupSlideUp 0.3s ease-out;`;

        popup.innerHTML = `
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px;">
                <h3 style="margin:0; font-size:18px; color:#1f1f1f; display:flex; align-items:center; gap:8px; font-weight:600;"><span style="font-size:20px;">✨</span> 맥락을 이해한 프롬프트</h3>
                <span style="font-size:11px; color:#5f6368; background:#f1f3f4; padding:2px 8px; border-radius:10px;">✍️ 수정 가능</span>
            </div>
            <div style="margin-bottom:16px;">
                <span style="font-size:12px; color:#444746; font-weight:600; margin-bottom:6px; display:block;">원본 텍스트</span>
                <p style="margin:0; font-size:13px; color:#444746; max-height:60px; overflow-y:auto; background:#f0f4f9; padding:12px; border-radius:12px; line-height:1.5;">${originalText}</p>
            </div>
            <div style="margin-bottom:24px;">
                <span style="font-size:12px; color:#0b57d0; font-weight:600; margin-bottom:6px; display:block;">✨ 이렇게 물어보면 훨씬 좋아요!</span>
                <textarea id="rewritten-textarea" style="margin:0; font-size:15px; color:#1f1f1f; font-weight:500; background:#f4f7fc; border: 1px solid #d3e3fd; padding:16px; border-radius:16px; height:130px; width:100%; box-sizing:border-box; resize:vertical; line-height:1.6; font-family:inherit; outline:none;">${rewrittenText}</textarea>
            </div>
            <div style="display: flex; gap: 12px; justify-content: flex-end;">
                <button id="reject-btn" class="popup-btn-hover-effect" style="padding: 10px 20px; border: none; background: transparent; color: #444746; border-radius: 20px; cursor: pointer; font-size: 14px; font-weight:600;">취소</button>
                <button id="accept-btn" class="popup-btn-hover-effect" style="padding: 10px 24px; border: none; background: #0b57d0; color: white; border-radius: 20px; cursor: pointer; font-size: 14px; font-weight:600; box-shadow: 0 2px 6px rgba(11, 87, 208, 0.3);">적용하고 전송</button>
            </div>
        `;
        document.body.appendChild(popup);

        document.getElementById('accept-btn').addEventListener('click', () => { applyTextAndSubmit(document.getElementById('rewritten-textarea').value); popup.remove(); });
        document.getElementById('reject-btn').addEventListener('click', () => { popup.remove(); const input = document.querySelector('div[contenteditable="true"]') || document.querySelector('rich-textarea p'); if(input) input.focus(); });
    }

    function applyTextAndSubmit(text) {
        const inputElement = document.querySelector('div[contenteditable="true"]') || document.querySelector('rich-textarea p');
        if (!inputElement) return;
        inputElement.focus(); inputElement.textContent = text;
        inputElement.dispatchEvent(new Event('input', { bubbles: true, cancelable: true }));
        setTimeout(() => {
            const submitButton = document.querySelector('button[aria-label*="Send message"]') || document.querySelector('button[aria-label*="메시지 보내기"]');
            if (submitButton && !submitButton.disabled) submitButton.click();
            else inputElement.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', keyCode: 13, code: 'Enter', bubbles: true }));
        }, 150);
    }

    function init() {
        if (document.getElementById('custom-rewrite-btn')) return;

        const rewriteBtn = document.createElement('button');
        rewriteBtn.id = 'custom-rewrite-btn';
        rewriteBtn.className = 'fab-hover-effect';
        rewriteBtn.innerHTML = `✨ <b>프롬프트 다듬기</b> <span class="context-badge" id="context-indicator">🧠 0</span>`;
        rewriteBtn.style.cssText = `position: fixed; bottom: 40px; right: 40px; z-index: 999999; background: #ffffff; color: #0b57d0; border: 1px solid #d3e3fd; border-radius: 30px; padding: 14px 20px 14px 24px; font-size: 15px; cursor: pointer; box-shadow: 0 4px 12px rgba(0,0,0,0.1); display: flex; align-items: center; justify-content: center;`;
        document.body.appendChild(rewriteBtn);
        
        updateBadgeRealtime();

        rewriteBtn.addEventListener('click', (e) => {
            e.preventDefault(); e.stopPropagation();

            const inputArea = document.querySelector('div[contenteditable="true"]') || document.querySelector('rich-textarea p');
            const originalText = inputArea ? inputArea.textContent.trim() : "";
            if (!originalText) return alert("먼저 프롬프트를 입력해 주세요!");

            rewriteBtn.innerHTML = "⏳ <b>분석 중...</b>";
            rewriteBtn.disabled = true;

            const contextData = getRecentContext();
            
            chrome.runtime.sendMessage({ action: "rewritePrompt", text: originalText, context: contextData.text || "없음" }, (response) => {
                
                if (response && response.success) {
                    // ✅ 성공 시
                    rewriteBtn.innerHTML = `✨ <b>프롬프트 다듬기</b> <span class="context-badge" id="context-indicator">🧠 ${contextData.count}</span>`;
                    rewriteBtn.disabled = false;
                    createSuggestionUI(originalText, response.rewrittenText);
                } else {
                    // 🚨 스마트 에러 UI 알림
                    const errType = response ? response.errorType : "UNKNOWN";
                    
                    // 1. 429 쿨다운 타이머 (에러 발생 시 강제 대기 모드)
                    if (errType === "RATE_LIMIT") {
                        let timeLeft = response.cooldown || 60;
                        rewriteBtn.style.background = '#b3261e';
                        rewriteBtn.style.color = '#ffffff';
                        rewriteBtn.style.borderColor = '#b3261e';

                        const timerInterval = setInterval(() => {
                            timeLeft -= 1;
                            rewriteBtn.innerHTML = `⏳ <b>${timeLeft}초 후 리셋</b>`;
                            
                            if (timeLeft <= 0) {
                                clearInterval(timerInterval);
                                rewriteBtn.style.background = '#ffffff';
                                rewriteBtn.style.color = '#0b57d0';
                                rewriteBtn.style.borderColor = '#d3e3fd';
                                rewriteBtn.disabled = false;
                                updateBadgeRealtime();
                                rewriteBtn.innerHTML = `✨ <b>프롬프트 다듬기</b> <span class="context-badge" id="context-indicator">🧠 ${contextData.count}</span>`;
                            }
                        }, 1000);
                    } 
                    // 2. 직관적인 에러 애니메이션 (API 오류, 모델 오류 등)
                    else {
                        let userFriendlyMsg = "알 수 없는 오류가 발생했습니다.";
                        let icon = "⚠️";

                        if (errType === "AUTH_ERROR") {
                            userFriendlyMsg = "API 키 오류 (설정 확인)";
                            icon = "🔑";
                        } else if (errType === "MODEL_NOT_FOUND") {
                            userFriendlyMsg = "지원 중단 모델 (설정 확인)";
                            icon = "🚫";
                        } else if (errType === "SERVER_ERROR") {
                            userFriendlyMsg = "서버 응답 지연 (잠시 후 시도)";
                            icon = "☁️";
                        } else if (errType === "BAD_REQUEST") {
                            userFriendlyMsg = "프롬프트 형식 오류";
                            icon = "📝";
                        }

                        rewriteBtn.style.background = '#b3261e';
                        rewriteBtn.style.color = '#ffffff';
                        rewriteBtn.style.borderColor = '#b3261e';
                        rewriteBtn.innerHTML = `${icon} <b>${userFriendlyMsg}</b>`;

                        setTimeout(() => {
                            rewriteBtn.style.background = '#ffffff';
                            rewriteBtn.style.color = '#0b57d0';
                            rewriteBtn.style.borderColor = '#d3e3fd';
                            rewriteBtn.disabled = false;
                            updateBadgeRealtime(); 
                            rewriteBtn.innerHTML = `✨ <b>프롬프트 다듬기</b> <span class="context-badge" id="context-indicator">🧠 ${contextData.count}</span>`;
                        }, 3500);
                    }
                }
            });
        });
    }

    window.addEventListener('load', init);
    const observer = new MutationObserver(() => { if (!document.getElementById('custom-rewrite-btn')) init(); else updateBadgeRealtime(); });
    observer.observe(document.body, { childList: true, subtree: true });
})();