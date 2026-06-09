document.addEventListener('DOMContentLoaded', () => {
    const apiKeyInput = document.getElementById('apiKey');
    const modelSelect = document.getElementById('modelSelect');
    const saveBtn = document.getElementById('saveBtn');
    const statusDiv = document.getElementById('status');

    // 1. 팝업이 열릴 때 기존에 저장된 데이터 불러오기
    chrome.storage.sync.get(['apiKey', 'modelName'], (items) => {
        if (items.apiKey) apiKeyInput.value = items.apiKey;
        if (items.modelName) modelSelect.value = items.modelName;
    });

    // 2. 저장 버튼 클릭 시 데이터 저장하기
    saveBtn.addEventListener('click', () => {
        const apiKey = apiKeyInput.value.trim();
        const modelName = modelSelect.value;

        chrome.storage.sync.set({ apiKey: apiKey, modelName: modelName }, () => {
            // 저장 완료 메시지 표시
            statusDiv.style.display = 'block';
            setTimeout(() => { statusDiv.style.display = 'none'; }, 2000);
        });
    });
});