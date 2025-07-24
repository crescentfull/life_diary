/**
 * UI 렌더링 관리자
 * @fileoverview 태그 UI 렌더링을 담당하는 클래스입니다
 */

import { CSS_CLASSES, USER_PERMISSIONS } from './config.js';
import { escapeHtml, $ } from './utils.js';

/**
 * UI 렌더링 관리 클래스
 */
export class UIRenderer {
    constructor() {
        this.tagListElement = $('#tagList');
        this.emptyStateElement = $('#emptyState');
    }

    /**
     * 태그 목록 렌더링
     * @param {Array} tags - 태그 배열
     */
    renderTags(tags) {
        if (!this.tagListElement || !this.emptyStateElement) {
            console.error('Required DOM elements not found');
            return;
        }

        // 태그 분류
        const userTags = tags.filter(tag => !tag.is_default);
        const defaultTags = tags.filter(tag => tag.is_default);

        // 빈 상태 처리
        if (this._shouldShowEmptyState(userTags, defaultTags)) {
            this._showEmptyState();
            return;
        }

        this._hideEmptyState();
        this._renderTagSections(userTags, defaultTags);
    }

    /**
     * 빈 상태 표시 여부 결정
     * @param {Array} userTags - 사용자 태그
     * @param {Array} defaultTags - 기본 태그
     * @returns {boolean} 빈 상태 표시 여부
     * @private
     */
    _shouldShowEmptyState(userTags, defaultTags) {
        return userTags.length === 0 && 
               (!USER_PERMISSIONS.isSuperuser || defaultTags.length === 0);
    }

    /**
     * 빈 상태 표시
     * @private
     */
    _showEmptyState() {
        this.tagListElement.innerHTML = '';
        this.emptyStateElement.style.display = 'block';
    }

    /**
     * 빈 상태 숨김
     * @private
     */
    _hideEmptyState() {
        this.emptyStateElement.style.display = 'none';
    }

    /**
     * 태그 섹션들 렌더링
     * @param {Array} userTags - 사용자 태그
     * @param {Array} defaultTags - 기본 태그
     * @private
     */
    _renderTagSections(userTags, defaultTags) {
        let html = '';

        // 기본 태그 섹션 (관리자에게만 표시)
        if (USER_PERMISSIONS.isSuperuser && defaultTags.length > 0) {
            html += this._renderTagSection({
                title: '기본 태그 (관리자 전용)',
                icon: 'star',
                tags: defaultTags,
                isDefault: true
            });
        }

        // 사용자 태그 섹션
        if (userTags.length > 0) {
            const hasDefaultSection = USER_PERMISSIONS.isSuperuser && defaultTags.length > 0;
            html += this._renderTagSection({
                title: '개인 태그',
                icon: 'user',
                tags: userTags,
                isDefault: false,
                addMarginTop: hasDefaultSection
            });
        }

        this.tagListElement.innerHTML = html;
    }

    /**
     * 태그 섹션 렌더링
     * @param {Object} options - 렌더링 옵션
     * @param {string} options.title - 섹션 제목
     * @param {string} options.icon - 아이콘 클래스
     * @param {Array} options.tags - 태그 배열
     * @param {boolean} [options.isDefault=false] - 기본 태그 여부
     * @param {boolean} [options.addMarginTop=false] - 상단 마진 추가 여부
     * @returns {string} HTML 문자열
     * @private
     */
    _renderTagSection({ title, icon, tags, isDefault = false, addMarginTop = false }) {
        let html = `
            <div class="col-12 mb-3 ${addMarginTop ? 'mt-4' : ''}">
                <h6 class="text-muted">
                    <i class="fas fa-${icon} me-1"></i>
                    ${title}
                </h6>
            </div>
        `;

        tags.forEach(tag => {
            html += this._renderTagCard(tag, isDefault);
        });

        return html;
    }

    /**
     * 태그 카드 렌더링
     * @param {Object} tag - 태그 객체
     * @param {boolean} [isDefault=false] - 기본 태그 여부
     * @returns {string} HTML 문자열
     * @private
     */
    _renderTagCard(tag, isDefault = false) {
        const cardClass = isDefault 
            ? `${CSS_CLASSES.TAG_CARD} ${CSS_CLASSES.DEFAULT_TAG}` 
            : CSS_CLASSES.TAG_CARD;
        
        const badgeClass = isDefault ? CSS_CLASSES.BADGE_DEFAULT : '';

        return `
            <div class="col-md-6 col-lg-4 mb-3">
                <div class="card h-100 ${cardClass}">
                    <div class="card-body">
                        <div class="d-flex align-items-center mb-2">
                            <span class="tag-badge me-2" style="background-color: ${tag.color}; color: white;">
                                ${escapeHtml(tag.name)}
                            </span>
                            ${isDefault ? `<small class="${badgeClass}">기본</small>` : ''}
                        </div>
                        <small class="text-muted">${tag.color}</small>
                    </div>
                    <div class="card-footer bg-transparent">
                        ${this._renderTagActions(tag)}
                    </div>
                </div>
            </div>
        `;
    }

    /**
     * 태그 액션 버튼들 렌더링
     * @param {Object} tag - 태그 객체
     * @returns {string} HTML 문자열
     * @private
     */
    _renderTagActions(tag) {
        const actions = [];

        if (tag.can_edit) {
            actions.push(`
                <button class="btn btn-outline-primary btn-sm flex-fill" 
                        data-action="edit" 
                        data-tag-id="${tag.id}"
                        data-tag-name="${escapeHtml(tag.name)}"
                        data-tag-color="${tag.color}"
                        data-tag-default="${tag.is_default}">
                    <i class="fas fa-edit me-1"></i>수정
                </button>
            `);
        }

        if (tag.can_delete) {
            actions.push(`
                <button class="btn btn-outline-danger btn-sm flex-fill" 
                        data-action="delete" 
                        data-tag-id="${tag.id}"
                        data-tag-name="${escapeHtml(tag.name)}">
                    <i class="fas fa-trash me-1"></i>삭제
                </button>
            `);
        }

        return actions.length > 0 
            ? `<div class="d-flex gap-2">${actions.join('')}</div>`
            : '';
    }

    /**
     * 로딩 상태 표시
     * @param {boolean} [show=true] - 표시 여부
     */
    showLoading(show = true) {
        if (!this.tagListElement) return;

        if (show) {
            this.tagListElement.innerHTML = `
                <div class="col-12">
                    <div class="text-center">
                        <div class="${CSS_CLASSES.LOADING_SPINNER}"></div>
                    </div>
                </div>
            `;
        }
    }

    /**
     * 에러 상태 표시
     * @param {string} message - 에러 메시지
     */
    showError(message) {
        if (!this.tagListElement) return;

        this.tagListElement.innerHTML = `
            <div class="col-12">
                <div class="${CSS_CLASSES.ALERT_DANGER}">
                    <i class="fas fa-exclamation-triangle me-2"></i>
                    ${escapeHtml(message)}
                </div>
            </div>
        `;
    }
}

/**
 * 모달 관리 클래스
 */
export class ModalManager {
    constructor() {
        this.modal = null;
        this.modalElement = $('#tagModal');
        this.titleElement = $('#tagModalTitle');
        this.formElement = $('#tagForm');
        this.nameInput = $('#tagName');
        this.colorInput = $('#tagColor');
        this.isDefaultInput = $('#isDefault');
        this.defaultTagOption = $('#defaultTagOption');
        
        this._initializeModal();
    }

    /**
     * Bootstrap 모달 초기화
     * @private
     */
    _initializeModal() {
        if (this.modalElement && typeof bootstrap !== 'undefined') {
            this.modal = new bootstrap.Modal(this.modalElement);
        }
    }

    /**
     * 새 태그 생성 모달 열기
     */
    openCreateModal() {
        this._resetForm();
        this._setTitle('새 태그 생성');
        this._toggleDefaultTagOption();
        this._show();
    }

    /**
     * 태그 수정 모달 열기
     * @param {Object} tagData - 태그 데이터
     * @param {number} tagData.id - 태그 ID
     * @param {string} tagData.name - 태그명
     * @param {string} tagData.color - 태그 색상
     * @param {boolean} tagData.isDefault - 기본 태그 여부
     */
    openEditModal({ id, name, color, isDefault }) {
        this._setTitle('태그 수정');
        this._fillForm({ name, color, isDefault });
        this._toggleDefaultTagOption();
        this._show();
        
        // 태그 ID 저장
        if (this.modalElement) {
            this.modalElement.dataset.tagId = id;
        }
    }

    /**
     * 모달 닫기
     */
    close() {
        if (this.modal) {
            this.modal.hide();
        }
    }

    /**
     * 현재 편집 중인 태그 ID 반환
     * @returns {number|null} 태그 ID 또는 null
     */
    getCurrentTagId() {
        return this.modalElement?.dataset.tagId 
            ? parseInt(this.modalElement.dataset.tagId, 10) 
            : null;
    }

    /**
     * 폼 데이터 가져오기
     * @returns {Object} 폼 데이터
     */
    getFormData() {
        return {
            name: this.nameInput?.value.trim() || '',
            color: this.colorInput?.value || '#007bff',
            is_default: USER_PERMISSIONS.isSuperuser 
                ? (this.isDefaultInput?.checked || false) 
                : false
        };
    }

    /**
     * 모달 제목 설정
     * @param {string} title - 제목
     * @private
     */
    _setTitle(title) {
        if (this.titleElement) {
            this.titleElement.textContent = title;
        }
    }

    /**
     * 폼 초기화
     * @private
     */
    _resetForm() {
        if (this.formElement) {
            this.formElement.reset();
        }
        
        if (this.colorInput) {
            this.colorInput.value = '#007bff';
        }
        
        if (USER_PERMISSIONS.isSuperuser && this.isDefaultInput) {
            this.isDefaultInput.checked = false;
        }
        
        // 태그 ID 제거
        if (this.modalElement) {
            delete this.modalElement.dataset.tagId;
        }
    }

    /**
     * 폼에 데이터 설정
     * @param {Object} data - 폼 데이터
     * @private
     */
    _fillForm({ name, color, isDefault }) {
        if (this.nameInput) this.nameInput.value = name;
        if (this.colorInput) this.colorInput.value = color;
        
        if (USER_PERMISSIONS.isSuperuser && this.isDefaultInput) {
            this.isDefaultInput.checked = isDefault;
        }
    }

    /**
     * 기본 태그 옵션 표시/숨김
     * @private
     */
    _toggleDefaultTagOption() {
        if (this.defaultTagOption) {
            this.defaultTagOption.style.display = 
                USER_PERMISSIONS.isSuperuser ? 'block' : 'none';
        }
    }

    /**
     * 모달 표시
     * @private
     */
    _show() {
        if (this.modal) {
            this.modal.show();
        }
    }
} 