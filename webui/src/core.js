/**
 * AMMF WebUI 核心功能模块
 * 提供Shell命令执行能力
 * 支持KernelSU和MMRL WebUI X
 */

export const Core = {
    // 模块路径
    MODULE_PATH: '/data/adb/modules/AMMF/',



    /**
     * 执行单个 shell 命令。
     * @param {string} command 要执行的 shell 命令。
     * @param {function(string): void} [callback] 命令执行后的回调函数，接收命令输出作为参数。
     */
    execCommand(command, callback) {
        const callbackName = `callback_${Date.now()}_${Math.floor(Math.random() * 1000)}`;

        window[callbackName] = (output) => {
            if (callback) {
                callback(output);
            }
            delete window[callbackName];
        };

        if (typeof ksu !== 'undefined' && ksu.exec) {
            ksu.exec(command, callbackName);
        } else {
            console.error('ksu.exec is not defined.');
            if (callback) {
                callback('Error: ksu.exec is not defined.');
            }
        }
    },

    /**
     * 获取 MMRL WebUI X 的莫奈颜色。
     * @returns {Promise<object>} 包含莫奈颜色值的 Promise 对象。
     */
    async getMonetColors() {
        if (typeof mmrl !== 'undefined' && mmrl.getMonetColors && typeof mmrl.getMonetColors === 'function') {
            try {
                const colors = await mmrl.getMonetColors();
                return colors;
            } catch (e) {
                console.error('Failed to get Monet colors from MMRL:', e);
                return {};
            }
        }
        return {};
    },

    /**
     * 在 UI 中显示一个 Toast 消息。
     * @param {string} message 要显示的消息内容。
     * @param {'success' | 'error' | 'info' | 'warning'} [type='info'] 消息类型，影响显示样式。
     */
    showToast(message, type = 'info') {
        const toastContainer = document.getElementById('toast-container');
        if (!toastContainer) {
            console.warn('Toast container not found.');
            return;
        }

        const toast = document.createElement('div');
        toast.className = `toast toast-${type}`;
        toast.textContent = message;

        toastContainer.appendChild(toast);

        // 动画效果
        setTimeout(() => {
            toast.classList.add('show');
        }, 10);

        setTimeout(() => {
            toast.classList.remove('show');
            toast.classList.add('hide');
            toast.addEventListener('transitionend', () => {
                toast.remove();
            }, { once: true });
        }, 3000);
    },
};
