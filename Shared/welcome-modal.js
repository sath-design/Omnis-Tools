/**
 * WelcomeModal
 * 初回アクセス時にツールの概要を表示するモーダル
 */
export class WelcomeModal {
    /**
     * @param {string} toolId - ツール固有のID (localStorageのキーに使用)
     * @param {object} content - 表示内容
     * @param {string} content.title - タイトル
     * @param {string} content.description - 説明文
     * @param {string[]} content.features - 特徴リスト (オプション)
     */
    constructor(toolId, content) {
        this.toolId = toolId;
        this.content = content;
        this.storageKey = `omnis_welcome_seen_${toolId}`;
    }

    init() {
        // 既に「表示しない」を選択している場合は何もしない
        if (localStorage.getItem(this.storageKey) === 'true') {
            return;
        }
        this.render();
    }

    render() {
        // モーダルコンテナ
        const modalOverlay = document.createElement('div');
        modalOverlay.className = 'fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm animate-fade-in p-4';
        modalOverlay.id = `welcome-modal-${this.toolId}`;

        // 特徴リストのHTML生成
        const featuresHtml = this.content.features
            ? `<ul class="space-y-2 mb-6">
                ${this.content.features.map(f => `
                    <li class="flex items-start text-sm text-gray-300">
                        <svg class="w-5 h-5 text-blue-400 mr-2 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path>
                        </svg>
                        <span>${f}</span>
                    </li>
                `).join('')}
               </ul>`
            : '';

        // モーダルコンテンツ
        modalOverlay.innerHTML = `
            <div class="bg-gray-800 rounded-xl border border-gray-700 shadow-2xl max-w-md w-full overflow-hidden transform transition-all scale-100">
                <!-- Header -->
                <div class="bg-gray-900/50 px-6 py-4 border-b border-gray-700 flex justify-between items-center">
                    <h2 class="text-xl font-bold text-white flex items-center gap-2">
                        <span class="text-2xl">👋</span> ${this.content.title}
                    </h2>
                    <button id="btn-close-cross-${this.toolId}" class="text-gray-400 hover:text-white transition-colors">
                        <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
                        </svg>
                    </button>
                </div>
                
                <!-- Body -->
                <div class="p-6">
                    <p class="text-gray-300 leading-relaxed mb-6">
                        ${this.content.description}
                    </p>
                    
                    ${featuresHtml}

                    <div class="flex items-center justify-between mt-8 pt-4 border-t border-gray-700">
                        <label class="flex items-center space-x-2 cursor-pointer group">
                            <input type="checkbox" id="check-dont-show-${this.toolId}" class="w-4 h-4 rounded border-gray-600 bg-gray-700 text-blue-500 focus:ring-blue-500/50 transition-colors">
                            <span class="text-sm text-gray-400 group-hover:text-gray-300 transition-colors">${this.content.dontShowLabel || '次回から表示しない'}</span>
                        </label>
                        
                        <button id="btn-start-${this.toolId}" class="bg-blue-600 hover:bg-blue-500 text-white px-6 py-2 rounded-lg font-bold shadow-lg shadow-blue-900/20 transition-all hover:-translate-y-0.5">
                            ${this.content.startLabel || 'はじめる'}
                        </button>
                    </div>
                </div>
            </div>
        `;

        document.body.appendChild(modalOverlay);

        // イベントリスナー設定
        const close = () => {
            const checkbox = document.getElementById(`check-dont-show-${this.toolId}`);
            if (checkbox && checkbox.checked) {
                localStorage.setItem(this.storageKey, 'true');
            }
            // アニメーション付きで閉じる
            modalOverlay.classList.add('opacity-0');
            setTimeout(() => modalOverlay.remove(), 300);
        };

        document.getElementById(`btn-close-cross-${this.toolId}`).addEventListener('click', close);
        document.getElementById(`btn-start-${this.toolId}`).addEventListener('click', close);

        // 背景クリックで閉じる
        modalOverlay.addEventListener('click', (e) => {
            if (e.target === modalOverlay) close();
        });
    }
}
