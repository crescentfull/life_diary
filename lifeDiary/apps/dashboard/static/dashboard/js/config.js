/**
 * 대시보드 애플리케이션 설정
 * @fileoverview 대시보드 전역 설정과 상수들을 관리합니다
 */

/**
 * API 설정
 * @readonly
 */
export const API_CONFIG = {
    DASHBOARD_BASE_URL: '/dashboard/api/',
    TAGS_BASE_URL: '/tags/api/tags/',
    TIMEOUT: 10000,
    RETRY_COUNT: 3
};

/**
 * 슬롯 설정
 * @readonly
 */
export const SLOT_CONFIG = {
    TOTAL_SLOTS: 144,          // 24시간 * 6슬롯(10분 단위)
    SLOT_DURATION: 10,         // 10분 단위
    HOURS_PER_DAY: 24,
    SLOTS_PER_HOUR: 6
};

/**
 * UI 설정
 * @readonly
 */
export const UI_CONFIG = {
    ANIMATION_DURATION: 300,
    DEBOUNCE_DELAY: 100,
    MODAL_RETRY_ATTEMPTS: 50,
    MODAL_RETRY_DELAY: 100,
    NOTIFICATION_DURATION: 3000,
    STATS_UPDATE_DELAY: 500
};

/**
 * 메시지 설정
 * @readonly
 */
export const MESSAGES = {
    SUCCESS: {
        SLOT_SAVED: '개 슬롯이 저장되었습니다.',
        SLOT_DELETED: '개의 기록된 슬롯이 삭제되었습니다.',
        TAG_CREATED: '태그가 성공적으로 생성되었습니다.',
        TAG_UPDATED: '태그가 성공적으로 수정되었습니다.',
        TAG_DELETED: '태그가 성공적으로 삭제되었습니다.'
    },
    ERROR: {
        NO_SELECTION: '슬롯과 태그를 선택해주세요.',
        NO_SLOTS_TO_DELETE: '삭제할 슬롯을 선택해주세요.',
        NO_FILLED_SLOTS: '삭제할 수 있는 기록된 슬롯이 없습니다.',
        TAG_NAME_REQUIRED: '태그명을 입력해주세요.',
        NETWORK_ERROR: '네트워크 연결을 확인해주세요.',
        PERMISSION_DENIED: '권한이 없습니다. 페이지를 새로고침해주세요.',
        NOT_FOUND: '요청한 리소스를 찾을 수 없습니다.',
        SERVER_ERROR: '서버 오류가 발생했습니다. 잠시 후 다시 시도해주세요.',
        LOAD_FAILED: '데이터를 불러오는 중 오류가 발생했습니다',
        SAVE_FAILED: '저장 중 오류가 발생했습니다',
        DELETE_FAILED: '삭제 중 오류가 발생했습니다',
        MODAL_CREATION_FAILED: '모달을 열 수 없습니다. 페이지를 새로고침해보세요.'
    },
    CONFIRM: {
        DELETE_SLOTS: '개의 기록된 슬롯을 삭제하시겠습니까?',
        DELETE_TAG: '태그를 삭제하시겠습니까?\n\n※ 사용 중인 태그는 삭제할 수 없습니다.'
    }
};

/**
 * CSS 클래스 설정
 * @readonly
 */
export const CSS_CLASSES = {
    // 슬롯 관련
    TIME_SLOT: 'time-slot',
    FILLED_SLOT: 'filled',
    SELECTED_SLOT: 'selected',
    
    // 태그 관련
    TAG_BUTTON: 'tag-btn',
    TAG_ACTIVE: 'active',
    
    // 통계 관련
    STATS_UPDATE: 'stats-update',
    STATS_HIGHLIGHT: 'stats-highlight',
    
    // 알림 관련
    ALERT_SUCCESS: 'alert alert-success',
    ALERT_DANGER: 'alert alert-danger',
    ALERT_WARNING: 'alert alert-warning',
    
    // 로딩 관련
    LOADING_SPINNER: 'loading-spinner',
    
    // 애니메이션
    FADE_IN_OUT: 'fadeInOut'
};

/**
 * DOM 요소 ID 설정
 * @readonly
 */
export const ELEMENT_IDS = {
    // 슬롯 관련
    TIME_GRID: 'timeGrid',
    SLOT_INFO_CARD: 'slotInfoCard',
    SLOT_INFO: 'slotInfo',
    
    // 태그 관련
    TAG_CONTAINER: 'tagContainer',
    TAG_LEGEND: 'tagLegend',
    
    // 통계 관련
    TOTAL_SLOTS: 'totalSlots',
    FILLED_SLOTS: 'filledSlots',
    FILL_PERCENTAGE: 'fillPercentage',
    TOTAL_TIME: 'totalTime',
    
    // 폼 관련
    DATE_SELECTOR: 'dateSelector',
    MEMO_INPUT: 'memoInput',
    SAVE_BTN: 'saveBtn',
    DELETE_BTN: 'deleteBtn',
    
    // 모달 관련
    CREATE_TAG_MODAL: 'createTagModal',
    TAG_MANAGE_MODAL: 'tagManageModal',
    TAG_EDIT_MODAL: 'tagEditModal'
};

/**
 * 키보드 설정
 * @readonly
 */
export const KEYBOARD = {
    CTRL: 'ctrlKey',
    META: 'metaKey',  // Mac의 Cmd 키
    ESCAPE: 'Escape',
    ENTER: 'Enter'
}; 