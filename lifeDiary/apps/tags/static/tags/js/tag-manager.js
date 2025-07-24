/**
 * 태그 관리자
 * @fileoverview 태그 관리의 핵심 비즈니스 로직을 담당하는 클래스입니다
 */

import { MESSAGES } from './config.js';
import { Validator, LoadingManager, MessageManager, $ } from './utils.js';
import { tagApiService } from './api.js';
import { UIRenderer, ModalManager } from './ui.js';

/**
 * 태그 관리 메인 클래스
 */
export class TagManager {
    constructor() {
        this.apiService = tagApiService;
        this.uiRenderer = new UIRenderer();
        this.modalManager = new ModalManager();
        
        this.tags = [];
        this.isLoading = false;
        
        this._initialize();
    }

    /**
     * 초기화
     * @private
     */
    _initialize() {
        this._setupEventListeners();
        this._loadTags();
    }

    /**
     * 이벤트 리스너 설정
     * @private
     */
    _setupEventListeners() {
        // 새 태그 생성 버튼
        const createTagBtn = $('#createTagBtn');
        if (createTagBtn) {
            createTagBtn.addEventListener('click', () => this.openCreateModal());
        }

        // 태그 저장 버튼
        const saveTagBtn = $('#saveTagBtn');
        if (saveTagBtn) {
            saveTagBtn.addEventListener('click', () => this._saveTag());
        }

        // 폼 제출 방지
        const tagForm = $('#tagForm');
        if (tagForm) {
            tagForm.addEventListener('submit', (e) => {
                e.preventDefault();
                this._saveTag();
            });
        }

        // 태그 리스트 이벤트 위임 (동적 생성 버튼들 처리)
        const tagList = $('#tagList');
        if (tagList) {
            tagList.addEventListener('click', this._handleTagListClick.bind(this));
        }
    }

    /**
     * 태그 리스트 클릭 이벤트 처리
     * @param {Event} event - 클릭 이벤트
     * @private
     */
    _handleTagListClick(event) {
        const button = event.target.closest('button[data-action]');
        if (!button) return;

        const action = button.dataset.action;
        const tagId = parseInt(button.dataset.tagId, 10);
        const tagName = button.dataset.tagName;

        switch (action) {
            case 'edit':
                this._handleEditClick(button);
                break;
            case 'delete':
                this._handleDeleteClick(tagId, tagName);
                break;
        }
    }

    /**
     * 수정 버튼 클릭 처리
     * @param {HTMLElement} button - 클릭된 버튼
     * @private
     */
    _handleEditClick(button) {
        const id = parseInt(button.dataset.tagId, 10);
        const name = button.dataset.tagName;
        const color = button.dataset.tagColor;
        const isDefault = button.dataset.tagDefault === 'true';

        this.openEditModal({ id, name, color, isDefault });
    }

    /**
     * 삭제 버튼 클릭 처리
     * @param {number} id - 태그 ID
     * @param {string} name - 태그명
     * @private
     */
    _handleDeleteClick(id, name) {
        this.deleteTag(id, name);
    }

    /**
     * 태그 목록 로드
     */
    async _loadTags() {
        if (this.isLoading) return;

        this.isLoading = true;
        this.uiRenderer.showLoading();

        try {
            this.tags = await this.apiService.getTags();
            this.uiRenderer.renderTags(this.tags);
        } catch (error) {
            console.error('태그 로드 실패:', error);
            this.uiRenderer.showError(`${MESSAGES.ERROR.LOAD_FAILED}: ${error.message}`);
        } finally {
            this.isLoading = false;
        }
    }

    /**
     * 새 태그 생성 모달 열기
     */
    openCreateModal() {
        this.modalManager.openCreateModal();
    }

    /**
     * 태그 수정 모달 열기
     * @param {Object} tagData - 태그 데이터
     */
    openEditModal(tagData) {
        this.modalManager.openEditModal(tagData);
    }

    /**
     * 태그 저장 (생성 또는 수정)
     * @private
     */
    async _saveTag() {
        const formData = this.modalManager.getFormData();
        const currentTagId = this.modalManager.getCurrentTagId();

        // 클라이언트 측 검증
        const nameValidation = Validator.validateTagName(formData.name);
        if (!nameValidation.isValid) {
            MessageManager.showError(nameValidation.message);
            this._focusNameInput();
            return;
        }

        const colorValidation = Validator.validateColor(formData.color);
        if (!colorValidation.isValid) {
            MessageManager.showError(colorValidation.message);
            return;
        }

        const saveBtn = $('#saveTagBtn');
        if (!saveBtn) return;

        try {
            LoadingManager.setButtonLoading(saveBtn, true, '저장 중...');

            let result;
            if (currentTagId) {
                result = await this.apiService.updateTag(currentTagId, formData);
            } else {
                result = await this.apiService.createTag(formData);
            }

            if (result.success) {
                this.modalManager.close();
                await this._loadTags();
                MessageManager.showSuccess(result.message);
            } else {
                throw new Error(result.message);
            }
        } catch (error) {
            console.error('태그 저장 오류:', error);
            MessageManager.showError(error.message || MESSAGES.ERROR.SAVE_FAILED);
        } finally {
            LoadingManager.setButtonLoading(saveBtn, false);
        }
    }

    /**
     * 태그 삭제
     * @param {number} id - 태그 ID
     * @param {string} name - 태그명
     */
    async deleteTag(id, name) {
        const confirmMessage = MESSAGES.CONFIRM.DELETE_TAG.replace('태그', `"${name}" 태그`);
        
        if (!MessageManager.confirm(confirmMessage)) {
            return;
        }

        try {
            const result = await this.apiService.deleteTag(id);
            
            if (result.success) {
                await this._loadTags();
                MessageManager.showSuccess(result.message);
            } else {
                throw new Error(result.message);
            }
        } catch (error) {
            console.error('태그 삭제 오류:', error);
            MessageManager.showError(error.message || MESSAGES.ERROR.DELETE_FAILED);
        }
    }

    /**
     * 태그명 입력 필드에 포커스
     * @private
     */
    _focusNameInput() {
        const nameInput = $('#tagName');
        if (nameInput) {
            nameInput.focus();
        }
    }

    /**
     * 태그 목록 새로고침
     */
    async refresh() {
        await this._loadTags();
    }

    /**
     * 특정 태그 정보 가져오기
     * @param {number} id - 태그 ID
     * @returns {Object|null} 태그 정보 또는 null
     */
    getTagById(id) {
        return this.tags.find(tag => tag.id === id) || null;
    }

    /**
     * 태그명으로 태그 검색
     * @param {string} name - 태그명
     * @returns {Array} 일치하는 태그들
     */
    searchTagsByName(name) {
        if (!name || !name.trim()) return this.tags;
        
        const searchTerm = name.trim().toLowerCase();
        return this.tags.filter(tag => 
            tag.name.toLowerCase().includes(searchTerm)
        );
    }

    /**
     * 현재 로딩 상태 반환
     * @returns {boolean} 로딩 여부
     */
    get loading() {
        return this.isLoading;
    }

    /**
     * 현재 태그 개수 반환
     * @returns {number} 태그 개수
     */
    get tagCount() {
        return this.tags.length;
    }

    /**
     * 사용자 태그만 반환
     * @returns {Array} 사용자 태그 배열
     */
    get userTags() {
        return this.tags.filter(tag => !tag.is_default);
    }

    /**
     * 기본 태그만 반환
     * @returns {Array} 기본 태그 배열
     */
    get defaultTags() {
        return this.tags.filter(tag => tag.is_default);
    }
}

// 이전 버전 호환성을 위한 전역 함수들 (향후 제거 예정)
let globalTagManager = null;

/**
 * 전역 TagManager 인스턴스 설정
 * @param {TagManager} tagManager - TagManager 인스턴스
 */
export const setGlobalTagManager = (tagManager) => {
    globalTagManager = tagManager;
    
    // 전역 함수들을 window 객체에 추가 (이전 버전 호환성)
    window.editTag = function(id, name, color, isDefault) {
        if (globalTagManager) {
            globalTagManager.openEditModal({ id, name, color, isDefault });
        }
    };

    window.deleteTag = function(id, name) {
        if (globalTagManager) {
            globalTagManager.deleteTag(id, name);
        }
    };
}; 