from datetime import timedelta
from apps.dashboard.models import TimeBlock
from apps.core.utils import (
    serialize_for_js,
    get_week_date_range,
    get_month_date_range,
    UNCLASSIFIED_TAG_NAME,
    UNCLASSIFIED_TAG_COLOR,
    SLEEP_TAG_NAME,
    TOTAL_SLOTS_PER_DAY,
    SLOTS_PER_HOUR,
    MINUTES_PER_SLOT
)
from apps.users.models import UserGoal, UserNote

# --- 통계 계산기 ---
class StatsCalculator:
    def __init__(self, user, selected_date):
        self.user = user
        self.selected_date = selected_date
        self.start_of_month, self.end_of_month = get_month_date_range(selected_date)
        self.start_of_week, self.end_of_week = get_week_date_range(selected_date)
    def get_tag_info(self, block):
        if block.tag and block.tag.name:
            return {'name': block.tag.name, 'color': block.tag.color or '#808080'}
        return None
    def process_blocks_without_tag(self, blocks, process_func):
        for block in blocks:
            tag_info = self.get_tag_info(block)
            if tag_info:
                process_func(block, tag_info)
    def calculate_empty_slots(self, recorded_blocks_count):
        empty_blocks = TOTAL_SLOTS_PER_DAY - recorded_blocks_count
        return empty_blocks * MINUTES_PER_SLOT
    def add_unclassified_data(self, data_container, empty_minutes, day_index=None, data_type='daily'):
        if empty_minutes <= 0:
            return
        if data_type == 'daily':
            if UNCLASSIFIED_TAG_NAME not in data_container:
                data_container[UNCLASSIFIED_TAG_NAME] = {
                    'name': UNCLASSIFIED_TAG_NAME,
                    'color': UNCLASSIFIED_TAG_COLOR,
                    'minutes': 0,
                    'blocks': 0
                }
            data_container[UNCLASSIFIED_TAG_NAME]['minutes'] += empty_minutes
            data_container[UNCLASSIFIED_TAG_NAME]['blocks'] += empty_minutes // MINUTES_PER_SLOT
        elif data_type == 'weekly':
            if UNCLASSIFIED_TAG_NAME not in data_container:
                data_container[UNCLASSIFIED_TAG_NAME] = {
                    'name': UNCLASSIFIED_TAG_NAME,
                    'color': UNCLASSIFIED_TAG_COLOR,
                    'daily_minutes': [0] * 7
                }
            data_container[UNCLASSIFIED_TAG_NAME]['daily_minutes'][day_index] += empty_minutes
        elif data_type == 'monthly':
            pass
        elif data_type == 'analysis':
            if UNCLASSIFIED_TAG_NAME not in data_container:
                data_container[UNCLASSIFIED_TAG_NAME] = {
                    'name': UNCLASSIFIED_TAG_NAME,
                    'color': UNCLASSIFIED_TAG_COLOR,
                    'total_minutes': 0,
                    'total_blocks': 0,
                }
            data_container[UNCLASSIFIED_TAG_NAME]['total_minutes'] += empty_minutes
            data_container[UNCLASSIFIED_TAG_NAME]['total_blocks'] += empty_minutes // MINUTES_PER_SLOT
    def add_unclassified_to_hourly_stats(self, hourly_stats, hour, empty_minutes):
        if empty_minutes > 0:
            hourly_stats[hour][UNCLASSIFIED_TAG_NAME] = hourly_stats[hour].get(UNCLASSIFIED_TAG_NAME, 0) + empty_minutes
    def fill_empty_slots_daily(self, time_blocks, tag_stats, hourly_stats):
        for hour in range(24):
            total_minutes_in_hour = sum(hourly_stats[hour].values())
            empty_minutes = 60 - total_minutes_in_hour
            if empty_minutes > 0:
                self.add_unclassified_data(tag_stats, empty_minutes, data_type='daily')
                self.add_unclassified_to_hourly_stats(hourly_stats, hour, empty_minutes)
    def fill_empty_slots_weekly(self, daily_blocks, daily_tag_stats, tag_weekly_stats, date_item):
        recorded_blocks = len(daily_blocks)
        empty_blocks = TOTAL_SLOTS_PER_DAY - recorded_blocks
        empty_minutes = empty_blocks * MINUTES_PER_SLOT
        if empty_minutes > 0:
            self.add_unclassified_data(daily_tag_stats, empty_minutes, data_type='daily')
            day_index = (date_item - self.start_of_week).days
            self.add_unclassified_data(tag_weekly_stats, empty_minutes, day_index, data_type='weekly')
    def fill_empty_slots_monthly(self, user, daily_tag_stats, daily_totals, total_days):
        for day_index in range(total_days):
            current_date = self.start_of_month + timedelta(days=day_index)
            recorded_blocks = TimeBlock.objects.filter(user=user, date=current_date).count()
            empty_blocks = TOTAL_SLOTS_PER_DAY - recorded_blocks
            if empty_blocks > 0:
                empty_hours = empty_blocks * MINUTES_PER_SLOT / 60
                if UNCLASSIFIED_TAG_NAME not in daily_tag_stats:
                    daily_tag_stats[UNCLASSIFIED_TAG_NAME] = {
                        'name': UNCLASSIFIED_TAG_NAME,
                        'color': UNCLASSIFIED_TAG_COLOR,
                        'daily_hours': [0] * total_days,
                        'total_hours': 0
                    }
                daily_tag_stats[UNCLASSIFIED_TAG_NAME]['daily_hours'][day_index] += empty_hours
                daily_tag_stats[UNCLASSIFIED_TAG_NAME]['total_hours'] += empty_hours
                daily_totals[day_index] += empty_hours
    def fill_empty_slots_analysis(self, user, tag_analysis_data):
        total_days = (self.end_of_month - self.start_of_month).days + 1
        for day_index in range(total_days):
            current_date = self.start_of_month + timedelta(days=day_index)
            recorded_blocks = TimeBlock.objects.filter(user=user, date=current_date).count()
            empty_blocks = TOTAL_SLOTS_PER_DAY - recorded_blocks
            if empty_blocks > 0:
                empty_minutes = empty_blocks * MINUTES_PER_SLOT
                self.add_unclassified_data(tag_analysis_data, empty_minutes, data_type='analysis')

def get_daily_stats_data(user, selected_date, calculator):
    time_blocks = TimeBlock.objects.filter(user=user, date=selected_date).select_related('tag')
    tag_stats = {}
    hourly_stats = [{} for _ in range(24)]
    active_blocks_count = 0
    def process_block(block, tag_info):
        nonlocal active_blocks_count
        tag_name = tag_info['name']
        tag_color = tag_info['color']
        if tag_name not in tag_stats:
            tag_stats[tag_name] = {'name': tag_name, 'color': tag_color, 'minutes': 0, 'blocks': 0}
        tag_stats[tag_name]['minutes'] += MINUTES_PER_SLOT
        tag_stats[tag_name]['blocks'] += 1
        if tag_name != UNCLASSIFIED_TAG_NAME:
            active_blocks_count += 1
        hour = block.slot_index // SLOTS_PER_HOUR
        hourly_stats[hour][tag_name] = hourly_stats[hour].get(tag_name, 0) + MINUTES_PER_SLOT
    calculator.process_blocks_without_tag(time_blocks, process_block)
    calculator.fill_empty_slots_daily(time_blocks, tag_stats, hourly_stats)
    for tag_data in tag_stats.values():
        tag_data['hours'] = round(tag_data['minutes'] / 60, 1)
    peak_hour = -1
    max_minutes = -1
    for hour, hour_data in enumerate(hourly_stats):
        total_minutes = sum(hour_data.values())
        if total_minutes > max_minutes:
            max_minutes = total_minutes
            peak_hour = hour
    return {
        'date': selected_date,
        'tag_stats': sorted(tag_stats.values(), key=lambda x: x['minutes'], reverse=True),
        'hourly_stats': hourly_stats,
        'total_blocks': TOTAL_SLOTS_PER_DAY,
        'total_hours': 24.0,
        'active_hours': round(active_blocks_count * MINUTES_PER_SLOT / 60, 1),
        'fill_percentage': round((len(time_blocks) / TOTAL_SLOTS_PER_DAY) * 100, 1),
        'peak_hour': peak_hour,
        'max_minutes': max_minutes,
        'top_tag': sorted(tag_stats.values(), key=lambda x: x['minutes'], reverse=True)[0] if tag_stats else None
    }

def get_weekly_stats_data(user, selected_date, calculator):
    week_dates = [calculator.start_of_week + timedelta(days=i) for i in range(7)]
    weekly_data = []
    tag_weekly_stats = {}
    excluded_tags = {SLEEP_TAG_NAME, UNCLASSIFIED_TAG_NAME}
    for date_item in week_dates:
        daily_blocks = TimeBlock.objects.filter(user=user, date=date_item).select_related('tag')
        daily_tag_stats = {}
        active_blocks_count = 0
        active_minutes = 0
        def process_block(block, tag_info):
            nonlocal active_blocks_count, active_minutes
            tag_name = tag_info['name']
            tag_color = tag_info['color']
            if tag_name not in daily_tag_stats:
                daily_tag_stats[tag_name] = 0
            daily_tag_stats[tag_name] += MINUTES_PER_SLOT
            if tag_name not in excluded_tags:
                active_blocks_count += 1
                active_minutes += 10
            if tag_name not in tag_weekly_stats:
                tag_weekly_stats[tag_name] = {
                    'name': tag_name,
                    'color': tag_color,
                    'daily_minutes': [0] * 7
                }
            day_index = (date_item - calculator.start_of_week).days
            tag_weekly_stats[tag_name]['daily_minutes'][day_index] += 10
        calculator.process_blocks_without_tag(daily_blocks, process_block)
        calculator.fill_empty_slots_weekly(daily_blocks, daily_tag_stats, tag_weekly_stats, date_item)
        weekly_data.append({
            'date': date_item,
            'day_name': date_item.strftime('%a'),
            'day_korean': ['월', '화', '수', '목', '금', '토', '일'][date_item.weekday()],
            'total_blocks': active_blocks_count,
            'total_minutes': active_minutes,
            'total_hours': round(active_minutes / 60, 1),
            'fill_percentage': round((len(daily_blocks) / 144) * 100, 1),
            'tag_stats': daily_tag_stats
        })
    for tag_data in tag_weekly_stats.values():
        tag_data['total_hours'] = round(sum(tag_data['daily_minutes']) / 60, 1)
        tag_data['daily_hours'] = [round(m / 60, 1) for m in tag_data['daily_minutes']]
        active_days = sum(1 for minutes in tag_data['daily_minutes'] if minutes > 0)
        tag_data['avg_hours'] = round(tag_data['total_hours'] / active_days, 1) if active_days > 0 else 0
    active_days = sum(1 for day in weekly_data if day['total_blocks'] > 0)
    return {
        'start_date': calculator.start_of_week,
        'end_date': week_dates[-1],
        'weekly_data': weekly_data,
        'tag_weekly_stats': list(tag_weekly_stats.values()),
        'week_total_hours': round(sum(day['total_minutes'] for day in weekly_data) / 60, 1),
        'active_days': active_days
    }

def get_monthly_stats_data(user, selected_date, calculator):
    monthly_blocks = TimeBlock.objects.filter(user=user, date__range=[calculator.start_of_month, calculator.end_of_month]).select_related('tag')
    total_days = (calculator.end_of_month - calculator.start_of_month).days + 1
    daily_tag_stats = {}
    daily_totals = [0] * total_days
    def process_block(block, tag_info):
        tag_name = tag_info['name']
        tag_color = tag_info['color']
        day_index = (block.date - calculator.start_of_month).days
        if tag_name not in daily_tag_stats:
            daily_tag_stats[tag_name] = {
                'name': tag_name,
                'color': tag_color,
                'daily_hours': [0] * total_days,
                'total_hours': 0
            }
        hours_increment = MINUTES_PER_SLOT / 60
        daily_tag_stats[tag_name]['daily_hours'][day_index] += hours_increment
        daily_tag_stats[tag_name]['total_hours'] += hours_increment
        daily_totals[day_index] += hours_increment
    calculator.process_blocks_without_tag(monthly_blocks, process_block)
    calculator.fill_empty_slots_monthly(user, daily_tag_stats, daily_totals, total_days)
    for tag_data in daily_tag_stats.values():
        tag_data['daily_hours'] = [round(h, 1) for h in tag_data['daily_hours']]
        tag_data['total_hours'] = round(tag_data['total_hours'], 1)
        active_days = sum(1 for hours in tag_data['daily_hours'] if hours > 0)
        tag_data['avg_hours'] = round(tag_data['total_hours'] / active_days, 1) if active_days > 0 else 0
    daily_totals = [round(h, 1) for h in daily_totals]
    day_labels = [f"{i+1}일" for i in range(total_days)]
    tag_list = sorted(daily_tag_stats.values(), key=lambda x: x['total_hours'], reverse=True)
    tag_list = [tag for tag in tag_list if tag['name'] != UNCLASSIFIED_TAG_NAME]
    # 미분류 태그 제외한 기록 시간/활동일 계산
    total_hours = sum(tag['total_hours'] for tag in tag_list)
    active_days = 0
    for i in range(total_days):
        day_sum = sum(tag['daily_hours'][i] for tag in tag_list)
        if day_sum > 0:
            active_days += 1
    avg_daily_hours = round(total_hours / total_days, 1) if total_days > 0 else 0
    return {
        'month': selected_date.strftime('%Y-%m'),
        'start_date': calculator.start_of_month,
        'end_date': calculator.end_of_month,
        'day_labels': day_labels,
        'tag_stats': tag_list,
        'daily_totals': daily_totals,
        'total_hours': round(total_hours, 1),
        'active_days': active_days,
        'total_days': total_days,
        'avg_daily_hours': avg_daily_hours
    }

def get_tag_analysis_data(user, selected_date, calculator):
    monthly_blocks = TimeBlock.objects.filter(user=user, date__range=[calculator.start_of_month, calculator.end_of_month]).select_related('tag')
    tag_analysis_data = {}
    def process_block(block, tag_info):
        tag_name = tag_info['name']
        tag_color = tag_info['color']
        if tag_name not in tag_analysis_data:
            tag_analysis_data[tag_name] = {
                'name': tag_name,
                'color': tag_color,
                'total_minutes': 0,
                'total_blocks': 0,
            }
        tag_analysis_data[tag_name]['total_minutes'] += MINUTES_PER_SLOT
        tag_analysis_data[tag_name]['total_blocks'] += 1
    calculator.process_blocks_without_tag(monthly_blocks, process_block)
    calculator.fill_empty_slots_analysis(user, tag_analysis_data)
    analysis_list = []
    for tag_name, data in tag_analysis_data.items():
        analysis_list.append({
            'name': data['name'],
            'color': data['color'],
            'total_hours': round(data['total_minutes'] / 60, 1),
            'total_blocks': data['total_blocks'],
        })
    analysis_list = [tag for tag in analysis_list if tag['name'] != UNCLASSIFIED_TAG_NAME]
    return sorted(analysis_list, key=lambda x: x['total_hours'], reverse=True)

def get_stats_context(user, selected_date):
    # --- 통계 계산기 ---
    calculator = StatsCalculator(user, selected_date)
    daily_stats = get_daily_stats_data(user, selected_date, calculator)
    weekly_stats = get_weekly_stats_data(user, selected_date, calculator)
    monthly_stats = get_monthly_stats_data(user, selected_date, calculator)
    tag_analysis = get_tag_analysis_data(user, selected_date, calculator)
    daily_stats_for_js = {
        'tag_stats': daily_stats['tag_stats'],
        'hourly_stats': daily_stats['hourly_stats']
    }
    weekly_stats_for_js = {
        'weekly_data': [{
            'day_korean': day['day_korean'],
            'total_hours': day['total_hours']
        } for day in weekly_stats['weekly_data']],
        'tag_weekly_stats': weekly_stats['tag_weekly_stats']
    }
    context = {
        'page_title': '통계',
        'selected_date': selected_date,
        'total_blocks': len(daily_stats['tag_stats']),
        'total_days': monthly_stats['total_days'],
        'total_hours': monthly_stats['total_hours'],
        'daily_stats': daily_stats,
        'weekly_stats': weekly_stats,
        'monthly_stats': monthly_stats,
        'tag_analysis': tag_analysis,
        'daily_stats_json': serialize_for_js(daily_stats_for_js),
        'weekly_stats_json': serialize_for_js(weekly_stats_for_js),
        'tag_analysis_json': serialize_for_js(tag_analysis),
        'monthly_stats_json': serialize_for_js({
            'day_labels': monthly_stats['day_labels'],
            'tag_stats': monthly_stats['tag_stats'],
            'daily_totals': monthly_stats['daily_totals']
        }),
    }
    user_goals_daily = UserGoal.objects.filter(user=user, period='daily').select_related('tag')
    user_goals_weekly = UserGoal.objects.filter(user=user, period='weekly').select_related('tag')
    user_goals_monthly = UserGoal.objects.filter(user=user, period='monthly').select_related('tag')
    context['user_goals_daily'] = user_goals_daily
    context['user_goals_weekly'] = user_goals_weekly
    context['user_goals_monthly'] = user_goals_monthly
    today = selected_date
    for goal in user_goals_daily:
        actual = 0
        for tag_stat in daily_stats['tag_stats']:
            if tag_stat['name'] == goal.tag.name:
                actual = tag_stat['hours']
        percent = int((actual / goal.target_hours) * 100) if goal.target_hours > 0 else None
        goal.percent = percent
        goal.actual = actual
    for goal in user_goals_weekly:
        actual = 0
        for tag_stat in weekly_stats['tag_weekly_stats']:
            if tag_stat['name'] == goal.tag.name:
                actual = tag_stat['total_hours']
        # 사용자가 입력한 목표 시간을 그대로 사용 (주간 총 시간)
        percent = int((actual / goal.target_hours) * 100) if goal.target_hours > 0 else None
        goal.percent = percent
        goal.actual = actual
    for goal in user_goals_monthly:
        actual = 0
        for tag_stat in monthly_stats['tag_stats']:
            if tag_stat['name'] == goal.tag.name:
                actual = tag_stat['total_hours']
        # 사용자가 입력한 목표 시간을 그대로 사용 (월간 총 시간)
        percent = int((actual / goal.target_hours) * 100) if goal.target_hours > 0 else None
        goal.percent = percent
        goal.actual = actual
    user_note = UserNote.objects.filter(user=user).order_by('-created_at').first()
    context['user_note'] = user_note
    return context 