/**
 * 태그 관리 애플리케이션 설정
 * @fileoverview 애플리케이션 전역 설정과 상수들을 관리합니다
 */

/**
 * API 설정
 * @readonly
 */
export const API_CONFIG = {
    BASE_URL: '/tags/api/tags/',
    TIMEOUT: 10000,
    RETRY_COUNT: 3
};

/**
 * UI 설정
 * @readonly
 */
export const UI_CONFIG = {
    DEFAULT_TAG_COLOR: '#007bff',
    MAX_TAG_NAME_LENGTH: 50,
    LOADING_DELAY: 200,
    ANIMATION_DURATION: 300
};

/**
 * 메시지 설정
 * @readonly
 */
export const MESSAGES = {
    SUCCESS: {
        TAG_CREATED: '태그가 성공적으로 생성되었습니다.',
        TAG_UPDATED: '태그가 성공적으로 수정되었습니다.',
        TAG_DELETED: '태그가 성공적으로 삭제되었습니다.'
    },
    ERROR: {
        LOAD_FAILED: '태그를 불러오는 중 오류가 발생했습니다',
        SAVE_FAILED: '태그 저장 중 오류가 발생했습니다',
        DELETE_FAILED: '태그 삭제 중 오류가 발생했습니다',
        VALIDATION_FAILED: '입력값을 확인해주세요',
        NETWORK_ERROR: '네트워크 연결을 확인해주세요',
        PERMISSION_DENIED: '접근 권한이 없습니다',
        NOT_FOUND: '요청한 태그를 찾을 수 없습니다',
        SERVER_ERROR: '서버 내부 오류가 발생했습니다'
    },
    CONFIRM: {
        DELETE_TAG: '태그를 삭제하시겠습니까?\n\n※ 사용 중인 태그는 삭제할 수 없습니다.'
    }
};

/**
 * CSS 클래스 설정
 * @readonly
 */
export const CSS_CLASSES = {
    TAG_CARD: 'tag-card',
    DEFAULT_TAG: 'default-tag',
    LOADING_SPINNER: 'loading-spinner',
    BADGE_DEFAULT: 'badge bg-warning text-dark',
    ALERT_DANGER: 'alert alert-danger',
    ALERT_SUCCESS: 'alert alert-success'
};

/**
 * 사용자 권한 정보
 * @readonly
 */
export const USER_PERMISSIONS = {
    isSuperuser: window.userPermissions?.isSuperuser || false
}; 