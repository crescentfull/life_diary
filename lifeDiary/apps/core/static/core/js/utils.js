/**
 * =================================================================================
 * 공통 유틸리티 JavaScript
 * - 여러 페이지에서 공통으로 사용되는 헬퍼 함수들을 포함합니다.
 * =================================================================================
 */

/**
 * Django의 CSRF 토큰을 쿠키에서 가져오는 함수.
 * @param {string} name - 가져올 쿠키의 이름 (기본값: 'csrftoken').
 * @returns {string|null} - CSRF 토큰 값 또는 null.
 */
function getCookie(name = 'csrftoken') {
    let cookieValue = null;
    if (document.cookie && document.cookie !== '') {
        const cookies = document.cookie.split(';');
        for (let i = 0; i < cookies.length; i++) {
            const cookie = cookies[i].trim();
            // Does this cookie string begin with the name we want?
            if (cookie.substring(0, name.length + 1) === (name + '=')) {
                cookieValue = decodeURIComponent(cookie.substring(name.length + 1));
                break;
            }
        }
    }
    return cookieValue;
} 