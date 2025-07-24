/**
 * 대시보드 메인 애플리케이션
 * @fileoverview 대시보드 모듈들을 통합하고 초기화하는 진입점입니다
 */

import { ELEMENT_IDS, CSS_CLASSES, KEYBOARD, UI_CONFIG } from './config.js';
import { FormUtils, DateUtils, NotificationManager, $, $$ } from './utils.js';
import { dashboardApi } from './api.js';
import { statisticsManager, createDebouncedStatsUpdater } from './statistics.js';
import { SlotManager } from './slot-manager.js';
import { tagManager } from './tag-manager.js';

/**
 * 애플리케이션 상태 관리 클래스
 */
class DashboardAppState {
    constructor() {
        this.isInitialized = false;
        this.currentDate = DateUtils.today();
        this.slotManager = null;
        this.debouncedStatsUpdater = null;
    }

    /**
     * 초기화 완료 설정
     */
    setInitialized() {
        this.isInitialized = true;
    }

    /**
     * 현재 날짜 설정
     * @param {string} date - 날짜 (YYYY-MM-DD)
     */
    setCurrentDate(date) {
        this.currentDate = date;
    }

    /**
     * 슬롯 매니저 설정
     * @param {SlotManager} manager - 슬롯 매니저 인스턴스
     */
    setSlotManager(manager) {
        this.slotManager = manager;
    }

    /**
     * 디바운스된 통계 업데이터 설정
     * @param {Function} updater - 디바운스된 업데이터 함수
     */
    setStatsUpdater(updater) {
        this.debouncedStatsUpdater = updater;
    }
}

/**
 * 글로벌 애플리케이션 상태
 */
const appState = new DashboardAppState();

/**
 * 필수 라이브러리 확인
 * @returns {boolean} 확인 결과
 */
function _checkDependencies() {
    if (typeof bootstrap === 'undefined') {
        console.error('Bootstrap이 로드되지 않았습니다.');
        return false;
    }
    
    return true;
}

/**
 * 필수 DOM 요소 확인
 * @returns {boolean} 확인 결과
 */
function _checkRequiredElements() {
    const requiredElements = [
        ELEMENT_IDS.TAG_CONTAINER,
        ELEMENT_IDS.FILLED_SLOTS,
        ELEMENT_IDS.FILL_PERCENTAGE,
        ELEMENT_IDS.TOTAL_TIME
    ];
    
    const missingElements = requiredElements.filter(id => !$(id));
    
    if (missingElements.length > 0) {
        console.error('필수 DOM 요소를 찾을 수 없습니다:', missingElements);
        return false;
    }
    
    return true;
}

/**
 * 이벤트 리스너 초기화
 */
function _initializeEventListeners() {
    // 날짜 선택기 이벤트
    const dateSelector = $(ELEMENT_IDS.DATE_SELECTOR);
    if (dateSelector) {
        dateSelector.addEventListener('change', (event) => {
            const selectedDate = event.target.value;
            appState.setCurrentDate(selectedDate);
            console.log('날짜 변경:', selectedDate);
            
            // 페이지 리로드 (기존 동작 유지)
            const url = new URL(window.location);
            url.searchParams.set('date', selectedDate);
            window.location.href = url.toString();
        });
    }

    // 저장 버튼 이벤트
    const saveBtn = $(ELEMENT_IDS.SAVE_BTN);
    if (saveBtn && appState.slotManager) {
        saveBtn.addEventListener('click', () => {
            appState.slotManager.saveSlots();
        });
    }

    // 삭제 버튼 이벤트
    const deleteBtn = $(ELEMENT_IDS.DELETE_BTN);
    if (deleteBtn && appState.slotManager) {
        deleteBtn.addEventListener('click', () => {
            appState.slotManager.deleteSlots();
        });
    }

    // 태그 컨테이너 이벤트 (이벤트 위임)
    const tagContainer = $(ELEMENT_IDS.TAG_CONTAINER);
    if (tagContainer && appState.slotManager) {
        tagContainer.addEventListener('click', (event) => {
            const tagButton = event.target.closest(`.${CSS_CLASSES.TAG_BUTTON}`);
            if (!tagButton) return;

            const tagId = parseInt(tagButton.dataset.tagId, 10);
            const tagColor = tagButton.dataset.tagColor;
            const tagName = tagButton.dataset.tagName;

            if (tagId && tagColor && tagName) {
                appState.slotManager.selectTag(
                    { id: tagId, color: tagColor, name: tagName },
                    tagButton
                );
            }
        });
    }

    // 슬롯 그리드 이벤트 (이벤트 위임)
    const timeGrid = $(ELEMENT_IDS.TIME_GRID);
    if (timeGrid && appState.slotManager) {
        timeGrid.addEventListener('click', (event) => {
            const slotElement = event.target.closest(`.${CSS_CLASSES.TIME_SLOT}`);
            if (!slotElement) return;

            const slotIndex = parseInt(slotElement.dataset.slotIndex, 10);
            if (!isNaN(slotIndex)) {
                appState.slotManager.selectSlot(slotIndex, event);
            }
        });

        // 드래그 이벤트
        timeGrid.addEventListener('mousedown', (event) => {
            const slotElement = event.target.closest(`.${CSS_CLASSES.TIME_SLOT}`);
            if (!slotElement) return;

            const slotIndex = parseInt(slotElement.dataset.slotIndex, 10);
            if (!isNaN(slotIndex)) {
                appState.slotManager.startDrag(slotIndex);
            }
        });

        timeGrid.addEventListener('mouseover', (event) => {
            const slotElement = event.target.closest(`.${CSS_CLASSES.TIME_SLOT}`);
            if (!slotElement) return;

            const slotIndex = parseInt(slotElement.dataset.slotIndex, 10);
            if (!isNaN(slotIndex)) {
                appState.slotManager.dragOver(slotIndex);
            }
        });
    }

    // 전역 키보드 이벤트
    document.addEventListener('keydown', (event) => {
        if (event.key === KEYBOARD.ESCAPE) {
            if (appState.slotManager) {
                appState.slotManager.clearSelection();
            }
        }
    });

    console.log('이벤트 리스너 초기화 완료');
}

/**
 * 색상 동기화 설정
 */
function _setupColorSynchronization() {
    // 새 태그 모달
    FormUtils.setupColorSync('#newTagColor', '#newTagColorText');
    
    // 태그 편집 모달
    FormUtils.setupColorSync('#editTagColor', '#editTagColorText');
    
    console.log('색상 동기화 설정 완료');
}

/**
 * 애플리케이션 초기화
 */
async function _initializeApp() {
    try {
        console.log('🚀 대시보드 애플리케이션 초기화 시작');

        // 1. 의존성 및 DOM 요소 확인
        if (!_checkDependencies() || !_checkRequiredElements()) {
            throw new Error('필수 의존성 또는 DOM 요소가 누락되었습니다.');
        }

        // 2. 통계 관리자 초기화
        const debouncedStatsUpdater = createDebouncedStatsUpdater(statisticsManager);
        appState.setStatsUpdater(debouncedStatsUpdater);

        // 3. 슬롯 관리자 초기화
        const slotManager = new SlotManager(debouncedStatsUpdater);
        appState.setSlotManager(slotManager);

        // 4. 이벤트 리스너 설정
        _initializeEventListeners();

        // 5. 태그 관리자 로드
        await tagManager.loadAvailableTags();

        // 6. 색상 동기화 설정
        _setupColorSynchronization();

        // 7. 통계 시스템 초기화 (약간 지연 후)
        setTimeout(() => {
            statisticsManager.initialize();
        }, UI_CONFIG.STATS_UPDATE_DELAY);

        // 8. 글로벌 접근을 위한 참조 설정
        _setupGlobalReferences();

        // 9. API 상태 확인
        const apiHealthy = await dashboardApi.checkHealth();
        if (!apiHealthy) {
            console.warn('⚠️ API 상태가 불안정합니다. 일부 기능이 제한될 수 있습니다.');
        }

        appState.setInitialized();
        console.log('✅ 대시보드 애플리케이션 초기화 완료');

    } catch (error) {
        console.error('❌ 대시보드 초기화 실패:', error);
        _handleInitError(error);
    }
}

/**
 * 글로벌 참조 설정 (하위 호환성)
 */
function _setupGlobalReferences() {
    // 태그 관리 전역 함수
    window.dashboardTagManager = tagManager;
    window.openCreateTagModal = () => tagManager.openCreateModal();
    window.openManageTagModal = () => tagManager.openManageModal();
    
    // 슬롯 관리 전역 함수
    window.dashboardSlotManager = appState.slotManager;
    window.goToToday = () => {
        const url = new URL(window.location);
        url.searchParams.delete('date');
        window.location.href = url.toString();
    };
    
    // 통계 관리 전역 함수
    window.dashboardStatistics = statisticsManager;
    
    // 개발 도구 (프로덕션이 아닌 경우에만)
    if (!window.location.hostname.includes('production')) {
        window.__dashboardDebug = {
            appState,
            tagManager,
            slotManager: appState.slotManager,
            statisticsManager,
            api: dashboardApi,
            restart: restartApp,
            version: '2.0.0'
        };
    }
}

/**
 * 초기화 에러 처리
 * @param {Error} error - 발생한 에러
 */
function _handleInitError(error) {
    const errorMessage = `
        <div class="alert alert-danger m-4">
            <h5><i class="fas fa-exclamation-triangle me-2"></i>초기화 오류</h5>
            <p class="mb-2">대시보드를 초기화하는 중 오류가 발생했습니다:</p>
            <code>${error.message}</code>
            <hr>
            <button class="btn btn-outline-danger btn-sm mt-2" onclick="window.location.reload()">
                <i class="fas fa-redo me-1"></i>페이지 새로고침
            </button>
        </div>
    `;
    
    document.body.insertAdjacentHTML('afterbegin', errorMessage);
    NotificationManager.showError('애플리케이션 초기화에 실패했습니다. 페이지를 새로고침해주세요.');
}

/**
 * DOM 준비 완료 시 초기화
 */
function initializeOnDOMReady() {
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', _initializeApp);
    } else {
        _initializeApp();
    }
}

/**
 * 애플리케이션 재시작
 */
export async function restartApp() {
    console.log('🔄 대시보드 애플리케이션 재시작');
    
    // 기존 인스턴스 정리
    if (appState.slotManager) {
        appState.slotManager.destroy();
    }
    
    tagManager.destroy();
    
    // 글로벌 참조 정리
    delete window.dashboardTagManager;
    delete window.openCreateTagModal;
    delete window.openManageTagModal;
    delete window.dashboardSlotManager;
    delete window.dashboardStatistics;
    delete window.__dashboardDebug;
    
    // 상태 초기화
    appState.isInitialized = false;
    appState.slotManager = null;
    appState.debouncedStatsUpdater = null;
    
    // 재초기화
    await _initializeApp();
}

/**
 * 현재 애플리케이션 상태 반환
 * @returns {DashboardAppState} 애플리케이션 상태
 */
export function getAppState() {
    return appState;
}

/**
 * 슬롯 매니저 반환
 * @returns {SlotManager|null} 슬롯 매니저 인스턴스
 */
export function getSlotManager() {
    return appState.slotManager;
}

/**
 * 태그 매니저 반환
 * @returns {TagManager} 태그 매니저 인스턴스
 */
export function getTagManager() {
    return tagManager;
}

/**
 * 통계 매니저 반환
 * @returns {StatisticsManager} 통계 매니저 인스턴스
 */
export function getStatisticsManager() {
    return statisticsManager;
}

/**
 * 현재 날짜 반환
 * @returns {string} 현재 날짜 (YYYY-MM-DD)
 */
export function getCurrentDate() {
    return appState.currentDate;
}

/**
 * 애플리케이션 상태 정보 반환
 * @returns {Object} 상태 정보
 */
export function getStatus() {
    return {
        initialized: appState.isInitialized,
        currentDate: appState.currentDate,
        hasSlotManager: !!appState.slotManager,
        tagCount: tagManager.getAvailableTags().length,
        statistics: statisticsManager.getStatisticsData()
    };
}

// 메인 초기화 함수 내보내기
export { initializeOnDOMReady as init };

// 자동 초기화 (모듈 로드 시)
initializeOnDOMReady(); 