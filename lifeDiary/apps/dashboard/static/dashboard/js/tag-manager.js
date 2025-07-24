/**
 * 태그 관리자
 * @fileoverview 태그 로드, 생성, 편집, 삭제 기능을 담당하는 클래스입니다
 */

import { ELEMENT_IDS, MESSAGES, CSS_CLASSES } from './config.js';
import { escapeHtml, NotificationManager, ModalUtils, FormUtils, $ } from './utils.js';
import { tagApi } from './api.js';

/**
 * 태그 관리 클래스
 */
export class TagManager {
    constructor() {
        this.availableTags = [];
        this.isLoading = false;
        this.modals = new Map();
        
        this._initializeModalRefs();
    }

    /**
     * 모달 참조 초기화
     * @private
     */
    _initializeModalRefs() {
        // 모달 ID 목록
        const modalIds = [
            ELEMENT_IDS.CREATE_TAG_MODAL,
            ELEMENT_IDS.TAG_MANAGE_MODAL,
            ELEMENT_IDS.TAG_EDIT_MODAL
        ];
        
        modalIds.forEach(modalId => {
            this.modals.set(modalId, null);
        });
    }

    /**
     * 사용 가능한 태그 목록 로드
     */
    async loadAvailableTags() {
        if (this.isLoading) return;
        
        this.isLoading = true;
        const tagContainer = $(ELEMENT_IDS.TAG_CONTAINER);
        const tagLegend = $(ELEMENT_IDS.TAG_LEGEND);
        
        try {
            if (tagContainer) {
                this._showLoadingState(tagContainer);
            }
            
            this.availableTags = await tagApi.getTags();
            
            if (tagContainer) {
                this._renderTagContainer(this.availableTags, tagContainer);
            }
            
            if (tagLegend) {
                this._renderTagLegend(this.availableTags, tagLegend);
            }
            
        } catch (error) {
            console.error('태그 로드 오류:', error);
            this._showTagError(MESSAGES.ERROR.LOAD_FAILED + ': ' + error.message, tagContainer, tagLegend);
        } finally {
            this.isLoading = false;
        }
    }

    /**
     * 새 태그 생성 모달 열기
     */
    async openCreateModal() {
        try {
            const modal = await this._getSafeModal(ELEMENT_IDS.CREATE_TAG_MODAL);
            if (!modal) return;
            
            const modalElement = $(ELEMENT_IDS.CREATE_TAG_MODAL);
            if (!modalElement) return;
            
            // 모달이 완전히 열린 후 폼 설정
            modalElement.addEventListener('shown.bs.modal', () => {
                this._setupCreateTagForm();
                FormUtils.focusInput('#newTagName');
            }, { once: true });
            
            modal.show();
        } catch (error) {
            console.error('새 태그 모달 열기 오류:', error);
            NotificationManager.showError(MESSAGES.ERROR.MODAL_CREATION_FAILED);
        }
    }

    /**
     * 태그 관리 모달 열기
     */
    async openManageModal() {
        try {
            const modal = await this._getSafeModal(ELEMENT_IDS.TAG_MANAGE_MODAL);
            if (!modal) return;
            
            const modalElement = $(ELEMENT_IDS.TAG_MANAGE_MODAL);
            if (!modalElement) return;
            
            // 모달이 완전히 열린 후 태그 목록 로드
            modalElement.addEventListener('shown.bs.modal', () => {
                this._loadTagListForModal();
            }, { once: true });
            
            modal.show();
        } catch (error) {
            console.error('태그 관리 모달 열기 오류:', error);
            NotificationManager.showError(MESSAGES.ERROR.MODAL_CREATION_FAILED);
        }
    }

    /**
     * 태그 편집 모달 열기
     * @param {number} tagId - 태그 ID
     * @param {string} tagName - 태그명
     * @param {string} tagColor - 태그 색상
     */
    async openEditModal(tagId, tagName, tagColor) {
        try {
            const modal = await this._getSafeModal(ELEMENT_IDS.TAG_EDIT_MODAL);
            if (!modal) return;
            
            // 폼 필드 설정
            const editTagIdInput = $('#editTagId');
            const editTagNameInput = $('#editTagName');
            const editTagColorInput = $('#editTagColor');
            const editTagColorTextInput = $('#editTagColorText');
            
            if (!editTagIdInput || !editTagNameInput || !editTagColorInput || !editTagColorTextInput) {
                throw new Error('태그 편집 폼 요소를 찾을 수 없습니다.');
            }
            
            editTagIdInput.value = tagId;
            editTagNameInput.value = tagName;
            editTagColorInput.value = tagColor;
            editTagColorTextInput.value = tagColor;
            
            modal.show();
        } catch (error) {
            console.error('태그 편집 모달 열기 오류:', error);
            NotificationManager.showError(error.message || MESSAGES.ERROR.MODAL_CREATION_FAILED);
        }
    }

    /**
     * 태그 삭제
     * @param {number} tagId - 태그 ID
     * @param {string} tagName - 태그명
     */
    async deleteTag(tagId, tagName) {
        const confirmMessage = `"${tagName}" ${MESSAGES.CONFIRM.DELETE_TAG}`;
        if (!NotificationManager.confirm(confirmMessage)) {
            return;
        }
        
        try {
            const result = await tagApi.deleteTag(tagId);
            
            if (result.success) {
                await this.loadAvailableTags();
                this._loadTagListForModal(); // 관리 모달이 열려있다면 갱신
                NotificationManager.showSuccess(result.message);
            }
        } catch (error) {
            console.error('태그 삭제 오류:', error);
            NotificationManager.showError(error.message || MESSAGES.ERROR.DELETE_FAILED);
        }
    }

    /**
     * 안전한 모달 가져오기
     * @param {string} modalId - 모달 ID
     * @returns {Promise<bootstrap.Modal|null>} 모달 인스턴스
     * @private
     */
    async _getSafeModal(modalId) {
        if (!this.modals.has(modalId)) {
            this.modals.set(modalId, null);
        }
        
        let modal = this.modals.get(modalId);
        
        if (!modal) {
            modal = await ModalUtils.createSafeModal(modalId);
            this.modals.set(modalId, modal);
        }
        
        return modal;
    }

    /**
     * 새 태그 생성 폼 설정
     * @private
     */
    _setupCreateTagForm() {
        const createTagForm = $('#createTagForm');
        if (!createTagForm) return;
        
        // 색상 입력 동기화 설정
        FormUtils.setupColorSync('#newTagColor', '#newTagColorText');
        
        // 기존 이벤트 리스너 제거 후 새로 추가
        const newForm = createTagForm.cloneNode(true);
        createTagForm.parentNode.replaceChild(newForm, createTagForm);
        
        newForm.addEventListener('submit', this._handleCreateTagSubmit.bind(this));
    }

    /**
     * 새 태그 생성 폼 제출 처리
     * @param {Event} event - 폼 제출 이벤트
     * @private
     */
    async _handleCreateTagSubmit(event) {
        event.preventDefault();
        
        const nameInput = $('#newTagName');
        const colorInput = $('#newTagColor');
        const colorTextInput = $('#newTagColorText');
        
        if (!nameInput || !colorInput) {
            NotificationManager.showError('폼 요소를 찾을 수 없습니다.');
            return;
        }
        
        const name = nameInput.value.trim();
        const color = colorInput.value;
        
        if (!name) {
            NotificationManager.showError(MESSAGES.ERROR.TAG_NAME_REQUIRED);
            nameInput.focus();
            return;
        }
        
        try {
            const result = await tagApi.createTag({ name, color });
            
            if (result.success) {
                // 폼 초기화
                FormUtils.resetForm(event.target);
                if (colorInput) colorInput.value = '#3498db';
                if (colorTextInput) colorTextInput.value = '#3498db';
                
                // 메인 페이지 태그 목록 새로고침
                await this.loadAvailableTags();
                
                // 성공 피드백
                this._showFormSuccess(event.target);
                
                // 2초 후 모달 닫기
                setTimeout(() => {
                    const modal = this.modals.get(ELEMENT_IDS.CREATE_TAG_MODAL);
                    if (modal) modal.hide();
                }, 2000);
                
                console.log('태그 생성 성공:', result.message);
            }
        } catch (error) {
            console.error('태그 생성 오류:', error);
            NotificationManager.showError(error.message || MESSAGES.ERROR.SAVE_FAILED);
        }
    }

    /**
     * 모달용 태그 목록 로드
     * @private
     */
    async _loadTagListForModal() {
        const tagListElement = $('#tagList');
        if (!tagListElement) return;
        
        try {
            const tags = await tagApi.getTags();
            this._renderModalTagList(tags, tagListElement);
        } catch (error) {
            console.error('모달 태그 로드 오류:', error);
            tagListElement.innerHTML = `
                <div class="${CSS_CLASSES.ALERT_DANGER}">
                    태그 로드 실패: ${error.message}
                </div>
            `;
        }
    }

    /**
     * 태그 컨테이너 렌더링
     * @param {Array} tags - 태그 배열
     * @param {HTMLElement} container - 컨테이너 요소
     * @private
     */
    _renderTagContainer(tags, container) {
        if (tags.length === 0) {
            container.innerHTML = `
                <div class="text-center py-4">
                    <i class="fas fa-tags text-muted mb-3" style="font-size: 2rem;"></i>
                    <p class="text-muted mb-3">태그를 먼저 생성해주세요.</p>
                    <button class="btn btn-primary btn-sm" id="createFirstTagBtn">
                        <i class="fas fa-plus me-1"></i>
                        첫 번째 태그 만들기
                    </button>
                </div>
            `;
            
            // 첫 번째 태그 생성 버튼 이벤트
            const createFirstTagBtn = $('#createFirstTagBtn');
            if (createFirstTagBtn) {
                createFirstTagBtn.addEventListener('click', () => {
                    this.openCreateModal();
                });
            }
            return;
        }
        
        let html = '';
        tags.forEach(tag => {
            html += `
                <button class="btn btn-outline-secondary btn-sm ${CSS_CLASSES.TAG_BUTTON}" 
                        data-tag-id="${tag.id}"
                        data-tag-color="${escapeHtml(tag.color)}"
                        data-tag-name="${escapeHtml(tag.name)}"
                        style="border-color: ${tag.color}; margin: 2px;">
                    <span class="badge me-2" style="background-color: ${tag.color};">&nbsp;</span>
                    ${escapeHtml(tag.name)}
                </button>
            `;
        });
        
        container.innerHTML = html;
    }

    /**
     * 태그 범례 렌더링
     * @param {Array} tags - 태그 배열
     * @param {HTMLElement} legend - 범례 요소
     * @private
     */
    _renderTagLegend(tags, legend) {
        if (tags.length === 0) {
            legend.innerHTML = '<small class="text-muted">사용 가능한 태그가 없습니다.</small>';
            return;
        }
        
        let html = '';
        tags.forEach(tag => {
            html += `
                <span class="badge me-2 mb-1" style="background-color: ${tag.color};">
                    ${escapeHtml(tag.name)}
                </span>
            `;
        });
        
        legend.innerHTML = html;
    }

    /**
     * 모달용 태그 목록 렌더링
     * @param {Array} tags - 태그 배열
     * @param {HTMLElement} container - 컨테이너 요소
     * @private
     */
    _renderModalTagList(tags, container) {
        let html = `
            <div class="d-flex justify-content-between align-items-center mb-3">
                <h6 class="mb-0">
                    <i class="fas fa-tags me-2"></i>태그 목록 (${tags.length}개)
                </h6>
                <button class="btn btn-sm btn-outline-success" onclick="window.dashboardTagManager?.openCreateModal()">
                    <i class="fas fa-plus me-1"></i>새 태그 추가
                </button>
            </div>
        `;
        
        tags.forEach(tag => {
            html += `
                <div class="d-flex align-items-center justify-content-between mb-2 p-3 border rounded">
                    <div class="d-flex align-items-center">
                        <span class="badge me-3" style="background-color: ${tag.color}; width: 20px; height: 20px;">&nbsp;</span>
                        <div>
                            <span class="fw-bold">${escapeHtml(tag.name)}</span>
                            ${tag.is_default ? '<small class="text-muted ms-2">(기본 태그)</small>' : ''}
                        </div>
                    </div>
                    <div>
                        ${tag.can_edit ? `
                            <button class="btn btn-sm btn-outline-primary me-1" 
                                    onclick="window.dashboardTagManager?.openEditModal(${tag.id}, '${escapeHtml(tag.name)}', '${tag.color}')" 
                                    title="편집">
                                <i class="fas fa-edit"></i>
                            </button>
                        ` : ''}
                        ${tag.can_delete ? `
                            <button class="btn btn-sm btn-outline-danger" 
                                    onclick="window.dashboardTagManager?.deleteTag(${tag.id}, '${escapeHtml(tag.name)}')" 
                                    title="삭제">
                                <i class="fas fa-trash"></i>
                            </button>
                        ` : ''}
                    </div>
                </div>
            `;
        });
        
        container.innerHTML = html;
    }

    /**
     * 로딩 상태 표시
     * @param {HTMLElement} container - 컨테이너 요소
     * @private
     */
    _showLoadingState(container) {
        container.innerHTML = `
            <div class="text-center py-4">
                <div class="${CSS_CLASSES.LOADING_SPINNER}"></div>
                <p class="text-muted mt-2">태그를 불러오는 중...</p>
            </div>
        `;
    }

    /**
     * 태그 에러 표시
     * @param {string} message - 에러 메시지
     * @param {HTMLElement} container - 컨테이너 요소
     * @param {HTMLElement} legend - 범례 요소
     * @private
     */
    _showTagError(message, container, legend) {
        if (container) {
            container.innerHTML = `
                <div class="text-center py-4">
                    <i class="fas fa-exclamation-triangle text-danger mb-3" style="font-size: 2rem;"></i>
                    <p class="text-danger mb-3">${escapeHtml(message)}</p>
                    <button class="btn btn-outline-primary btn-sm" onclick="window.dashboardTagManager?.loadAvailableTags()">
                        <i class="fas fa-redo me-1"></i>다시 시도
                    </button>
                </div>
            `;
        }
        
        if (legend) {
            legend.innerHTML = '<small class="text-danger">태그 로드 실패</small>';
        }
    }

    /**
     * 폼 성공 피드백 표시
     * @param {HTMLFormElement} form - 폼 요소
     * @private
     */
    _showFormSuccess(form) {
        form.style.border = '2px solid #28a745';
        setTimeout(() => {
            form.style.border = '';
        }, 2000);
    }

    /**
     * 사용 가능한 태그 목록 반환
     * @returns {Array} 태그 배열
     */
    getAvailableTags() {
        return [...this.availableTags];
    }

    /**
     * 특정 태그 정보 반환
     * @param {number} tagId - 태그 ID
     * @returns {Object|null} 태그 정보
     */
    getTagById(tagId) {
        return this.availableTags.find(tag => tag.id === tagId) || null;
    }

    /**
     * 태그 목록 새로고침
     */
    async refresh() {
        await this.loadAvailableTags();
    }

    /**
     * 리소스 정리
     */
    destroy() {
        // 모달 인스턴스 정리
        this.modals.forEach(modal => {
            if (modal) {
                modal.dispose();
            }
        });
        this.modals.clear();
        
        this.availableTags = [];
        this.isLoading = false;
    }
}

/**
 * 글로벌 태그 관리자 인스턴스
 */
export const tagManager = new TagManager(); 