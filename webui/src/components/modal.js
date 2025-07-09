/**
 * 通用弹出框组件
 * 支持自定义标题、内容、按钮和动画
 */

import { I18n } from '../i18n.js';

export class Modal {
    constructor(options = {}) {
        this.options = {
            title: '',
            icon: '',
            content: '',
            buttons: [],
            className: '',
            closeOnOverlay: true,
            closeOnEscape: true,
            ...options
        };
        
        this.overlay = null;
        this.dialog = null;
        this.isClosing = false;
        
        // 绑定事件处理器
        this.handleOverlayClick = this.handleOverlayClick.bind(this);
        this.handleKeyDown = this.handleKeyDown.bind(this);
    }
    
    /**
     * 显示弹出框
     */
    show() {
        if (this.overlay) {
            return; // 已经显示
        }
        
        this.createModal();
        document.body.appendChild(this.overlay);
        
        // 添加element属性以便外部访问
        this.element = this.dialog;
        
        // 添加事件监听器
        if (this.options.closeOnOverlay) {
            this.overlay.addEventListener('click', this.handleOverlayClick);
        }
        
        if (this.options.closeOnEscape) {
            document.addEventListener('keydown', this.handleKeyDown);
        }
        
        // 触发显示动画
        requestAnimationFrame(() => {
            this.overlay.classList.add('show');
        });
        
        return this;
    }
    
    /**
     * 隐藏弹出框
     */
    hide() {
        if (!this.overlay || this.isClosing) {
            return;
        }
        
        this.isClosing = true;
        
        // 移除事件监听器
        this.overlay.removeEventListener('click', this.handleOverlayClick);
        document.removeEventListener('keydown', this.handleKeyDown);
        
        // 添加关闭动画
        this.overlay.classList.add('closing');
        this.dialog.classList.add('closing');
        
        // 动画结束后移除元素
        setTimeout(() => {
            if (this.overlay && this.overlay.parentNode) {
                this.overlay.parentNode.removeChild(this.overlay);
            }
            this.overlay = null;
            this.dialog = null;
            this.isClosing = false;
        }, 200);
        
        return this;
    }
    
    /**
     * 创建弹出框DOM结构
     */
    createModal() {
        // 创建遮罩层
        this.overlay = document.createElement('div');
        this.overlay.className = `modal-overlay ${this.options.className}`;
        
        // 创建对话框
        this.dialog = document.createElement('div');
        this.dialog.className = 'modal-dialog';
        
        // 构建内容
        let html = '';
        
        // 标题部分
        if (this.options.title) {
            html += '<div class="modal-header">';
            html += '<h2 class="modal-title">';
            html += this.options.title;
            html += '</h2>';
            html += '</div>';
        }
        
        // 内容部分
        if (this.options.content) {
            html += '<div class="modal-content">';
            html += this.options.content;
            html += '</div>';
        }
        
        // 按钮部分
        if (this.options.buttons && this.options.buttons.length > 0) {
            html += '<div class="modal-footer">';
            this.options.buttons.forEach(button => {
                const buttonClass = `modal-button ${button.type || 'text'}`;
                html += `<button class="${buttonClass}" data-action="${button.action || ''}">`;
                html += button.text || '';
                html += '</button>';
            });
            html += '</div>';
        }
        
        this.dialog.innerHTML = html;
        this.overlay.appendChild(this.dialog);
        
        // 绑定按钮事件
        this.bindButtonEvents();
    }
    
    /**
     * 绑定按钮事件
     */
    bindButtonEvents() {
        const buttons = this.dialog.querySelectorAll('.modal-button');
        buttons.forEach(button => {
            button.addEventListener('click', (e) => {
                const action = e.target.dataset.action;
                const buttonConfig = this.options.buttons.find(b => b.action === action);
                
                if (buttonConfig && buttonConfig.onClick) {
                    const result = buttonConfig.onClick(this);
                    // 如果回调返回false，不自动关闭弹出框
                    if (result !== false) {
                        this.hide();
                    }
                } else {
                    this.hide();
                }
            });
        });
    }
    
    /**
     * 处理遮罩层点击事件
     */
    handleOverlayClick(e) {
        if (e.target === this.overlay) {
            this.hide();
        }
    }
    
    /**
     * 处理键盘事件
     */
    handleKeyDown(e) {
        if (e.key === 'Escape') {
            this.hide();
        }
    }
    
    /**
     * 更新内容
     */
    updateContent(content) {
        if (this.dialog) {
            const contentElement = this.dialog.querySelector('.modal-content');
            if (contentElement) {
                contentElement.innerHTML = content;
            }
        }
        return this;
    }
    
    /**
     * 静态方法：显示确认对话框
     */
    static confirm(options) {
        const defaultOptions = {
            buttons: [
                {
                    text: I18n.translate('CANCEL', '取消'),
                    type: 'text',
                    action: 'cancel'
                },
                {
                    text: I18n.translate('CONFIRM', '确认'),
                    type: 'filled',
                    action: 'confirm',
                    onClick: options.onConfirm
                }
            ]
        };
        
        return new Modal({ ...defaultOptions, ...options }).show();
    }
    
    /**
     * 静态方法：显示警告对话框
     */
    static alert(options) {
        const defaultOptions = {
            buttons: [
                {
                    text: I18n.translate('OK', '确定'),
                    type: 'filled',
                    action: 'ok'
                }
            ]
        };
        
        return new Modal({ ...defaultOptions, ...options }).show();
    }
    
    /**
     * 静态方法：显示自定义对话框
     */
    static custom(options) {
        return new Modal(options).show();
    }
}

// 导出默认实例
export default Modal;