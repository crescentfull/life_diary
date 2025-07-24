/**
 * UI 관련 함수들
 */

class StatsUI {
    constructor() {
        this.config = window.StatsConfig || {};
    }
    
    /**
     * 로딩 스피너 표시
     * @param {Element} element - 로딩을 표시할 요소
     * @param {string} message - 로딩 메시지
     */
    showLoading(element, message = null) {
        if (!element) return;
        
        const loadingMessage = message || this.config.MESSAGES?.LOADING || '로딩 중...';
        element.innerHTML = `
            <div class="d-flex justify-content-center">
                <div class="spinner-border spinner-border-sm me-2" role="status"></div>
                ${loadingMessage}
            </div>
        `;
    }
    
    /**
     * 일별 요약 정보 렌더링
     * @param {Object} data - 일별 통계 데이터
     */
    renderDailySummary(data) {
        const summary = document.getElementById('dailySummary');
        if (!summary) return;
        
        if (!data || data.total_blocks === 0) {
            summary.innerHTML = `<i class="fas fa-info-circle me-2"></i>${this.config.MESSAGES?.NO_RECORD_FOR_DATE || '선택한 날짜에 기록된 데이터가 없습니다.'}`;
            summary.className = 'alert alert-info';
            return;
        }
        
        const topTag = data.tag_stats && data.tag_stats.length > 0 ? data.tag_stats[0] : null;
        const peakHour = data.hourly_stats ? data.hourly_stats.indexOf(Math.max(...data.hourly_stats)) : 0;
        
        summary.innerHTML = `
            <div class="row">
                <div class="col-md-6">
                    <strong>총 기록 시간:</strong> ${data.total_hours || 0}시간<br>
                    <strong>기록률:</strong> ${data.fill_percentage || 0}%<br>
                    <strong>사용된 태그:</strong> ${data.tag_stats ? data.tag_stats.length : 0}개
                </div>
                <div class="col-md-6">
                    ${topTag ? `<strong>최다 사용 태그:</strong> ${topTag.name} (${topTag.hours}시간)<br>` : ''}
                    <strong>가장 활발한 시간:</strong> ${peakHour}시~${peakHour + 1}시<br>
                    <strong>평균 블록당 시간:</strong> 10분
                </div>
            </div>
        `;
        summary.className = 'alert alert-info';
    }
    
    /**
     * 주간 요약 정보 렌더링
     * @param {Object} data - 주간 통계 데이터
     */
    renderWeeklySummary(data) {
        const summary = document.getElementById('weeklySummary');
        if (!summary) return;
        
        if (!data || !data.weekly_data || data.weekly_data.length === 0) {
            summary.innerHTML = `<i class="fas fa-info-circle me-2"></i>주간 데이터가 없습니다.`;
            summary.className = 'alert alert-info';
            return;
        }
        
        const mostActiveDay = data.weekly_data.reduce((max, day) => 
            day.total_minutes > max.total_minutes ? day : max
        );
        
        const avgDaily = data.week_total_hours / 7;
        const activeDays = data.weekly_data.filter(d => d.total_blocks > 0).length;
        
        summary.innerHTML = `
            <div class="row">
                <div class="col-md-6">
                    <strong>주간 총 시간:</strong> ${data.week_total_hours || 0}시간<br>
                    <strong>일평균 시간:</strong> ${avgDaily.toFixed(1)}시간<br>
                    <strong>활동 요일:</strong> ${activeDays}/7일
                </div>
                <div class="col-md-6">
                    <strong>가장 활발한 요일:</strong> ${mostActiveDay.day_korean}요일 (${(mostActiveDay.total_minutes / 60).toFixed(1)}시간)<br>
                    <strong>주간 기간:</strong> ${data.start_date} ~ ${data.end_date}<br>
                    <strong>태그 종류:</strong> ${data.tag_weekly_stats ? data.tag_weekly_stats.length : 0}개
                </div>
            </div>
        `;
        summary.className = 'alert alert-info';
    }
    
    /**
     * 월간 요약 정보 렌더링
     * @param {Object} data - 월간 통계 데이터
     */
    renderMonthlySummary(data) {
        const summary = document.getElementById('monthlySummary');
        if (!summary) return;
        
        if (!data || data.total_hours === 0) {
            summary.innerHTML = `<i class="fas fa-info-circle me-2"></i>월간 데이터가 없습니다.`;
            summary.className = 'alert alert-info';
            return;
        }
        
        const avgDaily = data.total_hours / data.total_days;
        const activityRate = (data.active_days / data.total_days * 100).toFixed(1);
        
        summary.innerHTML = `
            <div class="row">
                <div class="col-md-6">
                    <strong>월간 총 시간:</strong> ${data.total_hours || 0}시간<br>
                    <strong>활동 일수:</strong> ${data.active_days || 0}/${data.total_days || 0}일 (${activityRate}%)<br>
                    <strong>일평균 시간:</strong> ${avgDaily.toFixed(1)}시간
                </div>
                <div class="col-md-6">
                    <strong>사용된 태그:</strong> ${data.tag_stats ? data.tag_stats.length : 0}개<br>
                    <strong>월간 기간:</strong> ${data.start_date} ~ ${data.end_date}<br>
                    <strong>총 블록 수:</strong> ${data.total_blocks || 0}개
                </div>
            </div>
        `;
        summary.className = 'alert alert-info';
    }
    
    /**
     * 월간 달력 히트맵 렌더링
     * @param {Array} dailyStats - 일별 통계 데이터
     */
    renderMonthlyCalendar(dailyStats) {
        const calendar = document.getElementById('monthlyCalendar');
        if (!calendar) return;
        
        if (!dailyStats || dailyStats.length === 0) {
            calendar.innerHTML = `<div class="text-center text-muted">${this.config.MESSAGES?.NO_DATA || '데이터가 없습니다'}</div>`;
            return;
        }
        
        let html = '<div class="row g-1">';
        
        dailyStats.forEach(day => {
            const intensity = Math.min(day.fill_percentage / 20, 5); // 0-5 단계
            const bgClass = intensity === 0 ? 'bg-light' : `bg-primary bg-opacity-${Math.ceil(intensity * 20)}`;
            
            html += `
                <div class="col-sm-4 col-md-3 mb-1">
                    <div class="p-2 border rounded ${bgClass}" title="${day.date}: ${day.hours}시간">
                        <small class="d-block">${new Date(day.date).getDate()}일</small>
                        <small class="text-muted">${day.hours}h</small>
                    </div>
                </div>
            `;
        });
        
        html += '</div>';
        calendar.innerHTML = html;
    }
    
    /**
     * 태그 분석 테이블 렌더링
     * @param {Array} tagAnalysis - 태그 분석 데이터
     */
    renderTagAnalysisTable(tagAnalysis) {
        const table = document.getElementById('tagAnalysisTable');
        if (!table) return;
        
        if (!tagAnalysis || tagAnalysis.length === 0) {
            table.innerHTML = `<div class="text-center text-muted">${this.config.MESSAGES?.NO_ANALYSIS_DATA || '분석할 데이터가 없습니다'}</div>`;
            return;
        }
        
        let html = `
            <div class="table-responsive">
                <table class="table table-hover">
                    <thead>
                        <tr>
                            <th>태그</th>
                            <th>총 시간</th>
                            <th>사용 일수</th>
                            <th>사용 빈도</th>
                            <th>일평균</th>
                            <th>최초/최근 사용</th>
                        </tr>
                    </thead>
                    <tbody>
        `;
        
        tagAnalysis.forEach(tag => {
            html += `
                <tr>
                    <td>
                        <span class="badge me-2" style="background-color: ${tag.color};">&nbsp;</span>
                        ${tag.name}
                    </td>
                    <td><strong>${tag.total_hours}시간</strong></td>
                    <td>${tag.days_used}일</td>
                    <td>${tag.usage_frequency}%</td>
                    <td>${(tag.avg_daily_minutes / 60).toFixed(1)}시간</td>
                    <td>
                        <small>${tag.first_used}<br>~ ${tag.last_used}</small>
                    </td>
                </tr>
            `;
        });
        
        html += '</tbody></table></div>';
        table.innerHTML = html;
    }
    
    /**
     * 전체 통계 정보 업데이트
     * @param {Object} data - 통계 데이터
     */
    updateGlobalStats(data) {
        const elements = {
            totalHours: document.getElementById('totalHours'),
            totalDays: document.getElementById('totalDays'),
            totalBlocks: document.getElementById('totalBlocks'),
            avgDaily: document.getElementById('avgDaily')
        };
        
        if (elements.totalHours && data.total_hours !== undefined) {
            elements.totalHours.textContent = `${data.total_hours}시간`;
        }
        
        if (elements.totalDays && data.total_days !== undefined) {
            elements.totalDays.textContent = `${data.total_days}일`;
        }
        
        if (elements.totalBlocks && data.total_blocks !== undefined) {
            elements.totalBlocks.textContent = `${data.total_blocks}개`;
        }
        
        if (elements.avgDaily && data.total_hours !== undefined && data.total_days !== undefined) {
            const avgDaily = data.total_days > 0 ? (data.total_hours / data.total_days).toFixed(1) : 0;
            elements.avgDaily.textContent = `${avgDaily}시간`;
        }
    }
    
    /**
     * 성공 메시지 표시
     * @param {string} message - 성공 메시지
     */
    showSuccess(message) {
        this.showAlert(message, 'success');
    }
    
    /**
     * 에러 메시지 표시
     * @param {string} message - 에러 메시지
     */
    showError(message) {
        this.showAlert(message, 'danger');
    }
    
    /**
     * 알림 메시지 표시
     * @param {string} message - 메시지
     * @param {string} type - 알림 타입 (success, danger, warning, info)
     */
    showAlert(message, type = 'info') {
        const alertDiv = document.createElement('div');
        alertDiv.className = `alert alert-${type} alert-dismissible fade show`;
        alertDiv.innerHTML = `
            ${message}
            <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
        `;
        
        const container = document.querySelector('.container-fluid') || document.body;
        container.insertBefore(alertDiv, container.firstChild);
        
        // 5초 후 자동 제거
        setTimeout(() => {
            if (alertDiv.parentNode) {
                alertDiv.remove();
            }
        }, 5000);
    }
}

// 전역 인스턴스 생성
if (typeof window !== 'undefined') {
    window.statsUI = new StatsUI();
} 