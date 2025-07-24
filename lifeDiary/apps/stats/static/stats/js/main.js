/**
 * 통계 앱 메인 로직
 */

class StatsMain {
    constructor() {
        this.currentDate = null;
        this.config = window.StatsConfig || {};
        this.api = window.statsAPI;
        this.charts = window.statsCharts;
        this.ui = window.statsUI;
        this.utils = window.statsUtils;
        
        this.init();
    }
    
    /**
     * 초기화
     */
    init() {
        // DOM이 로드된 후 실행
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => this.initializeApp());
        } else {
            this.initializeApp();
        }
    }
    
    /**
     * 앱 초기화
     */
    initializeApp() {
        this.setupInitialDate();
        this.bindEvents();
        this.loadInitialData();
    }
    
    /**
     * 초기 날짜 설정
     */
    setupInitialDate() {
        const dateSelector = document.getElementById('dateSelector');
        if (dateSelector) {
            // URL 파라미터나 기본값에서 날짜 가져오기
            this.currentDate = this.utils.getUrlParameter('date') || 
                             dateSelector.value || 
                             this.utils.getTodayString();
            
            dateSelector.value = this.currentDate;
            this.utils.setUrlParameter('date', this.currentDate);
        } else {
            this.currentDate = this.utils.getTodayString();
        }
    }
    
    /**
     * 이벤트 바인딩
     */
    bindEvents() {
        this.bindDateSelectorEvents();
        this.bindTabEvents();
        this.bindButtonEvents();
        this.bindKeyboardEvents();
    }
    
    /**
     * 날짜 선택기 이벤트 바인딩
     */
    bindDateSelectorEvents() {
        const dateSelector = document.getElementById('dateSelector');
        if (dateSelector) {
            // 디바운스를 적용하여 너무 빈번한 API 호출 방지
            const debouncedDateChange = this.utils.debounce((date) => {
                this.onDateChange(date);
            }, 300);
            
            dateSelector.addEventListener('change', (e) => {
                debouncedDateChange(e.target.value);
            });
        }
    }
    
    /**
     * 탭 이벤트 바인딩
     */
    bindTabEvents() {
        const tabLinks = document.querySelectorAll('#statsTabs .nav-link');
        tabLinks.forEach(tab => {
            tab.addEventListener('shown.bs.tab', (e) => {
                const tabId = e.target.id;
                this.onTabChange(tabId);
            });
        });
    }
    
    /**
     * 버튼 이벤트 바인딩
     */
    bindButtonEvents() {
        // 오늘 버튼
        const todayButton = document.querySelector('[onclick="goToToday()"]');
        if (todayButton) {
            todayButton.removeAttribute('onclick');
            todayButton.addEventListener('click', () => this.goToToday());
        }
        
        // 새로고침 버튼 (있다면)
        const refreshButton = document.getElementById('refreshButton');
        if (refreshButton) {
            refreshButton.addEventListener('click', () => this.refreshCurrentTab());
        }
    }
    
    /**
     * 키보드 이벤트 바인딩
     */
    bindKeyboardEvents() {
        document.addEventListener('keydown', (e) => {
            // Ctrl + R 또는 F5: 새로고침
            if ((e.ctrlKey && e.key === 'r') || e.key === 'F5') {
                e.preventDefault();
                this.refreshCurrentTab();
            }
            
            // 좌우 화살표: 날짜 이동
            if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
                this.navigateDate(e.key === 'ArrowLeft' ? -1 : 1);
            }
        });
    }
    
    /**
     * 초기 데이터 로드
     */
    loadInitialData() {
        // 일별 통계를 기본으로 로드
        this.loadDailyStats();
    }
    
    /**
     * 날짜 변경 처리
     * @param {string} date - 새로운 날짜
     */
    onDateChange(date) {
        if (!date || date === this.currentDate) return;
        
        this.currentDate = date;
        this.utils.setUrlParameter('date', date);
        
        // 현재 활성 탭에 따라 데이터 로드
        const currentTab = this.getCurrentActiveTab();
        this.loadStatsForTab(currentTab);
    }
    
    /**
     * 탭 변경 처리
     * @param {string} tabId - 탭 ID
     */
    onTabChange(tabId) {
        this.loadStatsForTab(tabId);
    }
    
    /**
     * 현재 활성 탭 가져오기
     * @returns {string} 활성 탭 ID
     */
    getCurrentActiveTab() {
        const activeTab = document.querySelector('#statsTabs .nav-link.active');
        return activeTab ? activeTab.id : 'daily-tab';
    }
    
    /**
     * 탭에 따른 통계 로드
     * @param {string} tabId - 탭 ID
     */
    loadStatsForTab(tabId) {
        switch(tabId) {
            case 'daily-tab':
                this.loadDailyStats();
                break;
            case 'weekly-tab':
                this.loadWeeklyStats();
                break;
            case 'monthly-tab':
                this.loadMonthlyStats();
                break;
            case 'tags-tab':
                this.loadTagAnalysis();
                break;
            default:
                this.loadDailyStats();
        }
    }
    
    /**
     * 일별 통계 로드
     */
    async loadDailyStats() {
        try {
            // 로딩 상태 표시
            this.showLoadingStates(['dailySummary']);
            
            const data = await this.api.getDailyStats(this.currentDate);
            
            // 차트 렌더링
            this.charts.renderDailyPieChart(data.tag_stats);
            this.charts.renderHourlyBarChart(data.hourly_stats);
            
            // UI 업데이트
            this.ui.renderDailySummary(data);
            
        } catch (error) {
            console.error('일별 통계 로드 오류:', error);
            this.ui.showError('일별 통계를 불러오는 중 오류가 발생했습니다.');
        }
    }
    
    /**
     * 주간 통계 로드
     */
    async loadWeeklyStats() {
        try {
            this.showLoadingStates(['weeklySummary']);
            
            const data = await this.api.getWeeklyStats(this.currentDate);
            
            this.charts.renderWeeklyLineChart(data.tag_weekly_stats, data.weekly_data);
            this.charts.renderWeeklyBarChart(data.weekly_data);
            this.ui.renderWeeklySummary(data);
            
        } catch (error) {
            console.error('주간 통계 로드 오류:', error);
            this.ui.showError('주간 통계를 불러오는 중 오류가 발생했습니다.');
        }
    }
    
    /**
     * 월간 통계 로드
     */
    async loadMonthlyStats() {
        try {
            this.showLoadingStates(['monthlySummary']);
            
            const data = await this.api.getMonthlyStats(this.currentDate);
            
            this.charts.renderMonthlyBarChart(data.tag_stats);
            this.ui.renderMonthlyCalendar(data.daily_stats);
            this.ui.renderMonthlySummary(data);
            
        } catch (error) {
            console.error('월간 통계 로드 오류:', error);
            this.ui.showError('월간 통계를 불러오는 중 오류가 발생했습니다.');
        }
    }
    
    /**
     * 태그 분석 로드
     */
    async loadTagAnalysis() {
        try {
            this.showLoadingStates(['tagAnalysisTable']);
            
            const data = await this.api.getTagAnalysis();
            
            this.charts.renderTagTotalChart(data.tag_analysis);
            this.charts.renderTagFrequencyChart(data.tag_analysis);
            this.ui.renderTagAnalysisTable(data.tag_analysis);
            
        } catch (error) {
            console.error('태그 분석 로드 오류:', error);
            this.ui.showError('태그 분석을 불러오는 중 오류가 발생했습니다.');
        }
    }
    
    /**
     * 로딩 상태 표시
     * @param {Array} elementIds - 로딩을 표시할 요소 ID 배열
     */
    showLoadingStates(elementIds) {
        elementIds.forEach(id => {
            const element = document.getElementById(id);
            if (element) {
                this.ui.showLoading(element);
            }
        });
    }
    
    /**
     * 오늘로 이동
     */
    goToToday() {
        const today = this.utils.getTodayString();
        const dateSelector = document.getElementById('dateSelector');
        
        if (dateSelector) {
            dateSelector.value = today;
            this.onDateChange(today);
        }
    }
    
    /**
     * 날짜 이동
     * @param {number} days - 이동할 일수 (음수면 이전, 양수면 다음)
     */
    navigateDate(days) {
        const currentDate = new Date(this.currentDate);
        currentDate.setDate(currentDate.getDate() + days);
        
        const newDateString = this.utils.formatDate(currentDate);
        const dateSelector = document.getElementById('dateSelector');
        
        if (dateSelector) {
            dateSelector.value = newDateString;
            this.onDateChange(newDateString);
        }
    }
    
    /**
     * 현재 탭 새로고침
     */
    refreshCurrentTab() {
        const currentTab = this.getCurrentActiveTab();
        this.loadStatsForTab(currentTab);
        this.ui.showSuccess('데이터를 새로고침했습니다.');
    }
    
    /**
     * 앱 정리 (페이지 종료 시)
     */
    cleanup() {
        // 차트 인스턴스 정리
        if (this.charts) {
            this.charts.destroyAllCharts();
        }
        
        // 이벤트 리스너 제거
        document.removeEventListener('keydown', this.bindKeyboardEvents);
    }
}

// 페이지 종료 시 정리 작업
window.addEventListener('beforeunload', () => {
    if (window.statsMain) {
        window.statsMain.cleanup();
    }
});

// 전역 인스턴스 생성 및 시작
if (typeof window !== 'undefined') {
    // 필요한 의존성들이 로드될 때까지 대기
    const initializeWhenReady = () => {
        if (window.StatsConfig && window.statsAPI && window.statsCharts && 
            window.statsUI && window.statsUtils) {
            window.statsMain = new StatsMain();
        } else {
            // 의존성이 아직 로드되지 않았다면 잠시 후 다시 시도
            setTimeout(initializeWhenReady, 100);
        }
    };
    
    initializeWhenReady();
} 