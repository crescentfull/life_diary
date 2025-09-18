"""
Django settings for lifeDiary project.

프로덕션 환경 설정
- dev.py의 개발 설정을 프로덕션용으로 오버라이드
- 보안 강화 및 프로덕션 최적화

For more information on this file, see
https://docs.djangoproject.com/en/5.2/topics/settings/
"""

from .dev import *

# 프로덕션 환경 오버라이드
DEBUG = False
ALLOWED_HOSTS = ["lifediary.onrender.com"]

# 프로덕션 전용 세션 보안 설정
SESSION_COOKIE_AGE = 3600  # 1시간 (초 단위)
SESSION_EXPIRE_AT_BROWSER_CLOSE = True  # 브라우저 종료 시 세션 만료
SESSION_SAVE_EVERY_REQUEST = True  # 매 요청마다 세션 저장 (활성화 시간 갱신)
