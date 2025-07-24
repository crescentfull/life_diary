/**
 * 태그 관리 애플리케이션 메인 파일
 * @fileoverview 애플리케이션 초기화 및 의존성 주입을 담당합니다
 */

import { TagManager, setGlobalTagManager } from './tag-manager.js';

/**
 * 애플리케이션 상태
 */
class AppState {
    constructor() {
        this.isInitialized = false;
        this.tagManager = null;
        this.initPromise = null;
    }

    /**
     * 초기화 여부 확인
     * @returns {boolean} 초기화 여부
     */
    get initialized() {
        return this.isInitialized;
    }
}

// 전역 앱 상태
const appState = new AppState();

/**
 * Bootstrap 로드 확인
 * @returns {boolean} Bootstrap 로드 여부
 * @private
 */
function _checkBootstrap() {
    if (typeof bootstrap === 'undefined') {
        console.error('❌ Bootstrap이 로드되지 않았습니다.');
        console.warn('💡 Bootstrap JS 파일이 올바르게 로드되었는지 확인하세요.');
        return false;
    }
    return true;
}

/**
 * 필수 DOM 요소 확인
 * @returns {boolean} DOM 요소 존재 여부
 * @private
 */
function _checkRequiredElements() {
    const requiredElements = [
        'tagList',
        'emptyState',
        'createTagBtn',
        'tagModal',
        'tagForm',
        'saveTagBtn'
    ];

    const missingElements = requiredElements.filter(id => !document.getElementById(id));
    
    if (missingElements.length > 0) {
        console.error('❌ 필수 DOM 요소가 누락되었습니다:', missingElements);
        console.warn('💡 HTML 템플릿에 필수 요소들이 있는지 확인하세요.');
        return false;
    }
    
    return true;
}

/**
 * 애플리케이션 초기화
 * @returns {Promise<TagManager>} 초기화된 TagManager 인스턴스
 * @private
 */
async function _initializeApp() {
    console.log('🚀 Tags 애플리케이션 초기화 시작');

    // 1. Bootstrap 확인
    if (!_checkBootstrap()) {
        throw new Error('Bootstrap 로드 실패');
    }

    // 2. 필수 DOM 요소 확인
    if (!_checkRequiredElements()) {
        throw new Error('필수 DOM 요소 누락');
    }

    // 3. TagManager 생성
    console.log('📦 TagManager 인스턴스 생성 중...');
    const tagManager = new TagManager();

    // 4. 전역 참조 설정 (이전 버전 호환성)
    setGlobalTagManager(tagManager);

    // 5. 상태 업데이트
    appState.tagManager = tagManager;
    appState.isInitialized = true;

    console.log('✅ Tags 애플리케이션 초기화 완료');
    
    return tagManager;
}

/**
 * 초기화 에러 처리
 * @param {Error} error - 발생한 에러
 * @private
 */
function _handleInitError(error) {
    console.error('💥 애플리케이션 초기화 실패:', error);
    
    // 사용자에게 에러 알림
    const errorMessage = `
        애플리케이션 초기화에 실패했습니다.
        
        오류: ${error.message}
        
        페이지를 새로고침하거나 관리자에게 문의하세요.
    `;
    
    alert(errorMessage);
    
    // 에러 리포팅 (향후 확장 가능)
    if (window.errorReporter) {
        window.errorReporter.report(error, {
            context: 'tags_app_initialization',
            url: window.location.href,
            userAgent: navigator.userAgent
        });
    }
}

/**
 * DOM 로드 완료 후 초기화
 */
function initializeOnDOMReady() {
    // 이미 초기화 중이면 기존 Promise 반환
    if (appState.initPromise) {
        return appState.initPromise;
    }

    // 이미 초기화 완료된 경우
    if (appState.isInitialized) {
        return Promise.resolve(appState.tagManager);
    }

    // 초기화 시작
    appState.initPromise = _initializeApp().catch(error => {
        _handleInitError(error);
        appState.initPromise = null; // 재시도 가능하도록 리셋
        throw error;
    });

    return appState.initPromise;
}

/**
 * 애플리케이션 재시작
 * @returns {Promise<TagManager>} 새로운 TagManager 인스턴스
 */
export async function restartApp() {
    console.log('🔄 애플리케이션 재시작 중...');
    
    // 상태 리셋
    appState.isInitialized = false;
    appState.tagManager = null;
    appState.initPromise = null;
    
    // 전역 함수 정리
    delete window.editTag;
    delete window.deleteTag;
    
    // 재초기화
    return initializeOnDOMReady();
}

/**
 * 현재 TagManager 인스턴스 반환
 * @returns {TagManager|null} TagManager 인스턴스 또는 null
 */
export function getTagManager() {
    return appState.tagManager;
}

/**
 * 애플리케이션 상태 정보 반환
 * @returns {Object} 상태 정보
 */
export function getAppState() {
    return {
        initialized: appState.isInitialized,
        hasTagManager: !!appState.tagManager,
        tagCount: appState.tagManager?.tagCount || 0,
        loading: appState.tagManager?.loading || false
    };
}

// DOM 로드 완료 시 자동 초기화
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializeOnDOMReady);
} else {
    // DOM이 이미 로드된 경우 즉시 초기화
    setTimeout(initializeOnDOMReady, 0);
}

// 모듈 내보내기 (다른 스크립트에서 사용 가능)
export { initializeOnDOMReady as init };

// 개발자 도구용 전역 참조 (프로덕션에서는 제거 고려)
if (!window.location.hostname.includes('production')) {
    window.__tagsApp = {
        getTagManager,
        getAppState,
        restartApp,
        version: '2.0.0'
    };
} 